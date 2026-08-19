import React from 'react';
import { Screen } from '../types';

interface BottomNavProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentScreen, onNavigate }) => {
  // Hide on exam view for focus mode
  if (currentScreen === 'exam') return null;

  return (
    <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-6 pt-3 bg-white/90 backdrop-blur-md z-50 rounded-t-3xl shadow-[0_-4px_32px_rgba(0,0,0,0.06)] border-t border-slate-200/20">
      {/* Home Button */}
      <button
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
        onClick={() => onNavigate('profile')}
        className={`flex flex-col items-center justify-center px-5 py-2 transition-all duration-200 cursor-pointer ${
          currentScreen === 'profile' || currentScreen === 'activation' || currentScreen === 'login'
            ? 'bg-blue-100/80 text-blue-600 rounded-2xl scale-95 font-bold'
            : 'text-slate-500 hover:text-blue-600 font-medium'
        }`}
      >
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
        <span className="text-xs mt-1">Perfil</span>
      </button>
    </nav>
  );
};
