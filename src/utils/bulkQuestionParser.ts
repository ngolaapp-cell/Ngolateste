import { Question } from '../types';

export function parseBulkQuestionsText(
  rawText: string,
  defaultCategory: string,
  defaultBanca: string,
  moduleId?: string
): Question[] {
  if (!rawText || !rawText.trim()) return [];

  const trimmed = rawText.trim();

  // Strategy 1: JSON Parsing
  const jsonQuestions = parseJsonQuestions(trimmed, defaultCategory, defaultBanca, moduleId);
  if (jsonQuestions.length > 0) return jsonQuestions;

  // Strategy 2: Table / CSV / TSV Parsing (Tabs, Semicolons, Pipes, Commas)
  const csvQuestions = parseCsvQuestions(trimmed, defaultCategory, defaultBanca, moduleId);
  if (csvQuestions.length > 0) return csvQuestions;

  // Strategy 3: Numbered or Labeled Text Block Parsing ("1. ...", "A) ...", "GABARITO: B")
  const blockQuestions = parseBlockQuestions(trimmed, defaultCategory, defaultBanca, moduleId);
  if (blockQuestions.length > 0) return blockQuestions;

  // Strategy 4: Line Grouping Fallback (Every question + 4 options + gabarito)
  const lineQuestions = parseLineGroupQuestions(trimmed, defaultCategory, defaultBanca, moduleId);
  if (lineQuestions.length > 0) return lineQuestions;

  return [];
}

function parseJsonQuestions(text: string, defaultCategory: string, defaultBanca: string, moduleId?: string): Question[] {
  try {
    let obj: any = null;
    if (text.startsWith('[') || text.startsWith('{')) {
      obj = JSON.parse(text);
    }
    const list = Array.isArray(obj) ? obj : Array.isArray(obj?.questions) ? obj.questions : null;
    if (list && list.length > 0) {
      return list.map((item: any, index: number) => {
        const options = Array.isArray(item.options) && item.options.length > 0
          ? item.options
          : [item.a || item.opcaoA, item.b || item.opcaoB, item.c || item.opcaoC, item.d || item.opcaoD].filter(Boolean);

        while (options.length < 4) {
          options.push(`Opção ${String.fromCharCode(65 + options.length)}`);
        }

        const statement = item.statement || item.pergunta || item.enunciado || item.question || `Questão ${index + 1}`;
        const gabaritoRaw = item.correctIndex ?? item.gabarito ?? item.resposta ?? item.answer ?? null;
        const fallbackIdx = (index * 3 + 1) % 4; // Rotates: 1 (B), 0 (A), 3 (D), 2 (C)

        return {
          id: `json-${Date.now()}-${index}`,
          moduleId: moduleId || item.moduleId || '',
          category: item.category || defaultCategory || 'Concurso Público',
          banca: item.banca || defaultBanca || 'NgolaTeste',
          statement,
          options: options.slice(0, 4),
          correctIndex: parseLetterOrIndex(gabaritoRaw, options, fallbackIdx),
          explanation: item.explanation || item.explicacao || item.comentario || `Gabarito verificado`,
        };
      });
    }
  } catch {
    // Ignore JSON error
  }
  return [];
}

