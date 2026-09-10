import React, { useState } from 'react';
import { Screen, Specialization, Category, UserProfile } from '../types';
import { SPECIALIZATIONS, HOME_CATEGORIES } from '../data/mockData';
import { WhatsAppBanner } from '../components/WhatsAppBanner';
import {
  checkIsCategoryFree,
  checkIsSpecializationFree,
  checkIsSpecializationUnlocked,
  evaluateCategoryAccess,
  isCategoryNew,
  isCategoryComingSoon,
  isFreeStatusTag,
} from '../utils/accessControl';
import { isUserSubscriptionExpired } from '../utils/dateUtils';

interface CategoriesViewProps {
  categories?: Category[];
  selectedCategory?: Category | null;
  selectedSpecialization?: Specialization | null;
  specializations?: Specialization[];
  userProfile?: UserProfile;
  onNavigate: (screen: Screen) => void;
  onSelectCategory?: (category: Category | null) => void;
  onSelectSpecialization: (spec: Specialization) => void;
  onBack?: () => void;
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
  onBack,
}) => {
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>(
    selectedCategory ? selectedCategory.id : 'all'
  );

  React.useEffect(() => {
    setActiveCategoryFilter(selectedCategory ? selectedCategory.id : 'all');
  }, [selectedCategory]);

  const displayCategories = categories;
  const allSpecs = specializations;

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

  const specsToRender = filteredSpecs.length > 0 ? filteredSpecs : allSpecs;

  const activeCategoryObj = activeCategoryFilter === 'all' ? null : displayCategories.find((c) => c.id === activeCategoryFilter);
  const currentCategoryName =
    activeCategoryFilter === 'all'
      ? null
      : activeCategoryObj?.name || selectedCategory?.name;

  const currentCatAccess = activeCategoryObj
    ? evaluateCategoryAccess(activeCategoryObj, userProfile, null, displayCategories)
    : null;

  return (
    <div className="pt-24 pb-32 px-4 md:px-8 max-w-5xl mx-auto">
      {/* Header Section */}
      <header className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={onBack || (() => onNavigate('home'))}
            className="text-slate-500 hover:text-blue-600 transition-colors flex items-center text-xs font-bold gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            <span>{currentCategoryName ? 'Voltar' : 'Página Inicial'}</span>
          </button>
          {currentCategoryName && (
            <>
              <span className="text-slate-300">•</span>
              <span className="text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full text-xs font-bold border border-blue-200/60 flex items-center gap-1">
                <span>{currentCategoryName}</span>
                {currentCatAccess?.isUnlimitedFree && (
                  <span className="bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase">
                    100% Grátis
                  </span>
                )}
                {isCategoryNew(activeCategoryObj) && (
                  <span className="bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase">
                    Novo
                  </span>
                )}
                {currentCatAccess?.isComingSoon && (
                  <span className="bg-slate-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase">
                    Em Breve
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
          {currentCatAccess?.isComingSoon
            ? `⏳ Concurso em preparação pela equipa pedagógica. Aguardando a publicação oficial dos exames.`
            : currentCatAccess?.isUnlimitedFree
            ? `🎉 Acesso 100% Gratuito! Todos os testes e simulados de ${currentCategoryName} estão liberados para todos os candidatos, sem pagar inscrição ou código.`
            : isCategoryNew(activeCategoryObj)
            ? `✨ Nova categoria em destaque! Os módulos e simulados requerem senha de ativação para acesso.`
            : currentCategoryName
            ? `Categoria liberada com 3 simulações gratuitas. Após o 3º simulado, insira a sua senha de ativação para continuar a testar.`
            : 'Explore as especialidades dos concursos públicos. Categorias grátis têm acesso ilimitado; categorias liberadas incluem 3 simulações gratuitas e categorias novas requerem senha de ativação.'}
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
          const isNovo = (cat.statusTag || '').toUpperCase() === 'NOVO';
          const isGratis = isFreeStatusTag(cat.statusTag);
          const isEmBreve = isCategoryComingSoon(cat);

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
              {isGratis && (
                <span className="bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                  Grátis
                </span>
              )}
              {isNovo && (
                <span className="bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                  Novo
                </span>
              )}
              {isEmBreve && (
                <span className="bg-slate-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                  Em Breve
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
          const access = evaluateCategoryAccess(
            activeCategoryObj || selectedCategory,
            userProfile,
            spec,
            displayCategories
          );

          const isTargetCatNovo = isCategoryNew(activeCategoryObj || selectedCategory);
          const isUserExpired = userProfile ? isUserSubscriptionExpired(userProfile) : false;

          const handleCardClick = () => {
            if (access.isComingSoon) {
              alert('Em breve aguardando exames. Esta categoria está em preparação pela equipa pedagógica.');
              return;
            }
            if (isUserExpired && !access.isUnlimitedFree) {
              alert(access.message || 'A sua subscrição expirou e o prazo da sua senha terminou. Para voltar a utilizar esta especialidade, por favor adquira e ative um novo código de ativação.');
              onNavigate('activation');
              return;
            }
            if (!access.canAccess && !isTargetCatNovo) {
              alert(access.message || 'Completou as suas 3 simulações gratuitas nesta categoria. Para continuar a testar, por favor insira a senha de ativação.');
              onNavigate('activation');
              return;
            }
            onSelectSpecialization(spec);
          };

          return (
            <div
              key={spec.id}
              onClick={handleCardClick}
              className={`group relative flex flex-col text-left rounded-3xl overflow-hidden cursor-pointer transition-all duration-300 shadow-sm border ${
                isSelected
                  ? 'bg-blue-50/90 border-blue-500 shadow-lg ring-2 ring-blue-500/30'
                  : access.isUnlimitedFree
                  ? 'bg-white border-emerald-300 hover:border-emerald-500 hover:shadow-xl hover:-translate-y-1'
                  : isUserExpired
                  ? 'bg-white border-rose-200 hover:border-rose-400 hover:shadow-xl hover:-translate-y-1'
                  : access.isActivated
                  ? 'bg-white border-blue-200 hover:border-blue-400 hover:shadow-xl hover:-translate-y-1'
                  : access.isComingSoon
                  ? 'bg-slate-50 border-slate-200 opacity-90'
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
                  </span>
                )}

                {/* Status Badge */}
                <div className="absolute top-3 right-4">
                  {access.isComingSoon ? (
                    <span className="bg-slate-700/95 backdrop-blur-md text-white text-[11px] font-black px-3 py-1 rounded-full border border-slate-500/50 shadow-md flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">schedule</span>
                      <span>Em Breve</span>
                    </span>
                  ) : access.isUnlimitedFree ? (
                    <span className="bg-emerald-600/95 backdrop-blur-md text-white text-[11px] font-black px-3 py-1 rounded-full border border-emerald-300/50 shadow-md flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">savings</span>
                      <span>100% Grátis</span>
                    </span>
                  ) : isUserExpired ? (
                    <span className="bg-rose-600/95 backdrop-blur-md text-white text-[11px] font-black px-3 py-1 rounded-full border border-rose-300/50 shadow-md flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">event_busy</span>
                      <span>Prazo Expirado</span>
                    </span>
                  ) : access.isActivated ? (
                    <span className="bg-emerald-500/90 backdrop-blur-md text-white text-[11px] font-black px-3 py-1 rounded-full border border-emerald-300/40 shadow-sm flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">check_circle</span>
                      <span>Inscrição Ativada</span>
                    </span>
                  ) : access.isTrial && access.remainingTrials > 0 ? (
                    <span className="bg-blue-600/90 backdrop-blur-md text-white text-[11px] font-black px-3 py-1 rounded-full border border-blue-300/40 shadow-sm flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">lock_clock</span>
                      <span>{access.remainingTrials} de {access.maxTrials} Grátis</span>
                    </span>
                  ) : (
                    <span className="bg-amber-500/90 backdrop-blur-md text-white text-[11px] font-black px-3 py-1 rounded-full border border-amber-300/40 shadow-sm flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">lock</span>
                      <span>Requer Inscrição</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Card Content */}
              <div className="p-6 pt-0 -mt-8 relative z-10 flex flex-col flex-grow">
                <div className="mb-3 flex items-center justify-between">
                  <div
                    className={`w-13 h-13 flex items-center justify-center rounded-2xl shadow-lg border ${
                      access.isUnlimitedFree
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : isUserExpired
                        ? 'bg-rose-600 text-white border-rose-500'
                        : access.isActivated
                        ? 'bg-blue-600 text-white border-blue-500'
                        : access.isComingSoon
                        ? 'bg-slate-600 text-white border-slate-500'
                        : isSelected
                        ? 'bg-blue-600 text-white border-blue-500'
                        : 'bg-white text-blue-700 border-slate-100 group-hover:bg-blue-600 group-hover:text-white transition-colors'
                    }`}
                  >
                    <span className="material-symbols-outlined text-2xl">{spec.icon}</span>
                  </div>

                  <div
                    className={`flex items-center gap-1.5 font-bold text-xs px-3.5 py-1.5 rounded-xl transition-all shadow-sm ${
                      access.isComingSoon
                        ? 'bg-slate-200 text-slate-700'
                        : access.isUnlimitedFree
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : isUserExpired
                        ? 'bg-rose-600 hover:bg-rose-700 text-white'
                        : access.isActivated
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : access.canAccess
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-amber-500 hover:bg-amber-600 text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {access.isComingSoon ? 'schedule' : isUserExpired ? 'event_busy' : access.canAccess ? 'arrow_forward' : 'vpn_key'}
                    </span>
                    <span>
                      {access.isComingSoon
                        ? 'Aguardando Exames'
                        : isUserExpired && !access.isUnlimitedFree
                        ? 'Reativar Código'
                        : access.isUnlimitedFree
                        ? 'Aceder Módulos (Grátis)'
                        : access.isActivated
                        ? 'Aceder Módulos'
                        : access.canAccess
                        ? 'Fazer Simulação Grátis'
                        : 'Ativar Inscrição'}
                    </span>
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
                        access.isUnlimitedFree
                          ? 'text-emerald-600'
                          : access.isActivated
                          ? 'text-blue-600'
                          : access.canAccess
                          ? 'text-blue-600'
                          : 'text-amber-500'
                      }`}
                    >
                      {access.isUnlimitedFree ? 'savings' : access.isActivated ? 'verified' : access.canAccess ? 'lock_clock' : 'info'}
                    </span>
                    <span>
                      {access.isComingSoon
                        ? 'Aguardando publicação oficial'
                        : access.isUnlimitedFree
                        ? '100% Gratuito sem código'
                        : access.isActivated
                        ? 'Inscrição Ativa'
                        : access.canAccess
                        ? `${access.remainingTrials} simulações restantes de teste`
                        : 'Ative para continuar a testar'}
                    </span>
                  </span>
                  <span
                    className={`font-extrabold group-hover:underline flex items-center gap-0.5 ${
                      access.isUnlimitedFree
                        ? 'text-emerald-600'
                        : access.canAccess
                        ? 'text-blue-600'
                        : 'text-amber-600'
                    }`}
                  >
                    {access.isComingSoon
                      ? 'Em breve'
                      : access.canAccess
                      ? 'Abrir Exames →'
                      : 'Ativar Agora →'}
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
