import { Category, Specialization, TestModule, Question, UserProfile } from '../types';

export const INITIAL_USER_PROFILE: UserProfile = {
  name: "Candidato Ngola",
  phone: "+244 923 361 877",
  email: "candidato@ngolateste.ao",
  isActivated: false,
  dailyGoalQuestions: 30,
  dailyCompletedQuestions: 12,
  totalTestsTaken: 18,
  averageScore: 82,
};

export const HOME_CATEGORIES: Category[] = [
  {
    id: "educacao",
    name: "Educação",
    description: "Professores, coordenadores e cargos técnicos educacionais (MED / Governos Provinciais).",
    icon: "school",
    image: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=800&q=80",
    statusTag: "LIBERADO",
    statusColor: "bg-emerald-500",
  },
  {
    id: "saude",
    name: "Saúde",
    description: "Médicos, enfermeiros, técnicos de diagnóstico e especialistas em saúde pública (MINMED).",
    icon: "medical_services",
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80",
    statusTag: "Inscrever agora",
    statusColor: "bg-blue-600",
  },
  {
    id: "administracao",
    name: "Administração",
    description: "Analistas, técnicos e assistentes administrativos de carreira do Estado.",
    icon: "account_balance",
    image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80",
    statusTag: "LIBERADO",
    statusColor: "bg-emerald-500",
  },
  {
    id: "seguranca",
    name: "Segurança",
    description: "Polícia Nacional, Serviço de Investigação Criminal (SIC) e Guardas Municipais.",
    icon: "security",
    image: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=800&q=80",
    statusTag: "Inscrever agora",
    statusColor: "bg-blue-600",
  },
];

export const SPECIALIZATIONS: Specialization[] = [
  // Educação
  {
    id: "matematica",
    categoryId: "educacao",
    categoryName: "Educação",
    title: "Matemática",
    description: "Cálculo, Álgebra Linear, Geometria e Raciocínio Lógico avançado.",
    icon: "functions",
    image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "portugues",
    categoryId: "educacao",
    categoryName: "Educação",
    title: "Língua Portuguesa",
    description: "Gramática, Sintaxe, Interpretação de Texto, Concordância e Redação.",
    icon: "menu_book",
    image: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "pedagogia",
    categoryId: "educacao",
    categoryName: "Educação",
    title: "Pedagogia & Didáctica",
    description: "Psicologia do Ensino, Planeamento Escolar, Didáctica e Reforma Educativa.",
    icon: "school",
    image: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "historia-geo",
    categoryId: "educacao",
    categoryName: "Educação",
    title: "História e Geografia",
    description: "História de Angola, Geografia Económica, Geopolítica e Cultura Geral.",
    icon: "public",
    image: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=800&q=80",
  },

  // Saúde
  {
    id: "enfermagem",
    categoryId: "saude",
    categoryName: "Saúde",
    title: "Enfermagem Geral",
    description: "Fundamentos de Enfermagem, Ética Profissional, Cuidados Intensivos e Biossegurança.",
    icon: "medical_services",
    image: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80",
    isRecommended: true,
  },
  {
    id: "medicina",
    categoryId: "saude",
    categoryName: "Saúde",
    title: "Medicina Geral",
    description: "Diagnóstico Clínico, Pediatria, Farmacologia, Patologia e Saúde Pública.",
    icon: "health_and_safety",
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "analises-clinicas",
    categoryId: "saude",
    categoryName: "Saúde",
    title: "Análises Clínicas",
    description: "Hematologia, Bioquímica, Microbiologia, Parasitologia e Biossegurança.",
    icon: "biotech",
    image: "https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "farmacia",
    categoryId: "saude",
    categoryName: "Saúde",
    title: "Farmácia & Fármacos",
    description: "Farmacologia, Dispensação de Medicamentos, Posologia e Legislação.",
    icon: "medication",
    image: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80",
  },

  // Administração
  {
    id: "gestao-publica",
    categoryId: "administracao",
    categoryName: "Administração",
    title: "Gestão Pública & Finanças",
    description: "Orçamento Geral do Estado, Contratação Pública, Finanças e Licitações.",
    icon: "account_balance",
    image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "contabilidade",
    categoryId: "administracao",
    categoryName: "Administração",
    title: "Contabilidade & Auditoria",
    description: "Contabilidade Geral, Balanço Patrimonial, Auditoria e Fiscalidade.",
    icon: "payments",
    image: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "direito-admin",
    categoryId: "administracao",
    categoryName: "Administração",
    title: "Direito Administrativo",
    description: "Princípios da Função Pública, Actos Administrativos e Contratos.",
    icon: "gavel",
    image: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "informatica",
    categoryId: "administracao",
    categoryName: "Administração",
    title: "Informática & Redes",
    description: "Redes de Computadores, Segurança da Informação, Hardware e Office.",
    icon: "computer",
    image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80",
  },

  // Segurança
  {
    id: "direito-penal",
    categoryId: "seguranca",
    categoryName: "Segurança",
    title: "Legislação Policial & Penal",
    description: "Código Penal, Processo Penal, Direitos Humanos e Estatuto da PNA.",
    icon: "local_police",
    image: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "investigacao",
    categoryId: "seguranca",
    categoryName: "Segurança",
    title: "Investigação Criminal (SIC)",
    description: "Criminologia, Técnicas de Investigação, Perícia e Preservação de Provas.",
    icon: "fingerprint",
    image: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "raciocinio-logico",
    categoryId: "seguranca",
    categoryName: "Segurança",
    title: "Raciocínio Lógico & Psicotécnico",
    description: "Lógica Dedutiva, Sequências, Problemas Lógicos e Testes de Aptidão.",
    icon: "psychology",
    image: "https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=800&q=80",
  },
];

