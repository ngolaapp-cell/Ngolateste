import React, { useState } from 'react';
import { Screen, Specialization, Category, UserProfile } from '../types';
import { SPECIALIZATIONS, HOME_CATEGORIES } from '../data/mockData';
import { WhatsAppBanner } from '../components/WhatsAppBanner';

interface CategoriesViewProps {
  categories?: Category[];
  selectedCategory?: Category | null;
  selectedSpecialization?: Specialization | null;
  specializations?: Specialization[];
  userProfile?: UserProfile;
  onNavigate: (screen: Screen) => void;
  onSelectCategory?: (category: Category | null) => void;
  onSelectSpecialization: (spec: Specialization) => void;
}

export const CategoriesView: React.FC<CategoriesViewProps> = ({
  categories = [],
  selectedCategory,
  selectedSpecialization,
  specializations = [],
  userProfile,
  onNavigate,
  onSelectCategory,
  onSelectSpecialization,
}) => {
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>(
    selectedCategory ? selectedCategory.id : 'all'
  );

  const displayCategories = categories;
  const allSpecs = specializations;

  const isSpecFree = (spec: Specialization) => {
    const parent = displayCategories.find(
      (c) =>
        (spec.categoryId && (c.id.toLowerCase() === spec.categoryId.toLowerCase() || c.name.toLowerCase() === spec.categoryId.toLowerCase())) ||
        (spec.categoryName && (c.name.toLowerCase() === spec.categoryName.toLowerCase() || c.id.toLowerCase() === spec.categoryName.toLowerCase()))
    );
    if (!parent) return false;
    const tag = (parent.statusTag || '').toUpperCase().trim();
    return tag === 'GRÁTIS' || tag === 'GRATIS' || tag === 'FREE';
  };

  const isSpecUnlocked = (spec: Specialization) => {
    if (isSpecFree(spec)) return true;
    if (!userProfile) return false;
    const activated = userProfile.activatedSpecializations || [];
    if (
      activated.includes(spec.id) ||
      activated.includes(spec.title) ||
      activated.some(
        (s) =>
          s.toLowerCase().trim() === spec.id.toLowerCase().trim() ||
          s.toLowerCase().trim() === spec.title.toLowerCase().trim()
      )
    ) {
      return true;
    }
    return false;
  };

  // Filter specializations based on active category
  const filteredSpecs = allSpecs.filter((spec) => {
    if (activeCategoryFilter === 'all') return true;
    
    // Match by categoryId or categoryName
    if (spec.categoryId === activeCategoryFilter) return true;

    const currentCatObj = displayCategories.find((c) => c.id === activeCategoryFilter);
    if (currentCatObj) {
      if (
        spec.categoryName &&
        spec.categoryName.toLowerCase().includes(currentCatObj.name.toLowerCase())
      ) {
        return true;
      }
      if (
        currentCatObj.name &&
        spec.description.toLowerCase().includes(currentCatObj.name.toLowerCase())
      ) {
        return true;
      }
    }
    return false;
  });

  // If filter produces no results (e.g., custom newly added category), fallback to allSpecs or mapped defaults
  const specsToRender = filteredSpecs.length > 0 ? filteredSpecs : allSpecs;

  const currentCategoryName =
    activeCategoryFilter === 'all'
      ? null
      : displayCategories.find((c) => c.id === activeCategoryFilter)?.name || selectedCategory?.name;

  const activeCategoryObj = activeCategoryFilter === 'all' ? null : displayCategories.find((c) => c.id === activeCategoryFilter);
  const isActiveCategoryFree = activeCategoryObj && (
    (activeCategoryObj.statusTag || '').toUpperCase() === 'GRÁTIS' ||
    (activeCategoryObj.statusTag || '').toUpperCase() === 'GRATIS' ||
    (activeCategoryObj.statusTag || '').toUpperCase() === 'FREE'
  );

  return (
    <div className="pt-24 pb-32 px-4 md:px-8 max-w-5xl mx-auto">
      {/* Header Section */}
      <header className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => onNavigate('home')}
            className="text-slate-500 hover:text-blue-600 transition-colors flex items-center text-xs font-bold gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            <span>Página Inicial</span>
          </button>
          {currentCategoryName && (
            <>
              <span className="text-slate-300">•</span>
              <span className="text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full text-xs font-bold border border-blue-200/60 flex items-center gap-1">
                <span>{currentCategoryName}</span>
                {isActiveCategoryFree && (
                  <span className="bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase">
                    Grátis
                  </span>
                )}
              </span>
            </>
          )}
        </div>

        <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-2">
          {currentCategoryName ? `Especializações: ${currentCategoryName}` : 'Especializações do Concurso'}
        </h2>
        <p className="text-slate-600 text-base md:text-lg leading-relaxed">
          {isActiveCategoryFree
            ? `🎉 Acesso 100% Gratuito! Todos os testes e simulados de ${currentCategoryName} estão liberados para todos os candidatos, sem necessidade de pagamento.`
            : currentCategoryName
            ? `Clique na especialização desejada do concurso de ${currentCategoryName} para aceder ou ativar com seu código.`
            : 'Cada especialidade possui um código de ativação individual (1.000 Kz por 2 semanas), exceto categorias marcadas como GRÁTIS.'}
        </p>
      </header>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none">
        <button
          onClick={() => {
            setActiveCategoryFilter('all');
            if (onSelectCategory) onSelectCategory(null);
          }}
          className={`px-4 py-2.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
            activeCategoryFilter === 'all'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <span className="material-symbols-outlined text-base">apps</span>
          <span>Todas Categorias</span>
        </button>

        {displayCategories.map((cat) => {
          const isCatFree =
            (cat.statusTag || '').toUpperCase() === 'GRÁTIS' ||
            (cat.statusTag || '').toUpperCase() === 'GRATIS' ||
            (cat.statusTag || '').toUpperCase() === 'FREE';

          return (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategoryFilter(cat.id);
                if (onSelectCategory) onSelectCategory(cat);
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                activeCategoryFilter === cat.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span className="material-symbols-outlined text-base">{cat.icon || 'school'}</span>
              <span>{cat.name}</span>
              {isCatFree && (
                <span className="bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                  Grátis
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Grid of Specializations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {specsToRender.map((spec) => {
          const isSelected = selectedSpecialization?.id === spec.id;
          const isFree = isSpecFree(spec);
          const unlocked = isSpecUnlocked(spec);

          return (
            <div
              key={spec.id}
              onClick={() => onSelectSpecialization(spec)}
              className={`group relative flex flex-col text-left rounded-3xl overflow-hidden cursor-pointer transition-all duration-300 shadow-sm border ${
                isSelected
                  ? 'bg-blue-50/90 border-blue-500 shadow-lg ring-2 ring-blue-500/30'
                  : isFree
                  ? 'bg-white border-emerald-300 hover:border-emerald-500 hover:shadow-xl hover:-translate-y-1'
                  : unlocked
                  ? 'bg-white border-emerald-200 hover:border-emerald-400 hover:shadow-xl hover:-translate-y-1'
                  : 'bg-white border-slate-200/80 hover:border-blue-400 hover:shadow-xl hover:-translate-y-1'
              }`}
            >
              {/* Header Image with Gradient */}
              <div className="h-36 w-full overflow-hidden relative">
                <img
                  src={spec.image}
                  alt={spec.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/85 via-slate-900/30 to-transparent" />
                
                {/* Category Name Tag */}
                {spec.categoryName && (
                  <span className="absolute top-3 left-4 bg-black/50 backdrop-blur-md text-white text-[10px] font-extrabold px-3 py-1 rounded-full border border-white/20 flex items-center gap-1">
                    <span>{spec.categoryName}</span>
                    {isFree && (
                      <span className="bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase">
                        Grátis
                      </span>
                    )}
                  </span>
                )}

                {/* Activation Status Badge */}
                <div className="absolute top-3 right-4">
                  {isFree ? (
                    <span className="bg-emerald-600/95 backdrop-blur-md text-white text-[11px] font-black px-3 py-1 rounded-full border border-emerald-300/50 shadow-md flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">savings</span>
                      <span>100% Grátis</span>
                    </span>
                  ) : unlocked ? (
                    <span className="bg-emerald-500/90 backdrop-blur-md text-white text-[11px] font-black px-3 py-1 rounded-full border border-emerald-300/40 shadow-sm flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">lock_open</span>
                      <span>Liberado</span>
                    </span>
                  ) : (
                    <span className="bg-amber-500/90 backdrop-blur-md text-white text-[11px] font-black px-3 py-1 rounded-full border border-amber-300/40 shadow-sm flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">lock</span>
                      <span>Requer Código</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Card Content */}
              <div className="p-6 pt-0 -mt-8 relative z-10 flex flex-col flex-grow">
                <div className="mb-3 flex items-center justify-between">
                  <div
                    className={`w-13 h-13 flex items-center justify-center rounded-2xl shadow-lg border ${
                      isFree
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : unlocked
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : isSelected
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-white text-blue-700 border-slate-100 group-hover:bg-blue-600 group-hover:text-white transition-colors'
                    }`}
                  >
                    <span className="material-symbols-outlined text-2xl">{spec.icon}</span>
                  </div>

                  <div
                    className={`flex items-center gap-1.5 font-bold text-xs px-3.5 py-1.5 rounded-xl transition-all shadow-sm ${
                      isFree
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : unlocked
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {unlocked ? 'arrow_forward' : 'vpn_key'}
                    </span>
                    <span>{isFree ? 'Aceder Módulos (Grátis)' : unlocked ? 'Aceder Módulos' : 'Ativar Especialidade'}</span>
                  </div>
                </div>

                <h3 className="text-xl font-extrabold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                  {spec.title}
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-4 flex-grow">
                  {spec.description}
                </p>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span className="flex items-center gap-1">
                    <span
                      className={`material-symbols-outlined text-sm ${
                        isFree ? 'text-emerald-600' : unlocked ? 'text-emerald-600' : 'text-amber-500'
                      }`}
                    >
                      {isFree ? 'savings' : unlocked ? 'verified' : 'info'}
                    </span>
                    <span>{isFree ? 'Acesso 100% Gratuito' : unlocked ? 'Testes e Módulos Liberados' : '1.000 Kz por 2 semanas'}</span>
                  </span>
                  <span
                    className={`font-extrabold group-hover:underline flex items-center gap-0.5 ${
                      isFree ? 'text-emerald-600' : unlocked ? 'text-emerald-600' : 'text-blue-600'
                    }`}
                  >
                    {unlocked ? 'Abrir Exames →' : 'Inserir Código →'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* WhatsApp Banner */}
      <WhatsAppBanner />
    </div>
  );
};
