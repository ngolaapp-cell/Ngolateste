import React, { useState, useEffect } from 'react';
import { Screen, Question, ExamResult } from '../types';

interface ExamViewProps {
  questions: Question[];
  categoryTitle?: string;
  onNavigate: (screen: Screen) => void;
  onFinishExam: (result: ExamResult) => void;
}

export const ExamView: React.FC<ExamViewProps> = ({
  questions,
  categoryTitle = 'Simulado de Concurso',
  onNavigate,
  onFinishExam,
}) => {
  const QUESTION_TIME_LIMIT = 60; // 60 seconds (1 minute) per question

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>(
    Array(questions.length).fill(null)
  );
  const [secondsLeft, setSecondsLeft] = useState(QUESTION_TIME_LIMIT);
  const [isFocusMode, setIsFocusMode] = useState(true);
  const [showFinishModal, setShowFinishModal] = useState(false);

  // Count answered questions up to now
  const answeredCount = selectedAnswers.filter((ans) => ans !== null).length;

  // Reset timer on question change
  useEffect(() => {
    setSecondsLeft(QUESTION_TIME_LIMIT);
  }, [currentIndex]);

  const currentQuestion = questions[currentIndex] || questions[0];
  const progressPercentage = Math.round(((currentIndex + 1) / questions.length) * 100);
  const selectedAnswer = selectedAnswers[currentIndex];
  const hasAnswered = selectedAnswer !== null;
  const isTimedOut = selectedAnswer === -1;
  const isSelectedCorrect = selectedAnswer === currentQuestion.correctIndex;

  // Countdown timer effect
  useEffect(() => {
    if (hasAnswered) return; // Answer locked, freeze timer

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Time expired! Mark as timed-out (-1) to reveal answer and allow proceeding
          setSelectedAnswers((currentAnswers) => {
            const updated = [...currentAnswers];
            if (updated[currentIndex] === null) {
              updated[currentIndex] = -1; // -1 represents timed-out / unanswered
            }
            return updated;
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentIndex, hasAnswered]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSelectOption = (optionIndex: number) => {
    if (hasAnswered) return; // Lock answer once selected for instant feedback
    const updated = [...selectedAnswers];
    updated[currentIndex] = optionIndex;
    setSelectedAnswers(updated);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Calculate exam result
      let correctCount = 0;
      questions.forEach((q, idx) => {
        if (selectedAnswers[idx] === q.correctIndex) {
          correctCount++;
        }
      });

      const total = questions.length > 0 ? questions.length : 20;
      const percentage = Math.round((correctCount / total) * 100);
      const incorrectCount = total - correctCount;
      const finalGrade = Math.round((correctCount / total) * 20); // 0-20 scale

      onFinishExam({
        score: correctCount,
        total: total,
        percentage: percentage,
        correctCount: correctCount,
        incorrectCount: incorrectCount,
        finalGrade: finalGrade,
        studyTip: `Revise as questões de ${currentQuestion.category || 'Conhecimentos Gerais'}. Mantenha a constância para garantir a sua aprovação!`,
        categoryName: currentQuestion.category,
        testName: categoryTitle,
        date: new Date().toLocaleDateString('pt-AO'),
      });
    }
  };

  const handleSkip = () => {
    // If skipped, mark current question as skipped (-1) and advance
    if (selectedAnswers[currentIndex] === null) {
      const updated = [...selectedAnswers];
      updated[currentIndex] = -1;
      setSelectedAnswers(updated);
    }

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      handleNext();
    }
  };

  // Terminar o teste imediatamente considerando SOMENTE as perguntas respondidas até o momento
  const handleFinishEarly = () => {
    let answeredQuestionsCount = 0;
    let correctCount = 0;

    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] !== null && selectedAnswers[idx] !== undefined) {
        answeredQuestionsCount++;
        if (selectedAnswers[idx] === q.correctIndex) {
          correctCount++;
        }
      }
    });

    const evaluatedTotal = answeredQuestionsCount > 0 ? answeredQuestionsCount : 1;
    const percentage = answeredQuestionsCount > 0 ? Math.round((correctCount / answeredQuestionsCount) * 100) : 0;
    const incorrectCount = answeredQuestionsCount > 0 ? answeredQuestionsCount - correctCount : 0;
    const finalGrade = answeredQuestionsCount > 0 ? Math.round((correctCount / answeredQuestionsCount) * 20) : 0;

    setShowFinishModal(false);

    onFinishExam({
      score: correctCount,
      total: answeredQuestionsCount > 0 ? answeredQuestionsCount : 0,
      percentage: percentage,
      correctCount: correctCount,
      incorrectCount: incorrectCount,
      finalGrade: finalGrade,
      studyTip:
        answeredQuestionsCount > 0
          ? `Teste terminado antecipadamente com ${answeredQuestionsCount} questão(ões) avaliada(s). Teve ${correctCount} acerto(s) (${percentage}%).`
          : 'Teste terminado sem respostas registradas.',
      categoryName: currentQuestion?.category || 'Conhecimentos Gerais',
      testName: categoryTitle,
      date: new Date().toLocaleDateString('pt-AO'),
    });
  };

  return (
    <div className={`min-h-screen flex flex-col ${isFocusMode ? 'bg-[#F0F7FF]' : 'bg-slate-50'}`}>
      {/* Top Header */}
      <header className="fixed top-0 w-full z-50 bg-[#F0F7FF]/90 backdrop-blur-md flex justify-between items-center px-6 py-4 border-b border-blue-50">
        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate('tests')}
            className="p-2 rounded-full hover:bg-blue-100/50 transition-colors active:scale-95 duration-150 flex items-center justify-center cursor-pointer text-blue-700"
            aria-label="Sair do Teste"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center text-left cursor-pointer"
          >
            <h1 className="text-xl font-black text-slate-900">
              Ngola<span className="text-blue-600">Teste</span>
            </h1>
          </button>
        </div>

        <button
          onClick={() => onNavigate('profile')}
          className="p-2 rounded-full hover:bg-blue-100/50 transition-colors cursor-pointer text-blue-700"
        >
          <span className="material-symbols-outlined">account_circle</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-grow pt-24 pb-32 px-4 md:px-6">
        <div className="max-w-3xl mx-auto">
          {/* Progress Header */}
          <div className="mb-6 px-2">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-bold text-blue-700 uppercase tracking-wider">
                QUESTÃO {currentIndex + 1} DE {questions.length}
              </span>

              {/* 1 Minute Countdown Timer Badge */}
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs transition-all shadow-xs ${
                  secondsLeft > 20
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : secondsLeft > 10
                    ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                    : secondsLeft > 0
                    ? 'bg-rose-100 text-rose-700 border border-rose-300 animate-bounce font-black'
                    : 'bg-rose-600 text-white font-black'
                }`}
              >
                <span className="material-symbols-outlined text-sm">
                  {secondsLeft === 0 ? 'alarm_off' : 'timer'}
                </span>
                <span>
                  {secondsLeft > 0
                    ? `${secondsLeft}s restantes`
                    : 'Tempo Esgotado!'}
                </span>
              </div>
            </div>

            <div className="h-2.5 w-full bg-slate-200/60 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 font-semibold mt-1 px-1">
              <span>Progresso geral: {progressPercentage}%</span>
              <span>Limite por questão: 1 minuto (60 seg)</span>
            </div>
          </div>

          {/* Question Card */}
          <div className="bg-white rounded-3xl p-6 md:p-10 shadow-[0_4px_32px_rgba(0,0,0,0.03)] border border-slate-200/60">
            {/* Category Badges */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-3">
                <span className="px-3.5 py-1 bg-blue-100/80 text-blue-900 text-xs font-extrabold rounded-full uppercase tracking-tight">
                  {currentQuestion.category}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  Banca: {currentQuestion.banca}
                </span>
              </div>

              {/* Mini Countdown Display */}
              {!hasAnswered && (
                <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-md ${
                  secondsLeft <= 10 ? 'text-rose-600 bg-rose-50 animate-pulse' : 'text-slate-500 bg-slate-100'
                }`}>
                  00:{secondsLeft.toString().padStart(2, '0')}
                </span>
              )}
            </div>

            {/* Question Enunciado */}
            <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 leading-snug mb-8">
              {currentQuestion.statement}
            </h2>

            {/* Options List */}
            <div className="space-y-3.5">
              {currentQuestion.options.map((optionText, idx) => {
                const letter = String.fromCharCode(65 + idx); // A, B, C, D
                const isCorrectOption = idx === currentQuestion.correctIndex;
                const isSelectedOption = selectedAnswer === idx;

                let containerStyle = 'bg-slate-50/80 hover:bg-blue-50/50 border-slate-200/80 hover:border-blue-300 text-slate-800 cursor-pointer active:scale-[0.99]';
                let badgeStyle = 'bg-slate-200/80 text-slate-700 group-hover:bg-blue-600 group-hover:text-white';
                let textStyle = 'text-slate-800';
                let statusIcon = null;

                if (hasAnswered) {
                  if (isCorrectOption) {
                    // Correct Option -> GREEN
                    containerStyle = 'bg-emerald-500 border-emerald-600 text-white shadow-md ring-2 ring-emerald-500/30 cursor-default';
                    badgeStyle = 'bg-white text-emerald-800 font-black';
                    textStyle = 'text-white font-bold';
                    statusIcon = (
                      <span className="material-symbols-outlined text-white font-bold ml-auto text-2xl">
                        check_circle
                      </span>
                    );
                  } else if (isSelectedOption && !isCorrectOption) {
                    // Selected Wrong Option -> RED
                    containerStyle = 'bg-red-500 border-red-600 text-white shadow-md ring-2 ring-red-500/30 cursor-default';
                    badgeStyle = 'bg-white text-red-800 font-black';
                    textStyle = 'text-white font-bold';
                    statusIcon = (
                      <span className="material-symbols-outlined text-white font-bold ml-auto text-2xl">
                        cancel
                      </span>
                    );
                  } else {
                    // Other options when answered
                    containerStyle = 'bg-slate-100/70 border-slate-200 text-slate-400 opacity-50 cursor-not-allowed';
                    badgeStyle = 'bg-slate-200 text-slate-500';
                    textStyle = 'text-slate-500';
                  }
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(idx)}
                    disabled={hasAnswered}
                    className={`w-full text-left group flex items-center gap-4 p-4 md:p-5 rounded-2xl transition-all duration-200 border ${containerStyle}`}
                  >
                    <span
                      className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl font-bold text-sm transition-all ${badgeStyle}`}
                    >
                      {letter}
                    </span>
                    <p className={`text-sm md:text-base leading-relaxed font-medium flex-grow ${textStyle}`}>
                      {optionText}
                    </p>
                    {statusIcon}
                  </button>
                );
              })}
            </div>

            {/* Explanation card after answered / timed out */}
            {hasAnswered && (
              <div
                className={`mt-6 p-5 rounded-2xl border transition-all ${
                  isTimedOut
                    ? 'bg-amber-50 border-amber-300 text-amber-950'
                    : isSelectedCorrect
                    ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                    : 'bg-red-50/90 border-red-200 text-red-950'
                }`}
              >
                <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider mb-2">
                  <span className="material-symbols-outlined text-sm">
                    {isTimedOut ? 'alarm_off' : isSelectedCorrect ? 'check_circle' : 'lightbulb'}
                  </span>
                  <span>
                    {isTimedOut
                      ? `⏰ Tempo Esgotado (1 min)! A resposta correta era a opção ${String.fromCharCode(65 + currentQuestion.correctIndex)}:`
                      : isSelectedCorrect
                      ? 'Resposta Correta!'
                      : 'Resposta Incorreta! Gabarito Comentado:'}
                  </span>
                </div>
                <p className="text-xs md:text-sm font-medium leading-relaxed">
                  {currentQuestion.explanation || 'Gabarito verificado pela comissão do concurso.'}
                </p>
              </div>
            )}

            {/* Quick Card Action / Finish button in marked zone */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>{answeredCount} de {questions.length} respondidas</span>
              </div>

              <button
                type="button"
                onClick={() => setShowFinishModal(true)}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-xs"
              >
                <span className="material-symbols-outlined text-base">flag</span>
                <span>Terminar Teste ({answeredCount})</span>
              </button>
            </div>
          </div>

          {/* Focus Mode & Timer Footer info */}
          <div className="mt-10 flex flex-wrap justify-center items-center gap-6 md:gap-8 text-slate-500">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">timer</span>
              <span className="text-xs font-bold uppercase tracking-widest">
                TEMPO DA QUESTÃO: {secondsLeft > 0 ? `${secondsLeft}s` : 'ESGOTADO'}
              </span>
            </div>
            <button
              onClick={() => setIsFocusMode(!isFocusMode)}
              className="flex items-center gap-2 hover:text-blue-600 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">
                {isFocusMode ? 'visibility_off' : 'visibility'}
              </span>
              <span className="text-xs font-bold uppercase tracking-widest">
                MODO FOCO {isFocusMode ? 'ATIVO' : 'INATIVO'}
              </span>
            </button>
          </div>
        </div>
      </main>

      {/* Bottom Action Bar */}
      <footer className="fixed bottom-0 left-0 w-full p-4 md:p-6 bg-[#F0F7FF]/90 backdrop-blur-xl flex justify-center items-center border-t border-blue-100 z-50">
        <div className="max-w-3xl w-full flex justify-between items-center gap-3 md:gap-4">
          <button
            onClick={handleSkip}
            className="px-4 md:px-6 py-3.5 text-blue-700 font-bold hover:bg-blue-100/50 rounded-2xl transition-colors active:scale-95 cursor-pointer text-xs md:text-sm whitespace-nowrap"
          >
            Pular Questão
          </button>

          <button
            type="button"
            onClick={() => setShowFinishModal(true)}
            className="px-4 md:px-5 py-3.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-2xl transition-all active:scale-95 cursor-pointer text-xs md:text-sm flex items-center gap-1.5 shadow-md shadow-rose-500/20 whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-base md:text-lg">flag</span>
            <span>Terminar</span>
          </button>

          <button
            onClick={handleNext}
            disabled={!hasAnswered}
            className={`flex-1 md:flex-none md:min-w-[200px] px-6 md:px-8 py-3.5 md:py-4 font-extrabold text-sm md:text-base rounded-2xl shadow-lg transition-all flex justify-center items-center gap-2 ${
              hasAnswered
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 active:scale-95 cursor-pointer'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none opacity-80'
            }`}
          >
            <span>{currentIndex < questions.length - 1 ? 'Próxima Pergunta' : 'Submeter Teste'}</span>
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      </footer>

      {/* Confirmation Modal to Finish Test Early */}
      {showFinishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl border border-slate-100 text-center">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl">flag</span>
            </div>

            <h3 className="text-xl font-black text-slate-900 mb-2">
              Deseja terminar o teste agora?
            </h3>

            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              {answeredCount > 0 ? (
                <>
                  Serão consideradas apenas as <strong className="text-slate-900 font-black">{answeredCount} questões respondidas</strong> até ao momento (de um total de {questions.length}). A sua nota final e percentual de aproveitamento serão calculados exclusivamente com base nelas.
                </>
              ) : (
                <>
                  Você ainda não respondeu a nenhuma questão. Se terminar agora, a pontuação calculada será 0.
                </>
              )}
            </p>

            <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-200/60 flex justify-around text-left">
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase">Respondidas</div>
                <div className="text-lg font-black text-blue-600">{answeredCount}</div>
              </div>
              <div className="w-px bg-slate-200"></div>
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase">Restantes</div>
                <div className="text-lg font-black text-slate-700">{questions.length - answeredCount}</div>
              </div>
              <div className="w-px bg-slate-200"></div>
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase">Total do Banco</div>
                <div className="text-lg font-black text-slate-900">{questions.length}</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setShowFinishModal(false)}
                className="flex-1 px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-all cursor-pointer text-sm"
              >
                Continuar Respondendo
              </button>
              <button
                type="button"
                onClick={handleFinishEarly}
                className="flex-1 px-5 py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-2xl shadow-lg shadow-rose-600/20 transition-all cursor-pointer text-sm"
              >
                Sim, Terminar Agora
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