export const TEST_MODULES: TestModule[] = [
  {
    id: "exame-2024",
    title: "Exame de Admissão 2024",
    year: 2024,
    questionCount: 40,
    badge: "OFICIAL",
    category: "Geral / Função Pública",
  },
  {
    id: "simulado-2025",
    title: "Simulado Geral 2025",
    year: 2025,
    questionCount: 50,
    badge: "RECOMENDADO",
    category: "Administração Pública",
  },
  {
    id: "especialidade-2023",
    title: "Teste de Especialidade 2023",
    year: 2023,
    questionCount: 35,
    badge: "ESPECIAL",
    category: "Saúde & Educação",
  },
  {
    id: "recurso-2022",
    title: "Exame de Recurso 2022",
    year: 2022,
    questionCount: 40,
    category: "Direito & Legislação",
  },
];

export const MOCK_QUESTIONS: Question[] = [
  {
    id: "q1",
    category: "DIREITO ADMINISTRATIVO",
    banca: "IASP • 2024",
    statement: "De acordo com a Lei nº 8.112/90 (e legislação correlata da Função Pública em Angola), qual das seguintes alternativas descreve corretamente uma das formas de provimento de cargo público?",
    options: [
      "A readmissão é o retorno do servidor estável ao cargo anteriormente ocupado em decorrência de inabilitação em estágio probatório.",
      "A reversão é o retorno à atividade de servidor aposentado, quando junta médica oficial declarar insubsistentes os motivos da aposentadoria.",
      "A redistribuição é o deslocamento de cargo de provimento efetivo para outro órgão ou entidade do mesmo Poder, sem interrupção de exercício.",
      "A recondução é o ato pelo qual o servidor aposentado retorna ao serviço público após processo de reabilitação profissional."
    ],
    correctIndex: 1, // Alínea B
    explanation: "A reversão ocorre quando o servidor aposentado por invalidez retorna à atividade após junta médica oficial atestar a insubsistência dos motivos que geraram a aposentadoria."
  },
  {
    id: "q2",
    category: "LEGISLAÇÃO E REGRAS DA FUNÇÃO PÚBLICA",
    banca: "MINFIN / MED • 2024",
    statement: "Nos termos da Constituição da República de Angola (CRA), a Administração Pública obedece aos princípios da igualdade, da proporcionalidade, da justiça, da imparcialidade e da legalidade. Qual das opções expressa a obrigatoriedade de concurso público?",
    options: [
      "O recrutamento e seleção de pessoal para os quadros definitivos da Função Pública é feito obrigatoriamente por via de concurso público de provas e títulos.",
      "O concurso público é dispensável para cargos técnicos superiores mediante indicação direta do Secretário de Estado.",
      "O acesso aos empregos públicos depende exclusivamente de formação académica sem necessidade de exame de admissão.",
      "O provimento em regime de substituição dispensa os requisitos mínimos de habilitação escolar."
    ],
    correctIndex: 0, // Alínea A
    explanation: "O acesso aos quadros da Função Pública Angolana é garantido em igualdade de condições através do concurso público transparente."
  },
  {
    id: "q3",
    category: "CONHECIMENTOS GERAIS DE ANGOLA",
    banca: "INAGBE • 2024",
    statement: "Qual é a data histórica que assinala a Independência Nacional da República de Angola?",
    options: [
      "4 de Fevereiro de 1961",
      "17 de Setembro de 1979",
      "11 de Novembro de 1975",
      "4 de Abril de 2002"
    ],
    correctIndex: 2, // Alínea C
    explanation: "A Independência Nacional de Angola foi proclamada pelo Dr. António Agostinho Neto no dia 11 de Novembro de 1975."
  },
  {
    id: "q4",
    category: "MATEMÁTICA E RACIOCÍNIO LÓGICO",
    banca: "MED • 2024",
    statement: "Se em uma prova de concurso um candidato acertou 32 das 40 questões apresentadas, qual foi a percentagem de aproveitamento obtida pelo candidato?",
    options: [
      "70%",
      "75%",
      "85%",
      "80%"
    ],
    correctIndex: 3, // Alínea D
    explanation: "Para calcular a percentagem: (32 / 40) * 100 = 0.8 * 100 = 80%."
  },
  {
    id: "q5",
    category: "LÍNGUA PORTUGUESA & REDAÇÃO",
    banca: "MINMED • 2024",
    statement: "Assinale a opção em que a concordância verbal obedece rigorosamente à norma culta da língua portuguesa:",
    options: [
      "Fazem três anos que o concurso público de saúde foi realizado.",
      "Houveram várias dúvidas sobre o gabarito oficial divulgado.",
      "Havia muitos candidatos inscritos no pavilhão de exames de Luanda.",
      "A maioria dos alunos conseguiram a aprovação sem recurso."
    ],
    correctIndex: 2, // Alínea C
    explanation: "O verbo 'haver' no sentido de existir ou ocorrer é impessoal e permanece na 3ª pessoa do singular ('Havia muitos candidatos')."
  },
  {
    id: "q6",
    category: "INFORMÁTICA BÁSICA",
    banca: "GOVERNO PROVINCIAL • 2024",
    statement: "No contexto do Microsoft Word ou Google Docs, qual atalho de teclado é comummente utilizado para selecionar todo o texto contido no documento (em sistemas em português)?",
    options: [
      "Ctrl + C",
      "Ctrl + Z",
      "Ctrl + P",
      "Ctrl + A (ou Ctrl + T)"
    ],
    correctIndex: 3, // Alínea D
    explanation: "O atalho Ctrl + A (All) ou Ctrl + T (Tudo) seleciona a totalidade do conteúdo de um documento de texto."
  },
  {
    id: "q7",
    category: "ENFERMAGEM E SAÚDE PÚBLICA",
    banca: "MINMED • 2024",
    statement: "Qual é o intervalo recomendado de lavagem das mãos de acordo com as normas universais de biossegurança no ambiente hospitalar?",
    options: [
      "Apenas no início e final do turno de trabalho.",
      "Antes e após o contacto com cada paciente e procedimentos assépticos.",
      "Somente quando houver sujidade visível a olho nu.",
      "Uma vez a cada 4 horas durante o plantão."
    ],
    correctIndex: 1, // Alínea B
    explanation: "A higienização correta das mãos antes e após contacto com o paciente previne infecções cruzadas hospitalares."
  },
  {
    id: "q8",
    category: "DIREITO CONSTITUCIONAL",
    banca: "IASP • 2024",
    statement: "Segundo a CRA, a República de Angola é um Estado Democrático de Direito que tem como fundamentos a soberania popular, a dignidade da pessoa humana e:",
    options: [
      "A centralização absoluta do poder executivo",
      "A restrição do acesso ao ensino superior pública",
      "O pluralismo de expressão e organização política",
      "O monopólio estatal ilimitado do comércio"
    ],
    correctIndex: 2, // Alínea C
    explanation: "O Artigo 2.º da CRA estabelece o pluralismo de expressão e organização política como valor fundamental da República."
  },
  {
    id: "q9",
    category: "PEDAGOGIA E DIDÁCTICA",
    banca: "MED • 2024",
    statement: "No contexto da reforma educativa em Angola, a avaliação formativa tem como principal objetivo:",
    options: [
      "Acompanhar continuamente o processo de ensino-aprendizagem para reorientar estratégias pedagógicas.",
      "Apenas atribuir uma nota final quantitativa para reprovação.",
      "Classificar os alunos em ordem de mérito socioeconómico.",
      "Substituir o plano curricular do ensino primário."
    ],
    correctIndex: 0, // Alínea A
    explanation: "A avaliação formativa ocorre durante o processo letivo para identificar dificuldades e regular a aprendizagem."
  },
  {
    id: "q10",
    category: "ÉTICA NA FUNÇÃO PÚBLICA",
    banca: "MINFIN • 2024",
    statement: "O servidor público que atua com imparcialidade, urbanidade e respeito ao cidadão cumpre qual dos seguintes deveres éticos primordiais?",
    options: [
      "Princípio do nepotismo qualificado.",
      "Dever de omissão funcional.",
      "Princípio da reserva partidária obrigatória.",
      "Dever de lealdade às instituições e interesse público."
    ],
    correctIndex: 3, // Alínea D
    explanation: "A lealdade e probidade ao interesse público são compromissos éticos de qualquer agente público."
  }
];
