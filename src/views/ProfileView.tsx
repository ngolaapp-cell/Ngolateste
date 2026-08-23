import React, { useState, useEffect } from 'react';
import { Screen, UserProfile, AdminAnnouncement } from '../types';
import { fetchAdminAnnouncements } from '../services/supabaseService';

interface ProfileViewProps {
  userProfile: UserProfile;
  onNavigate: (screen: Screen) => void;
  onLogout: () => void;
  announcements?: AdminAnnouncement[];
  unreadCount?: number;
  readIds?: string[];
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onRefreshAnnouncements?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  userProfile,
  onNavigate,
  onLogout,
  announcements: propAnnouncements,
  unreadCount: propUnreadCount,
  readIds: propReadIds,
  onMarkAsRead: propOnMarkAsRead,
  onMarkAllAsRead: propOnMarkAllAsRead,
  onRefreshAnnouncements,
}) => {
  const [localAnnouncements, setLocalAnnouncements] = useState<AdminAnnouncement[]>([]);
  const [localReadIds, setLocalReadIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`ngola_read_ann_${userProfile.phone}`);
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });
  const [currentAnnIndex, setCurrentAnnIndex] = useState(0);

  useEffect(() => {
    if (!propAnnouncements) {
      fetchAdminAnnouncements().then((data) => {
        if (data && data.length > 0) {
          setLocalAnnouncements(data);
        }
      });
    }
  }, [propAnnouncements]);

  const activeAnnouncementsList = propAnnouncements || localAnnouncements;
  const activeReadIds = propReadIds || localReadIds;

  // Filter announcements addressed to this user (Always persistent, cannot be deleted/dismissed by user)
  const userAnnouncements = activeAnnouncementsList.filter((a) => {
    if (!a.active) return false;
    if (a.targetType === 'all') return true;
    if ((a.targetType === 'single' || a.targetType === 'selected') && a.targetPhones) {
      const uPhone = userProfile.phone.trim();
      const uEmail = (userProfile.email || '').trim().toLowerCase();
      return a.targetPhones.some(
        (p) => p.trim() === uPhone || (uEmail && p.trim().toLowerCase() === uEmail)
      );
    }
    return false;
  });

  const activeAnnouncement = userAnnouncements[currentAnnIndex] || userAnnouncements[0] || null;
  const isCurrentUnread = activeAnnouncement ? !activeReadIds.includes(activeAnnouncement.id) : false;
  const totalUnreadCount = propUnreadCount !== undefined
    ? propUnreadCount
    : userAnnouncements.filter((a) => !activeReadIds.includes(a.id)).length;

  const handleToggleReadStatus = (id: string) => {
    if (activeReadIds.includes(id)) {
      // Mark as unread
      const updated = activeReadIds.filter((x) => x !== id);
      setLocalReadIds(updated);
      try {
        localStorage.setItem(`ngola_read_ann_${userProfile.phone}`, JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('ngola_announcements_updated'));
      } catch (_) {}
    } else {
      // Mark as read
      if (propOnMarkAsRead) {
        propOnMarkAsRead(id);
      } else {
        const updated = [...localReadIds, id];
        setLocalReadIds(updated);
        try {
          localStorage.setItem(`ngola_read_ann_${userProfile.phone}`, JSON.stringify(updated));
          window.dispatchEvent(new CustomEvent('ngola_announcements_updated'));
        } catch (_) {}
      }
    }
  };

  const handleMarkAllRead = () => {
    if (propOnMarkAllAsRead) {
      propOnMarkAllAsRead();
    } else {
      const allIds = userAnnouncements.map((a) => a.id);
      const updated = Array.from(new Set([...localReadIds, ...allIds]));
      setLocalReadIds(updated);
      try {
        localStorage.setItem(`ngola_read_ann_${userProfile.phone}`, JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('ngola_announcements_updated'));
      } catch (_) {}
    }
  };

  const handleActionClick = (url?: string) => {
    if (!url) return;
    const trimmed = url.trim();
    const knownScreens: Screen[] = ['home', 'categories', 'tests', 'exam', 'result', 'activation', 'login', 'profile', 'admin'];
    if (knownScreens.includes(trimmed as Screen)) {
      onNavigate(trimmed as Screen);
      return;
    }
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('wa.me')) {
      const fullUrl = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
      window.open(fullUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    onNavigate('categories');
  };

  // Helper to extract embeddable video URL (YouTube, Vimeo, etc.)
  const getEmbedVideoUrl = (url?: string): string | null => {
    if (!url) return null;
    const trimmed = url.trim();
    // YouTube Watch or Shorts or standard share
    const ytMatch = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch && ytMatch[1]) {
      return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=0&rel=0`;
    }
    // Vimeo
    const vimeoMatch = trimmed.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch && vimeoMatch[1]) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }
    return null;
  };

  return (
    <div className="pt-24 pb-32 px-4 md:px-8 max-w-3xl mx-auto space-y-6">
      {/* Notifications Alert Banner (When unread notifications exist) */}
      {totalUnreadCount > 0 && (
        <div
          id="profile-unread-notifications-banner"
          className="bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-2xl p-4 shadow-md flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 animate-bounce">
              <span className="material-symbols-outlined text-white text-xl">notifications_active</span>
            </div>
            <div>
              <h3 className="font-black text-sm tracking-wide">
                {totalUnreadCount === 1
                  ? 'Você tem 1 nova notificação do Administrador'
                  : `Você tem ${totalUnreadCount} novas notificações do Administrador`}
              </h3>
              <p className="text-xs text-white/80">
                Consulte os comunicados oficiais e orientações abaixo. O ícone do app na tela do seu telefone agora exibe o contador com o número ({totalUnreadCount}).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted' && (
              <button
                id="enable-device-notifications-btn"
                type="button"
                onClick={async () => {
                  try {
                    const res = await Notification.requestPermission();
                    if (res === 'granted') {
                      alert('Notificações no telefone e no ícone do aplicativo ativadas com sucesso!');
                    }
                  } catch (_) {}
                }}
                className="w-full sm:w-auto px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                title="Ativar notificações no telefone"
              >
                <span className="material-symbols-outlined text-sm">notifications</span>
                <span>Permitir Alertas</span>
              </button>
            )}

            <button
              id="mark-all-read-btn"
              type="button"
              onClick={handleMarkAllRead}
              className="w-full sm:w-auto px-3.5 py-1.5 bg-white text-red-700 hover:bg-red-50 text-xs font-black rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 flex-shrink-0"
            >
              <span className="material-symbols-outlined text-sm">done_all</span>
              <span>Marcar Todas como Lidas</span>
            </button>
          </div>
        </div>
      )}

      {/* Header Profile Card */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200/80 space-y-6">
        <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
          <div className="relative">
            <div className="w-20 h-20 bg-blue-100 rounded-3xl flex items-center justify-center text-blue-600 text-3xl font-bold shrink-0">
              <span className="material-symbols-outlined text-4xl">account_circle</span>
            </div>
            {totalUnreadCount > 0 && (
              <span
                id="profile-avatar-badge"
                className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1 bg-red-600 text-white text-xs font-black rounded-full flex items-center justify-center border-2 border-white shadow-md animate-pulse"
                title={`${totalUnreadCount} notificação(ões)`}
              >
                {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
              </span>
            )}
          </div>

          <div className="space-y-1 flex-1">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h2 className="text-2xl font-black text-slate-900">{userProfile.name}</h2>
              {totalUnreadCount > 0 && (
                <span className="px-2 py-0.5 bg-red-100 text-red-700 font-bold text-[10px] rounded-full border border-red-200">
                  {totalUnreadCount} {totalUnreadCount === 1 ? 'Nova Mensagem' : 'Novas Mensagens'}
                </span>
              )}
            </div>
            <p className="text-slate-500 text-sm font-medium">{userProfile.phone}</p>
            <p className="text-slate-400 text-xs">{userProfile.email}</p>
          </div>

          <button
            id="profile-activate-spec-btn"
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

        {/* Admin Announcement / Notification / Message Zone */}
        {!userProfile.isBlocked && activeAnnouncement ? (
          <div
            id="profile-active-announcement-card"
            className={`rounded-2xl p-5 border shadow-sm space-y-4 relative overflow-hidden transition-all ${
              isCurrentUnread
                ? 'bg-gradient-to-br from-blue-50/95 via-indigo-50/80 to-blue-50/95 border-blue-300 ring-2 ring-blue-400/30'
                : 'bg-slate-50/80 border-slate-200'
            }`}
          >
            {/* Header / Badge row */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 text-white rounded-lg text-[11px] font-black tracking-wide uppercase shadow-xs ${
                    isCurrentUnread ? 'bg-blue-600' : 'bg-slate-700'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">
                    {activeAnnouncement.type === 'video' ? 'smart_display' : activeAnnouncement.type === 'image' ? 'photo_camera' : 'campaign'}
                  </span>
                  <span>{activeAnnouncement.badge || 'COMUNICADO ADM'}</span>
                </span>

                {isCurrentUnread ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-black border border-red-200 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-red-600"></span>
                    NÃO LIDA
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold border border-emerald-200">
                    <span className="material-symbols-outlined text-[12px]">done</span>
                    Lida
                  </span>
                )}

                {userAnnouncements.length > 1 && (
                  <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-slate-200 text-[11px] font-bold text-blue-700 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setCurrentAnnIndex((prev) => (prev > 0 ? prev - 1 : userAnnouncements.length - 1))}
                      className="hover:text-blue-950 px-1 cursor-pointer"
                      title="Anterior"
                    >
                      ◀
                    </button>
                    <span>{currentAnnIndex + 1} de {userAnnouncements.length}</span>
                    <button
                      type="button"
                      onClick={() => setCurrentAnnIndex((prev) => (prev < userAnnouncements.length - 1 ? prev + 1 : 0))}
                      className="hover:text-blue-950 px-1 cursor-pointer"
                      title="Próximo"
                    >
                      ▶
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {/* Mark as read / unread toggle button */}
                <button
                  type="button"
                  onClick={() => handleToggleReadStatus(activeAnnouncement.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border shadow-2xs ${
                    isCurrentUnread
                      ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                  title={isCurrentUnread ? 'Marcar como lida' : 'Marcar como não lida'}
                >
                  <span className="material-symbols-outlined text-sm">
                    {isCurrentUnread ? 'check_circle' : 'mark_chat_unread'}
                  </span>
                  <span>{isCurrentUnread ? 'Marcar como lida' : 'Lida'}</span>
                </button>
              </div>
            </div>

            {/* Title & Body */}
            <div className="space-y-2">
              <h4 className="font-extrabold text-slate-900 text-base leading-snug">
                {activeAnnouncement.title}
              </h4>
              
              {activeAnnouncement.content && (
                <p className="text-xs md:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {activeAnnouncement.content}
                </p>
              )}
            </div>

            {/* Media Rendering: Image or Video with 1080 × 1350 px (4:5) mobile aspect ratio */}
            {activeAnnouncement.type === 'image' && activeAnnouncement.mediaUrl && (
              <div className="rounded-2xl overflow-hidden border border-blue-200/80 bg-slate-950 shadow-md w-full max-w-md mx-auto aspect-[4/5] relative">
                <img
                  src={activeAnnouncement.mediaUrl}
                  alt={activeAnnouncement.title}
                  className="w-full h-full object-cover rounded-2xl"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            )}

            {activeAnnouncement.type === 'video' && activeAnnouncement.mediaUrl && (
              <div className="rounded-2xl overflow-hidden border border-blue-200/80 bg-black shadow-md w-full max-w-md mx-auto aspect-[4/5] relative flex items-center justify-center">
                {getEmbedVideoUrl(activeAnnouncement.mediaUrl) ? (
                  <iframe
                    src={getEmbedVideoUrl(activeAnnouncement.mediaUrl)!}
                    title={activeAnnouncement.title}
                    className="w-full h-full border-0 rounded-2xl"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    src={activeAnnouncement.mediaUrl}
                    controls
                    className="w-full h-full object-cover rounded-2xl"
                  />
                )}
              </div>
            )}

            {/* Navigation footer between notifications when multiple exist */}
            {userAnnouncements.length > 1 && (
              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setCurrentAnnIndex((prev) => (prev > 0 ? prev - 1 : userAnnouncements.length - 1))}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                >
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                  <span>Notificação Anterior</span>
                </button>

                <span className="text-[11px] font-extrabold text-blue-700 bg-blue-100/70 px-2.5 py-1 rounded-full">
                  {currentAnnIndex + 1} de {userAnnouncements.length}
                </span>

                <button
                  type="button"
                  onClick={() => setCurrentAnnIndex((prev) => (prev < userAnnouncements.length - 1 ? prev + 1 : 0))}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 flex items-center gap-1 cursor-pointer transition-all shadow-2xs"
                >
                  <span>Próxima Notificação</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            )}

            {/* Action Call to Action Button */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              {activeAnnouncement.actionText ? (
                <button
                  type="button"
                  onClick={() => {
                    if (isCurrentUnread) handleToggleReadStatus(activeAnnouncement.id);
                    handleActionClick(activeAnnouncement.actionUrl);
                  }}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>{activeAnnouncement.actionText}</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (isCurrentUnread) handleToggleReadStatus(activeAnnouncement.id);
                    onNavigate('activation');
                  }}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Ativar Especialidade</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              )}

              <span className="text-[11px] text-slate-500 font-medium">
                NgolaTeste • Atualizações Oficiais
              </span>
            </div>
          </div>
        ) : !userProfile.isBlocked ? (
          /* Default Activation Banner if no announcement */
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
        ) : null}
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

