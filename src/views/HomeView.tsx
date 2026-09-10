import React, { useMemo } from 'react';
import { Screen, Category, UserProfile } from '../types';
import { HOME_CATEGORIES } from '../data/mockData';
import { WhatsAppBanner } from '../components/WhatsAppBanner';
import { CategoryCarousel } from '../components/CategoryCarousel';
import { checkIsCategoryFree, isFreeStatusTag, isCategoryNew, isCategoryComingSoon } from '../utils/accessControl';

interface HomeViewProps {
  categories?: Category[];
  userProfile?: UserProfile;
  isLoading?: boolean;
  onNavigate: (screen: Screen) => void;
  onSelectCategory?: (category: Category) => void;
  onStartExam: (categoryId?: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  categories = [],
  userProfile,
  isLoading = false,
  onNavigate,
  onSelectCategory,
  onStartExam,
}) => {
  const displayCategories = categories;
  const isActivated = userProfile?.isActivated;

  // Prioritize "NOVO" categories in display order
  const sortedCategories = useMemo(() => {
    return [...displayCategories].sort((a, b) => {
      const aNew = (a.statusTag || '').toUpperCase() === 'NOVO';
      const bNew = (b.statusTag || '').toUpperCase() === 'NOVO';
      if (aNew && !bNew) return -1;
      if (!aNew && bNew) return 1;
      return 0;
    });
  }, [displayCategories]);

  const isCategoryFree = (catIdOrName?: string) => {
    if (!catIdOrName) return false;
    const clean = catIdOrName.toLowerCase().trim();
    const cat = displayCategories.find(
      (c) =>
        c.id.toLowerCase().trim() === clean ||
        c.name.toLowerCase().trim() === clean ||
        c.name.toLowerCase().includes(clean) ||
        clean.includes(c.name.toLowerCase())
    );
    if (!cat) return false;
    return checkIsCategoryFree(cat, displayCategories);
  };

  const handleStartSimulado = (catOrSubject?: string) => {
    const isFree = isCategoryFree(catOrSubject);
    if (!isActivated && !isFree) {
      onNavigate('activation');
      return;
    }
    onStartExam(catOrSubject);
  };

  return (
    <div className="pt-24 pb-32 px-4 md:px-8 max-w-7xl mx-auto">
      {/* Dynamic Featured / New Categories Carousel */}
      {sortedCategories.length > 0 ? (
        <CategoryCarousel
          categories={sortedCategories}
          isActivated={isActivated}
          onNavigate={onNavigate}
          onSelectCategory={onSelectCategory}
          onStartExam={onStartExam}
        />
      ) : isLoading ? (
        <div className="w-full h-64 md:h-72 rounded-3xl bg-slate-200/80 animate-pulse mb-8" />
      ) : null}

      {/* Categories Grid */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Categorias de Concursos</h2>
            <span className="text-xs text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded-full">
              {sortedCategories.length} categorias
            </span>
          </div>
          <button
            onClick={() => onNavigate('categories')}
            className="text-blue-600 font-bold text-sm hover:underline flex items-center gap-1 cursor-pointer"
          >
            Ver Todas
            <span className="material-symbols-outlined text-sm">chevron_right</span>
          </button>
        </div>

        {sortedCategories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {sortedCategories.map((cat) => {
              const isNovo = (cat.statusTag || '').toUpperCase() === 'NOVO';
              const isGratis = isFreeStatusTag(cat.statusTag);
              const isEmBreve = isCategoryComingSoon(cat);
              const isLiberado = !isNovo && !isGratis && !isEmBreve;

              return (
                <div
                  key={cat.id}
                  onClick={() => {
                    if (isEmBreve) {
                      alert('Em breve aguardando exames. Esta categoria está em preparação pedagógica.');
                      return;
                    }
                    if (onSelectCategory) {
                      onSelectCategory(cat);
                    } else {
                      onNavigate('categories');
                    }
                  }}
                  className={`bg-white rounded-3xl overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col border cursor-pointer relative ${
                    isNovo
                      ? 'border-amber-400 ring-2 ring-amber-400/40 shadow-lg shadow-amber-500/10'
                      : isGratis
                      ? 'border-emerald-300/80 shadow-sm'
                      : 'border-slate-200/60'
                  }`}
                >
                  {isNovo && (
                    <div className="absolute top-3 right-3 z-20 bg-amber-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-md flex items-center gap-1 border border-amber-300">
                      <span className="material-symbols-outlined text-xs">star</span>
                      <span>DESTAQUE</span>
                    </div>
                  )}

                  <div className="h-32 w-full relative overflow-hidden">
                    <img
                      src={cat.image}
                      alt={cat.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
                    <div className="absolute bottom-3 left-4 text-white flex items-center gap-2">
                      <span className="material-symbols-outlined text-2xl">{cat.icon}</span>
                      {isGratis && (
                        <span className="bg-emerald-600 border border-emerald-300 text-white backdrop-blur-sm text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">savings</span>
                          <span>100% GRÁTIS</span>
                        </span>
                      )}
                      {isNovo && (
                        <span className="bg-amber-500 text-white backdrop-blur-sm text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1 border border-amber-300">
                          <span className="material-symbols-outlined text-xs">vpn_key</span>
                          <span>NOVO (REQUER SENHA)</span>
                        </span>
                      )}
                      {isEmBreve && (
                        <span className="bg-slate-600 text-slate-100 backdrop-blur-sm text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1 border border-slate-400">
                          <span className="material-symbols-outlined text-xs">schedule</span>
                          <span>EM BREVE</span>
                        </span>
                      )}
                      {isLiberado && (
                        <span className="bg-blue-600 text-white backdrop-blur-sm text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1 border border-blue-400">
                          <span className="material-symbols-outlined text-xs">lock_clock</span>
                          <span>LIBERADO (3 GRÁTIS)</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-5 flex flex-col flex-grow">
                    <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center justify-between">
                      <span>{cat.name}</span>
                      {isNovo && (
                        <span className="text-[10px] font-extrabold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                          Destaque
                        </span>
                      )}
                    </h3>
                    <p className="text-slate-500 text-xs leading-relaxed mb-4 line-clamp-2">
                      {cat.description}
                    </p>
                    <div className="mt-auto flex items-center justify-between text-xs font-bold pt-2 border-t border-slate-100">
                      <span className={isGratis ? 'text-emerald-600' : isEmBreve ? 'text-slate-500' : isNovo ? 'text-amber-600' : 'text-blue-600'}>
                        {isGratis ? '100% Grátis' : isEmBreve ? 'Aguardando Exames' : isNovo ? 'Requer Senha de Ativação' : '3 Simulações Grátis'}
                      </span>
                      <div className="flex items-center text-blue-600 group-hover:gap-1.5 transition-all">
                        <span>{isEmBreve ? 'Ver Detalhes' : 'Ver Especializações'}</span>
                        <span className="material-symbols-outlined text-xs">arrow_forward</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="bg-white rounded-3xl h-56 border border-slate-200/60 animate-pulse p-4 flex flex-col justify-between">
                <div className="h-28 bg-slate-200 rounded-2xl w-full" />
                <div className="h-4 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-8 text-center border border-slate-200">
            <p className="text-slate-500 text-sm">Nenhuma categoria encontrada no banco de dados.</p>
          </div>
        )}
      </section>

      {/* Progress Card Section */}
      <section className="mb-10 bg-white rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-sm border border-slate-200/60">
        <div className="relative z-10 max-w-xl">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">
            Seu Desempenho
          </span>
          <h2 className="text-2xl font-bold text-slate-900 mt-2 mb-2">
            Progresso do Dia
          </h2>
          <p className="text-slate-600 text-sm mb-6 leading-relaxed">
            Você completou <strong className="text-slate-900 font-semibold">12 de 30 questões</strong> da sua meta diária de Administração.
          </p>
          <div className="w-full bg-slate-100 h-3 rounded-full mb-6 overflow-hidden">
            <div className="bg-blue-600 h-full w-[40%] rounded-full transition-all duration-500" />
          </div>
          <button
            onClick={() => handleStartSimulado('administracao')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <span>Continuar Estudando</span>
            <span className="material-symbols-outlined text-sm">play_arrow</span>
          </button>
        </div>
      </section>

      {/* WhatsApp Banner */}
      <WhatsAppBanner />

      {/* Floating Action Button (FAB) */}
      <div className="fixed right-6 bottom-24 md:bottom-12 z-40">
        <button
          onClick={() => handleStartSimulado('rapido')}
          className="w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer group"
          title="Simulado Rápido"
        >
          <span className="material-symbols-outlined text-2xl group-hover:rotate-12 transition-transform">
            edit_note
          </span>
        </button>
      </div>
    </div>
  );
};
