import React, { useState } from 'react';
import { Screen, ExamResult } from '../types';

interface ResultViewProps {
  result: ExamResult;
  onNavigate: (screen: Screen) => void;
  onRestartExam: () => void;
}

export const ResultView: React.FC<ResultViewProps> = ({
  result,
  onNavigate,
  onRestartExam,
}) => {
  const [aiTip, setAiTip] = useState<string | null>(result.studyTip);
  const [isLoadingAiTip, setIsLoadingAiTip] = useState(false);

  const fetchAiTip = async () => {
    setIsLoadingAiTip(true);
    try {
      const res = await fetch('/api/gemini/study-tip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: result.categoryName,
          score: result.score,
          totalQuestions: result.total,
          wrongCategories: ['Legislação', 'Direito Administrativo'],
        }),
      });
      const data = await res.json();
      if (data.tip) {
        setAiTip(data.tip);
      }
    } catch (err) {
      console.error('Error fetching AI tip:', err);
    } finally {
      setIsLoadingAiTip(false);
    }
  };

  const scorePercentage = result.percentage || 80;
  const strokeDashoffset = 552.92 - (552.92 * scorePercentage) / 100;

  return (
    <div className="pt-24 pb-32 px-4 md:px-8 max-w-4xl mx-auto">
      {/* Result Header Section */}
      <section className="text-center mb-10">
        <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-3 text-slate-900">
          Parabéns pelo esforço!
        </h2>
        <p className="text-slate-600 text-base md:text-lg max-w-md mx-auto leading-relaxed">
          Você concluiu o simulado. Veja abaixo o seu desempenho detalhado para continuar evoluindo.
        </p>
      </section>

      {/* Result Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        {/* Main Score Card */}
        <div className="md:col-span-8 bg-white rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-[0_4px_32px_rgba(0,0,0,0.04)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 to-blue-300" />

          {/* Circular Progress Gauge */}
          <div className="relative w-48 h-48 flex items-center justify-center mb-6">
            <svg className="w-full h-full -rotate-90">
              <circle
                className="text-slate-100"
                cx="96"
                cy="96"
                fill="transparent"
                r="88"
                stroke="currentColor"
                strokeWidth="12"
              />
              <circle
                className="text-blue-600 transition-all duration-1000 ease-out"
                cx="96"
                cy="96"
                fill="transparent"
                r="88"
                stroke="currentColor"
                strokeDasharray="552.92"
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                strokeWidth="12"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-4xl md:text-5xl font-black text-slate-900">
                {result.score}/{result.total}
              </span>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-widest mt-1">
                ACERTOS
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="text-2xl font-bold text-slate-900">
              Desempenho de {scorePercentage}%
            </h3>
            <p className="text-slate-500 text-sm">
              Você está acima da média dos candidatos para esta categoria.
            </p>
          </div>
        </div>

        {/* Stats Column (Correct / Incorrect) */}
        <div className="md:col-span-4 flex flex-col gap-4">
          {/* Correct Stats */}
          <div className="flex-1 bg-white rounded-3xl p-6 flex flex-col justify-between border-l-8 border-blue-600 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span
                className="material-symbols-outlined text-blue-600 text-3xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
              <span className="text-3xl font-black text-blue-600">
                {result.correctCount.toString().padStart(2, '0')}
              </span>
            </div>
            <span className="text-slate-700 font-bold text-sm">Respostas Corretas</span>
          </div>

          {/* Incorrect Stats */}
          <div className="flex-1 bg-white rounded-3xl p-6 flex flex-col justify-between border-l-8 border-red-500 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span
                className="material-symbols-outlined text-red-500 text-3xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                cancel
              </span>
              <span className="text-3xl font-black text-red-500">
                {result.incorrectCount.toString().padStart(2, '0')}
              </span>
            </div>
            <span className="text-slate-700 font-bold text-sm">Respostas Incorretas</span>
          </div>
        </div>

        {/* Final Grade Section */}
        <div className="md:col-span-12 bg-white rounded-3xl p-6 flex items-center justify-between border border-blue-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100/80 rounded-2xl flex items-center justify-center text-blue-600">
              <span className="material-symbols-outlined">grade</span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                NOTA FINAL
              </h4>
              <p className="text-xs text-slate-400">Avaliação máxima: 20 valores</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-4xl font-black text-blue-600">{result.finalGrade}</span>
            <span className="text-xl font-bold text-slate-400"> / 20</span>
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mt-0.5">
              VALORES
            </p>
          </div>
        </div>

        {/* Focus Mode Study Tip Card */}
        <div className="md:col-span-12 bg-white rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 border border-blue-100 shadow-sm relative">
          <div className="w-16 h-16 bg-blue-100/80 rounded-2xl flex items-center justify-center shrink-0 text-blue-600">
            <span className="material-symbols-outlined text-3xl">lightbulb</span>
          </div>

          <div className="text-center md:text-left flex-1 space-y-2">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <h4 className="text-lg font-bold text-slate-900">Dica de Estudo</h4>
              <button
                onClick={fetchAiTip}
                disabled={isLoadingAiTip}
                className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-bold hover:bg-blue-100 transition-colors flex items-center gap-1 cursor-pointer"
                title="Pedir orientação personalizada à IA"
              >
                <span className="material-symbols-outlined text-xs">auto_awesome</span>
                {isLoadingAiTip ? 'Analisando...' : 'Pedir IA'}
              </button>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed">
              {aiTip}
            </p>
          </div>

          <div className="shrink-0 text-center">
            <div className="h-2 w-32 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 w-4/5" />
            </div>
            <p className="text-[10px] uppercase tracking-wider mt-2 font-bold text-blue-600">
              PROGRESSO SEMANAL
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
        <button
          onClick={onRestartExam}
          className="w-full sm:w-auto px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-base transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
        >
          <span className="material-symbols-outlined">refresh</span>
          <span>Refazer Teste</span>
        </button>

        <button
          onClick={() => onNavigate('home')}
          className="w-full sm:w-auto px-10 py-4 bg-white text-blue-700 border-2 border-blue-200 hover:bg-blue-50/50 rounded-xl font-bold text-base transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
        >
          <span className="material-symbols-outlined">home</span>
          <span>Voltar ao Início</span>
        </button>
      </div>
    </div>
  );
};
