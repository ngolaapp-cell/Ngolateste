import React, { useState } from 'react';
import { Screen, UserProfile, Specialization } from '../types';
import { validateAndApplyActivationCode } from '../services/supabaseService';
import { SPECIALIZATIONS } from '../data/mockData';

interface ActivationViewProps {
  userProfile: UserProfile;
  selectedSpecialization?: Specialization | null;
  specializations?: Specialization[];
  onNavigate: (screen: Screen) => void;
  onSelectSpecialization?: (spec: Specialization | null) => void;
  onActivationSuccess: (code: string, days: number, specializationId?: string, specializationTitle?: string) => void;
}

export const ActivationView: React.FC<ActivationViewProps> = ({
  userProfile,
  selectedSpecialization,
  specializations = SPECIALIZATIONS,
  onNavigate,
  onSelectSpecialization,
  onActivationSuccess,
}) => {
  const allSpecs = specializations && specializations.length > 0 ? specializations : SPECIALIZATIONS;
  
  // Default to selectedSpecialization or first available specialization
  const [activeSpec, setActiveSpec] = useState<Specialization | null>(
    selectedSpecialization || (allSpecs.length > 0 ? allSpecs[0] : null)
  );
  const [activationCode, setActivationCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );
  const [showVideoModal, setShowVideoModal] = useState(false);

  const currentSpec = activeSpec || selectedSpecialization || (allSpecs.length > 0 ? allSpecs[0] : null);

  const isCurrentSpecAlreadyUnlocked = () => {
    if (!currentSpec || !userProfile?.activatedSpecializations) return false;
    const activated = userProfile.activatedSpecializations;
    return (
      activated.includes(currentSpec.id) ||
      activated.includes(currentSpec.title) ||
      activated.some(
        (s) =>
          s.toLowerCase().trim() === currentSpec.id.toLowerCase().trim() ||
          s.toLowerCase().trim() === currentSpec.title.toLowerCase().trim()
      )
    );
  };

  const alreadyUnlocked = isCurrentSpecAlreadyUnlocked();

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activationCode.trim()) {
      setFeedback({ type: 'error', message: 'Por favor, insira o código de ativação.' });
      return;
    }

    if (!currentSpec) {
      setFeedback({
        type: 'error',
        message: 'Por favor, selecione qual especialização pretende ativar.',
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      // Direct Supabase activation check with target specialization
      const result = await validateAndApplyActivationCode(
        activationCode,
        userProfile.phone,
        currentSpec.id,
        currentSpec.title
      );

      if (result.success) {
        setFeedback({
          type: 'success',
          message: `Sucesso! A especialidade "${currentSpec.title}" foi ativada por 14 dias. A abrir testes...`,
        });
        const targetSpecId = result.activatedSpecializationId || currentSpec.id;
        const targetSpecTitle = result.activatedSpecializationTitle || currentSpec.title;
        
        onActivationSuccess(activationCode, result.expiresInDays || 14, targetSpecId, targetSpecTitle);

        if (onSelectSpecialization) {
          onSelectSpecialization(currentSpec);
        }

        setTimeout(() => {
          onNavigate('tests');
        }, 1500);
      } else {
        // Backup API call check if client Supabase didn't validate
        try {
          const res = await fetch('/api/activate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code: activationCode,
              specializationId: currentSpec.id,
              specializationTitle: currentSpec.title,
            }),
          });
          const data = await res.json();
          if (data.success) {
            setFeedback({
              type: 'success',
              message: `Sucesso! Especialidade "${currentSpec.title}" ativada com sucesso por 14 dias!`,
            });
            onActivationSuccess(
              activationCode,
              data.expiresInDays || 14,
              currentSpec.id,
              currentSpec.title
            );
            if (onSelectSpecialization) {
              onSelectSpecialization(currentSpec);
            }
            setTimeout(() => {
              onNavigate('tests');
            }, 1500);
            return;
          }
        } catch (_) {}

        setFeedback({ type: 'error', message: result.message });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Erro ao validar o código. Verifique sua conexão ou tente novamente.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const whatsAppMessage = currentSpec
    ? `Olá! Gostaria de adquirir o código de ativação individual para a especialidade de *${currentSpec.title}* do NgolaTeste por 1.000 Kzs.`
    : 'Olá! Gostaria de adquirir um código de ativação para uma especialidade do NgolaTeste por 1.000 Kzs.';

  const whatsAppLink = `https://wa.me/244923361877?text=${encodeURIComponent(whatsAppMessage)}`;

  return (
    <div className="pt-28 md:pt-32 pb-32 px-4 md:px-8 max-w-5xl mx-auto">
      {/* Back Button & Breadcrumb */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <button
          onClick={() => onNavigate(currentSpec ? 'categories' : 'home')}
          className="text-slate-600 hover:text-blue-600 transition-colors flex items-center text-xs font-bold gap-1 cursor-pointer bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          <span>Voltar para Especializações</span>
        </button>

        {currentSpec && (
          <span className="bg-blue-50 text-blue-800 text-xs font-black px-3.5 py-1.5 rounded-full border border-blue-200 flex items-center gap-1.5 shadow-xs">
            <span className="material-symbols-outlined text-sm text-blue-600">school</span>
            <span>Especialidade: {currentSpec.title}</span>
          </span>
        )}
      </div>

      {/* Top Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Headline & Video & Instructions */}
        <section className="lg:col-span-7 space-y-6">
          {/* Specialization Target Banner */}
          <div className="bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white p-6 md:p-8 rounded-3xl shadow-xl relative overflow-hidden border border-blue-800/60">
            <div className="relative z-10 space-y-3">
              <div className="inline-flex items-center gap-1.5 bg-blue-500/20 border border-blue-300/30 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black text-blue-200">
                <span className="material-symbols-outlined text-sm">vpn_key</span>
                <span>Ativação Individual de Especialidade</span>
              </div>
              
              <h1 className="text-2xl md:text-3xl font-black text-white leading-tight">
                {currentSpec ? (
                  <>
                    Ativação: <span className="text-blue-300">{currentSpec.title}</span>
                  </>
                ) : (
                  'Ativação de Especialidade'
                )}
              </h1>

              <p className="text-blue-100 text-xs md:text-sm leading-relaxed max-w-xl">
                Cada código de <strong>1.000 Kzs</strong> ativa <strong>exclusivamente 1 especialização</strong> por 2 semanas (14 dias). Para aceder a outra especialidade, deverá adquirir um novo código.
              </p>

              {alreadyUnlocked && (
                <div className="mt-2 bg-emerald-500/20 border border-emerald-400/40 rounded-2xl p-3 flex items-center gap-2 text-emerald-200 text-xs font-bold">
                  <span className="material-symbols-outlined text-base text-emerald-300">verified</span>
                  <span>Já possui esta especialidade liberada na sua conta!</span>
                </div>
              )}
            </div>

            <div className="absolute right-4 bottom-4 opacity-10 pointer-events-none">
              <span className="material-symbols-outlined text-9xl">school</span>
            </div>
          </div>

          {/* Specialization Selector Box */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 md:p-6 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                Especialidade que deseja ativar:
              </label>
              <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                1 Código = 1 Especialidade
              </span>
            </div>

            <select
              value={currentSpec?.id || ''}
              onChange={(e) => {
                const found = allSpecs.find((s) => s.id === e.target.value);
                setActiveSpec(found || null);
                if (onSelectSpecialization) onSelectSpecialization(found || null);
              }}
              className="w-full bg-slate-50 hover:bg-slate-100/70 border border-slate-300 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 cursor-pointer transition-all"
            >
              {allSpecs.map((s) => (
                <option key={s.id} value={s.id}>
                  🎓 {s.title} — {s.categoryName || 'Concurso'}
                </option>
              ))}
            </select>

            <p className="text-[11px] text-slate-500 font-medium pt-1">
              Certifique-se de que selecionou a especialidade correta para a qual comprou o código.
            </p>
          </div>

          {/* Video Preview Card */}
          <div className="relative rounded-3xl overflow-hidden aspect-video bg-slate-900 shadow-xl group cursor-pointer border border-slate-200">
            <div
              onClick={() => setShowVideoModal(true)}
              className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/20 transition-colors z-10"
            >
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                <span
                  className="material-symbols-outlined text-4xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  play_arrow
                </span>
              </div>
            </div>
            <img
              src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1000&q=80"
              alt="Como ativar seu código"
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-4 left-6 z-20">
              <span className="text-white text-xs font-semibold bg-black/50 backdrop-blur-md px-3.5 py-1.5 rounded-full">
                Como ativar seu código no NgolaTeste
              </span>
            </div>
          </div>

          {/* Instructions Box */}
          <div className="bg-white rounded-3xl p-6 md:p-8 space-y-6 shadow-sm border border-slate-200">
            <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600">info</span>
              Passo a Passo de Ativação
            </h3>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Step 1 */}
              <div className="flex gap-4">
                <div className="w-10 h-10 shrink-0 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-700 font-black text-sm shadow-xs">
                  1
                </div>
                <div className="text-sm text-slate-600 leading-relaxed">
                  Transferir <strong>1.000 Kzs</strong> pelo Multicaixa Express nº <strong>923361877</strong> ou por IBAN:{' '}
                  <span className="font-mono text-slate-900 font-bold block mt-1 bg-slate-100 px-2 py-1 rounded-lg text-xs">
                    0040 0000 9243 1578 1012 7
                  </span>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4">
                <div className="w-10 h-10 shrink-0 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-700 font-black text-sm shadow-xs">
                  2
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Enviar o comprovativo por WhatsApp indicando o seu número ({userProfile.phone || 'cadastrado'}) e a especialidade desejada (ex: {currentSpec?.title || 'Especialidade'}).
                </p>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4">
                <div className="w-10 h-10 shrink-0 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-700 font-black text-sm shadow-xs">
                  3
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Receba o código de ativação individual por WhatsApp e insira-o no formulário ao lado.
                </p>
              </div>

              {/* Step 4 */}
              <div className="flex gap-4">
                <div className="w-10 h-10 shrink-0 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-700 font-black text-sm shadow-xs">
                  4
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Acesso liberado de imediato para todos os simulados desta especialidade durante 14 dias.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Right Column: Code Entry Form */}
        <aside className="lg:col-span-5 lg:sticky lg:top-28">
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-blue-100 space-y-6">
            <div>
              <div className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full mb-2">
                <span className="material-symbols-outlined text-xs">vpn_key</span>
                <span>Validação de Acesso</span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-1">Inserir Código</h2>
              <p className="text-slate-500 text-xs leading-relaxed">
                {currentSpec
                  ? `Digite o código para desbloquear os simulados de "${currentSpec.title}".`
                  : 'Digite o código de ativação fornecido pela nossa equipe.'}
              </p>
            </div>

            {/* Target Spec Indicator */}
            {currentSpec && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <span className="material-symbols-outlined text-lg">{currentSpec.icon || 'school'}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                    Especialidade Selecionada
                  </span>
                  <p className="text-xs font-black text-slate-900 truncate">
                    {currentSpec.title}
                  </p>
                </div>
              </div>
            )}

            {feedback && (
              <div
                className={`p-4 rounded-2xl text-sm font-semibold flex items-start gap-2.5 ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                <span className="material-symbols-outlined text-lg shrink-0">
                  {feedback.type === 'success' ? 'check_circle' : 'error'}
                </span>
                <span className="text-xs md:text-sm leading-relaxed">{feedback.message}</span>
              </div>
            )}

            <form onSubmit={handleActivate} className="space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="activation_code"
                  className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block"
                >
                  Código de Ativação (12 Dígitos)
                </label>
                <div className="relative">
                  <input
                    id="activation_code"
                    type="text"
                    value={activationCode}
                    onChange={(e) => setActivationCode(e.target.value)}
                    placeholder="Ex: NGOLA-2025-ABCD"
                    className="w-full bg-slate-50 border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:bg-white focus:border-blue-500 rounded-2xl py-3.5 px-4 text-base font-mono font-black tracking-wider placeholder:tracking-normal placeholder:font-sans transition-all outline-none uppercase text-slate-900"
                  />
                  <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                    key
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 text-sm md:text-base"
              >
                <span>{isSubmitting ? 'A Validar Código...' : 'Ativar Esta Especialidade'}</span>
                <span className="material-symbols-outlined text-lg">rocket_launch</span>
              </button>

              <div className="relative py-1 flex items-center">
                <div className="flex-grow border-t border-slate-200" />
                <span className="flex-shrink mx-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Ainda não tem o código?
                </span>
                <div className="flex-grow border-t border-slate-200" />
              </div>

              <div className="space-y-3 text-center">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Adquira o código via WhatsApp por <strong>1.000 Kzs</strong> para esta especialidade.
                </p>

                <a
                  href={whatsAppLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md text-xs md:text-sm active:scale-[0.98]"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.319 1.592 5.548 0 10.061-4.512 10.063-10.062.001-2.69-1.048-5.219-2.953-7.127-1.905-1.907-4.432-2.956-7.125-2.957-5.548 0-10.061 4.512-10.063 10.062 0 2.115.57 3.593 1.658 5.485l-1.072 3.916 4.073-1.069z" />
                  </svg>
                  <span>Pedir Código no WhatsApp (1.000 Kz)</span>
                </a>
              </div>
            </form>
          </div>
        </aside>
      </div>

      {/* Video Modal Instructions */}
      {showVideoModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-lg text-slate-900">Vídeo Explicativo</h3>
              <button
                onClick={() => setShowVideoModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="aspect-video bg-slate-900 rounded-2xl flex items-center justify-center text-white text-center p-4">
              <div>
                <span className="material-symbols-outlined text-5xl text-blue-400 mb-2">play_circle</span>
                <p className="text-sm font-semibold">
                  1. Faça a transferência (1.000 Kzs)<br />
                  2. Envie o comprovante no WhatsApp com a especialidade<br />
                  3. Cole o código fornecido no campo ao lado
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowVideoModal(false)}
              className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

