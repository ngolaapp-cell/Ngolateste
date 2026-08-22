import React from 'react';
import { Screen } from '../types';

interface BottomNavProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
  unreadCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentScreen, onNavigate, unreadCount = 0 }) => {
  // Hide on exam view for focus mode
  if (currentScreen === 'exam') return null;

  return (
    <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-6 pt-3 bg-white/90 backdrop-blur-md z-50 rounded-t-3xl shadow-[0_-4px_32px_rgba(0,0,0,0.06)] border-t border-slate-200/20">
      {/* Home Button */}
      <button
        id="bottomnav-home-btn"
        onClick={() => onNavigate('home')}
        className={`flex flex-col items-center justify-center px-5 py-2 transition-all duration-200 cursor-pointer ${
          currentScreen === 'home'
            ? 'bg-blue-100/80 text-blue-600 rounded-2xl scale-95 font-bold'
            : 'text-slate-500 hover:text-blue-600 font-medium'
        }`}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontVariationSettings: currentScreen === 'home' ? "'FILL' 1" : "'FILL' 0" }}
        >
          home
        </span>
        <span className="text-xs mt-1">Início</span>
      </button>

      {/* Categorias Button */}
      <button
        id="bottomnav-categories-btn"
        onClick={() => onNavigate('categories')}
        className={`flex flex-col items-center justify-center px-5 py-2 transition-all duration-200 cursor-pointer ${
          currentScreen === 'categories'
            ? 'bg-blue-100/80 text-blue-600 rounded-2xl scale-95 font-bold'
            : 'text-slate-500 hover:text-blue-600 font-medium'
        }`}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontVariationSettings: currentScreen === 'categories' ? "'FILL' 1" : "'FILL' 0" }}
        >
          grid_view
        </span>
        <span className="text-xs mt-1">Categorias</span>
      </button>

      {/* Testes Button */}
      <button
        id="bottomnav-tests-btn"
        onClick={() => onNavigate('tests')}
        className={`flex flex-col items-center justify-center px-5 py-2 transition-all duration-200 cursor-pointer ${
          currentScreen === 'tests'
            ? 'bg-blue-100/80 text-blue-600 rounded-2xl scale-95 font-bold'
            : 'text-slate-500 hover:text-blue-600 font-medium'
        }`}
      >
        <span
          className="material-symbols-outlined"
          style={{ fontVariationSettings: currentScreen === 'tests' ? "'FILL' 1" : "'FILL' 0" }}
        >
          menu_book
        </span>
        <span className="text-xs mt-1">Testes</span>
      </button>

      {/* Perfil Button */}
      <button
        id="bottomnav-profile-btn"
        onClick={() => onNavigate('profile')}
        className={`flex flex-col items-center justify-center px-5 py-2 transition-all duration-200 cursor-pointer relative ${
          currentScreen === 'profile' || currentScreen === 'activation' || currentScreen === 'login'
            ? 'bg-blue-100/80 text-blue-600 rounded-2xl scale-95 font-bold'
            : 'text-slate-500 hover:text-blue-600 font-medium'
        }`}
        title={unreadCount > 0 ? `${unreadCount} nova(s) notificação(ões)` : 'Perfil de Usuário'}
      >
        <div className="relative inline-flex items-center justify-center">
          <span
            className="material-symbols-outlined"
            style={{
              fontVariationSettings:
                currentScreen === 'profile' || currentScreen === 'activation' || currentScreen === 'login'
                  ? "'FILL' 1"
                  : "'FILL' 0",
            }}
          >
            person
          </span>
          {unreadCount > 0 && (
            <span
              id="bottomnav-notification-badge"
              className="absolute -top-1.5 -right-2.5 min-w-[17px] h-[17px] px-1 bg-red-600 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-md animate-pulse z-10"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
        <span className="text-xs mt-1">Perfil</span>
      </button>
    </nav>
  );
};
