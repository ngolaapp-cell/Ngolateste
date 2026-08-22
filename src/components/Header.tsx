import React from 'react';
import { Screen } from '../types';
import { OFFICIAL_LOGO_URL } from '../config/brand';
import { TransparentLogo } from './TransparentLogo';

interface HeaderProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
  onBack?: () => void;
  showBack?: boolean;
  showSearch?: boolean;
  onSearchClick?: () => void;
  title?: string;
  unreadCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  onNavigate,
  onBack,
  showBack = false,
  showSearch = false,
  onSearchClick,
  unreadCount = 0,
}) => {
  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-[#F0F7FF]/80 backdrop-blur-md flex justify-between items-center px-6 py-4 border-b border-blue-50">
      <div className="flex items-center gap-4">
        {showBack ? (
          <button
            id="header-back-btn"
            onClick={onBack || (() => onNavigate('home'))}
            className="p-2 rounded-full text-blue-700 hover:bg-blue-100/50 transition-colors active:scale-95 duration-150 flex items-center justify-center cursor-pointer"
            aria-label="Voltar"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
        ) : null}

        <button
          id="header-brand-logo-btn"
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2.5 text-left cursor-pointer group"
        >
          <div className="w-10 h-10 flex items-center justify-center group-hover:scale-105 transition-transform">
            <TransparentLogo
              src={OFFICIAL_LOGO_URL}
              alt="NgolaTeste Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Ngola<span className="text-blue-600">Teste</span>
          </h1>
        </button>
      </div>

      <div className="flex items-center gap-2">
        {showSearch && (
          <button
            id="header-search-btn"
            onClick={onSearchClick}
            className="p-2 rounded-full text-slate-600 hover:bg-slate-200/50 transition-colors cursor-pointer"
            aria-label="Pesquisar"
          >
            <span className="material-symbols-outlined">search</span>
          </button>
        )}

        <button
          id="header-profile-btn"
          onClick={() => onNavigate('profile')}
          className="p-2 rounded-full text-blue-700 hover:bg-blue-100/50 transition-colors active:scale-95 duration-150 flex items-center justify-center cursor-pointer relative"
          aria-label="Perfil de Usuário"
          title={unreadCount > 0 ? `${unreadCount} nova(s) notificação(ões)` : 'Perfil de Usuário'}
        >
          <span className="material-symbols-outlined text-2xl">account_circle</span>
          {unreadCount > 0 && (
            <span
              id="header-notification-badge"
              className="absolute -top-0.5 -right-0.5 min-w-[19px] h-[19px] px-1 bg-red-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-md animate-pulse z-10"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