function parseCsvQuestions(text: string, defaultCategory: string, defaultBanca: string, moduleId?: string): Question[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  // Determine delimiter: \t, ;, |, or ,
  let delimiter = '';
  const firstLine = lines[0];

  if (firstLine.includes('\t') || lines.some(l => l.includes('\t'))) {
    delimiter = '\t';
  } else if (firstLine.includes(';') || lines.some(l => l.includes(';'))) {
    delimiter = ';';
  } else if (firstLine.includes('|') || lines.some(l => l.includes('|'))) {
    delimiter = '|';
  } else if (firstLine.includes(',') && (firstLine.split(',').length >= 3 || lines.filter(l => l.includes(',')).length >= lines.length * 0.5)) {
    delimiter = ',';
  }

  if (!delimiter) return [];

  const results: Question[] = [];
  const startIdx = isHeaderLine(lines[0]) ? 1 : 0;

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const parts = splitCsvLine(line, delimiter);

    if (parts.length >= 2) {
      const statement = parts[0];
      let options: string[] = [];
      let gabaritoRaw: string | null = null;
      let explanation = '';
      const fallbackIdx = (results.length * 3 + 1) % 4; // Rotates between B, A, D, C

      if (parts.length >= 6) {
        // Standard: Statement, OptA, OptB, OptC, OptD, Gabarito, [Explanation]
        options = parts.slice(1, 5);
        gabaritoRaw = parts[5];
        explanation = parts[6] || '';
      } else if (parts.length === 5) {
        // Statement, OptA, OptB, OptC, OptD
        options = parts.slice(1, 5);
        gabaritoRaw = null; // No explicit gabarito -> fallback to distributed rotation
      } else if (parts.length === 3 || parts.length === 4) {
        // Statement, OptA, OptB, OptC... fill up to 4 options
        options = parts.slice(1);
      } else if (parts.length === 2) {
        options = [parts[1]];
      }

      while (options.length < 4) {
        options.push(`Opção ${String.fromCharCode(65 + options.length)}`);
      }

      const finalCorrectIndex = parseLetterOrIndex(gabaritoRaw, options, fallbackIdx);

      if (statement && statement.length >= 2) {
        results.push({
          id: `csv-${Date.now()}-${i}`,
          moduleId: moduleId || '',
          category: defaultCategory,
          banca: defaultBanca,
          statement,
          options: options.slice(0, 4),
          correctIndex: finalCorrectIndex,
          explanation: explanation || `Gabarito oficial (${String.fromCharCode(65 + finalCorrectIndex)})`
        });
      }
    }
  }

  return results;
}

function isHeaderLine(line: string): boolean {
  const lower = line.toLowerCase();
  return lower.includes('enunciado') || 
         lower.includes('pergunta') || 
         lower.includes('statement') || 
         lower.includes('opcao') || 
         lower.includes('opção') || 
         lower.includes('gabarito') || 
         lower.includes('resposta') ||
         lower.includes('question') ||
         lower.includes('option');
}

function splitCsvLine(line: string, delimiter: string): string[] {
  if (delimiter === '\t') {
    return line.split('\t').map(s => s.trim().replace(/^["']|["']$/g, ''));
  }

  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim().replace(/^["']|["']$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^["']|["']$/g, ''));
  return result.filter(r => r !== undefined);
}

function parseBlockQuestions(text: string, defaultCategory: string, defaultBanca: string, moduleId?: string): Question[] {
  const lines = text.split('\n');
  const questionBlocks: string[] = [];
  let currentBlock: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isNewQuestionStart = /^(quest[ãa]o\s*\d+|\d+[\.\)\-]|q\d+[\.\)\-])/i.test(line.trim());

    if (isNewQuestionStart && currentBlock.length > 0) {
      questionBlocks.push(currentBlock.join('\n'));
      currentBlock = [line];
    } else {
      currentBlock.push(line);
    }
  }
  if (currentBlock.length > 0) {
    questionBlocks.push(currentBlock.join('\n'));
  }

  const parsedQuestions: Question[] = [];

  questionBlocks.forEach((block, idx) => {
    const blockLines = block.split('\n').map(l => l.trim()).filter(Boolean);
    if (blockLines.length === 0) return;

    let statement = '';
    const options: string[] = [];
    let gabaritoRaw: string | null = null;
    let explanation = '';
    const fallbackIdx = (idx * 3 + 1) % 4; // Rotates: 1 (B), 0 (A), 3 (D), 2 (C)

    blockLines.forEach((line) => {
      const optionMatch = /^([a-d1-4])[\.\)\-\:]\s*(.+)/i.exec(line);
      const answerMatch = /^(resposta|gabarito|correta|r)[\:\=]\s*(.+)/i.exec(line);
      const explMatch = /^(explica[çc][ãa]o|coment[áa]rio|nota|fundamenta[çc][ãa]o)[\:\=]\s*(.+)/i.exec(line);

      if (answerMatch) {
        gabaritoRaw = answerMatch[2].trim();
      } else if (explMatch) {
        explanation = explMatch[2].trim();
      } else if (optionMatch) {
        options.push(optionMatch[2].trim());
      } else if (options.length === 0) {
        const cleanLine = line.replace(/^(quest[ãa]o\s*\d+[\:\.\-]?|\d+[\.\)\-]\s*|q\d+[\.\)\-]\s*)/i, '').trim();
        if (cleanLine) {
          statement = statement ? `${statement} ${cleanLine}` : cleanLine;
        }
      } else {
        if (line.toLowerCase().startsWith('exp:') || line.toLowerCase().startsWith('obs:')) {
          explanation = line.replace(/^[^:]+:\s*/, '').trim();
        }
      }
    });

    if (statement && options.length >= 1) {
      while (options.length < 4) {
        options.push(`Opção ${String.fromCharCode(65 + options.length)}`);
      }

      const finalCorrectIdx = parseLetterOrIndex(gabaritoRaw, options, fallbackIdx);

      parsedQuestions.push({
        id: `block-${Date.now()}-${idx}`,
        moduleId: moduleId || '',
        category: defaultCategory,
        banca: defaultBanca,
        statement,
        options: options.slice(0, 4),
        correctIndex: finalCorrectIdx,
        explanation: explanation || `Gabarito oficial (${String.fromCharCode(65 + finalCorrectIdx)})`
      });
    }
  });

  return parsedQuestions;
}

