import React from 'react';
import { Screen, UserProfile } from '../types';

interface ProfileViewProps {
  userProfile: UserProfile;
  onNavigate: (screen: Screen) => void;
  onLogout: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  userProfile,
  onNavigate,
  onLogout,
}) => {
  return (
    <div className="pt-24 pb-32 px-4 md:px-8 max-w-3xl mx-auto space-y-6">
      {/* Header Profile Card */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200/80 space-y-6">
        <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
          <div className="w-20 h-20 bg-blue-100 rounded-3xl flex items-center justify-center text-blue-600 text-3xl font-bold shrink-0">
            <span className="material-symbols-outlined text-4xl">account_circle</span>
          </div>

          <div className="space-y-1 flex-1">
            <h2 className="text-2xl font-black text-slate-900">{userProfile.name}</h2>
            <p className="text-slate-500 text-sm font-medium">{userProfile.phone}</p>
            <p className="text-slate-400 text-xs">{userProfile.email}</p>
          </div>

          <button
            onClick={() => onNavigate('activation')}
            className={`px-4 py-2.5 rounded-full text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-sm ${
              userProfile.isBlocked
                ? 'bg-red-100 text-red-900 border border-red-300'
                : (userProfile.activatedSpecializations && userProfile.activatedSpecializations.length > 0)
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-amber-100 text-amber-900 border border-amber-300'
            }`}
          >
            <span className="material-symbols-outlined text-sm">
              {userProfile.isBlocked ? 'block' : (userProfile.activatedSpecializations && userProfile.activatedSpecializations.length > 0) ? 'verified' : 'vpn_key'}
            </span>
            <span>
              {userProfile.isBlocked
                ? 'Conta Bloqueada'
                : (userProfile.activatedSpecializations && userProfile.activatedSpecializations.length > 0)
                ? `${userProfile.activatedSpecializations.length} Especialidade(s) Ativa(s)`
                : 'Nenhuma Especialidade Ativa'}
            </span>
          </button>
        </div>

        {/* Activated Specializations List */}
        {userProfile.activatedSpecializations && userProfile.activatedSpecializations.length > 0 && (
          <div className="bg-emerald-50/80 rounded-2xl p-4 border border-emerald-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-emerald-600">verified</span>
                Especializações Ativadas (Acesso Válido)
              </span>
              {userProfile.expiresAt && (
                <span className="text-[11px] font-bold text-emerald-700 bg-white px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Expira: {userProfile.expiresAt}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {userProfile.activatedSpecializations.map((specName, idx) => (
                <span
                  key={idx}
                  className="bg-white text-slate-800 border border-emerald-300 font-extrabold text-xs px-3 py-1.5 rounded-xl shadow-xs flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm text-emerald-600">school</span>
                  {specName}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-emerald-800 font-medium pt-1">
              Para adicionar mais especializações, use o botão "Ativar Código de Acesso" abaixo.
            </p>
          </div>
        )}

        {/* Blocked Notice */}
        {userProfile.isBlocked && (
          <div className="bg-red-50 rounded-2xl p-5 border border-red-200 space-y-2 text-red-950">
            <div className="flex items-center gap-2 text-red-700 font-bold text-sm">
              <span className="material-symbols-outlined text-xl">block</span>
              <span>Acesso Suspenso por Comportamento Irregular</span>
            </div>
            <p className="text-xs text-red-800 leading-relaxed">
              O seu acesso aos simulados e exames do NgolaTeste foi bloqueado temporariamente pelo administrador.
              {userProfile.blockedReason && (
                <span className="block mt-1 font-semibold">
                  Motivo: {userProfile.blockedReason}
                </span>
              )}
            </p>
            <div className="pt-2">
              <a
                href="https://wa.me/244923361877?text=Ol%C3%A1%2C%20a%20minha%20conta%20no%20NgolaTeste%20est%C3%A1%20bloqueada%20e%20gostaria%20de%20esclarecimentos."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                <span className="material-symbols-outlined text-sm">support_agent</span>
                <span>Falar com o Suporte</span>
              </a>
            </div>
          </div>
        )}

        {/* Activation Banner inside Profile if not blocked */}
        {!userProfile.isBlocked && (
          <div className="bg-blue-50/90 rounded-2xl p-5 border border-blue-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="font-bold text-slate-900 text-sm">
                Ativar Nova Especialidade (1.000 Kzs por 14 dias)
              </h4>
              <p className="text-xs text-slate-600">
                Cada código desbloqueia exclusivamente 1 especialidade selecionada.
              </p>
            </div>
            <button
              onClick={() => onNavigate('activation')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
            >
              Ativar Especialidade
            </button>
          </div>
        )}
      </div>

      {/* User Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm text-center">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Meta Diária
          </span>
          <span className="text-2xl font-black text-slate-900">
            {userProfile.dailyCompletedQuestions} / {userProfile.dailyGoalQuestions}
          </span>
          <p className="text-[11px] text-blue-600 font-bold mt-1">40% concluído</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm text-center">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Simulados Feitos
          </span>
          <span className="text-2xl font-black text-blue-600">
            {userProfile.totalTestsTaken}
          </span>
          <p className="text-[11px] text-slate-500 font-medium mt-1">Todas categorias</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm text-center">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Média de Acertos
          </span>
          <span className="text-2xl font-black text-emerald-600">
            {userProfile.averageScore}%
          </span>
          <p className="text-[11px] text-emerald-600 font-bold mt-1">Acima da Média</p>
        </div>
      </div>

      {/* Menu Options List */}
      <div className="bg-white rounded-3xl p-3 border border-slate-200/80 shadow-sm divide-y divide-slate-100">
        <button
          onClick={() => onNavigate('activation')}
          className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors rounded-2xl cursor-pointer text-left"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
              <span className="material-symbols-outlined text-xl">vpn_key</span>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Ativar Código de Acesso</p>
              <p className="text-xs text-slate-500">Valide seu código de 12 dígitos por 1000 Kzs</p>
            </div>
          </div>
          <span className="material-symbols-outlined text-slate-400">chevron_right</span>
        </button>

        <button
          onClick={() => onNavigate('tests')}
          className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors rounded-2xl cursor-pointer text-left"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
              <span className="material-symbols-outlined text-xl">history</span>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Histórico de Simulados</p>
              <p className="text-xs text-slate-500">Veja seu histórico de exames anteriores</p>
            </div>
          </div>
          <span className="material-symbols-outlined text-slate-400">chevron_right</span>
        </button>

        <button
          onClick={() => onNavigate('admin')}
          className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors rounded-2xl cursor-pointer text-left"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-100 text-purple-700 rounded-xl">
              <span className="material-symbols-outlined text-xl">admin_panel_settings</span>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Painel do Administrador</p>
              <p className="text-xs text-slate-500">Gerir questões e criar novos códigos de ativação</p>
            </div>
          </div>
          <span className="material-symbols-outlined text-slate-400">chevron_right</span>
        </button>

        <button
          onClick={onLogout}
          className="w-full p-4 flex items-center justify-between hover:bg-red-50 transition-colors rounded-2xl cursor-pointer text-left text-red-600"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-100 text-red-600 rounded-xl">
              <span className="material-symbols-outlined text-xl">logout</span>
            </div>
            <div>
              <p className="text-sm font-bold">Sair da Conta</p>
              <p className="text-xs text-red-400">Terminar sessão no NgolaTeste</p>
            </div>
          </div>
          <span className="material-symbols-outlined text-red-400">chevron_right</span>
        </button>
      </div>
    </div>
  );
};