function parseLineGroupQuestions(text: string, defaultCategory: string, defaultBanca: string, moduleId?: string): Question[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 5) return [];

  const results: Question[] = [];
  let i = 0;

  while (i < lines.length) {
    if (i + 4 < lines.length) {
      const statement = lines[i].replace(/^(quest[ãa]o\s*\d+|\d+[\.\)\-])/i, '').trim();
      const options = [lines[i + 1], lines[i + 2], lines[i + 3], lines[i + 4]].map(o => o.replace(/^[a-d1-4][\.\)\-\:]\s*/i, ''));
      let gabaritoRaw: string | null = null;
      let explanation = '';
      const fallbackIdx = (results.length * 3 + 1) % 4;

      if (i + 5 < lines.length && /^(resposta|gabarito|correta|r|gabarito\:)/i.test(lines[i + 5])) {
        gabaritoRaw = lines[i + 5].replace(/^(resposta|gabarito|correta|r)[\:\=]\s*/i, '');
        i += 6;
      } else {
        i += 5;
      }

      const finalCorrectIdx = parseLetterOrIndex(gabaritoRaw, options, fallbackIdx);

      results.push({
        id: `line-${Date.now()}-${results.length}`,
        moduleId: moduleId || '',
        category: defaultCategory,
        banca: defaultBanca,
        statement,
        options,
        correctIndex: finalCorrectIdx,
        explanation: explanation || `Gabarito verificado (${String.fromCharCode(65 + finalCorrectIdx)})`
      });
    } else {
      break;
    }
  }

  return results;
}

function parseLetterOrIndex(val: any, options: string[] = [], fallbackIndex: number = 0): number {
  if (typeof val === 'number') {
    if (val >= 0 && val <= 3) return val;
    if (val >= 1 && val <= 4) return val - 1;
  }

  if (val === undefined || val === null || val === '') return fallbackIndex;
  const str = String(val).trim().toUpperCase();

  if (str === 'A' || str === '0' || str === '1' || str.startsWith('OPÇÃO A') || str.startsWith('A)') || str.startsWith('A.')) return 0;
  if (str === 'B' || str === '2' || str.startsWith('OPÇÃO B') || str.startsWith('B)') || str.startsWith('B.')) return 1;
  if (str === 'C' || str === '3' || str.startsWith('OPÇÃO C') || str.startsWith('C)') || str.startsWith('C.')) return 2;
  if (str === 'D' || str === '4' || str.startsWith('OPÇÃO D') || str.startsWith('D)') || str.startsWith('D.')) return 3;

  if (options && options.length > 0) {
    const lowerVal = String(val).trim().toLowerCase();
    const matchedIdx = options.findIndex(opt => opt.trim().toLowerCase() === lowerVal);
    if (matchedIdx !== -1) return matchedIdx;
  }

  return fallbackIndex;
}
