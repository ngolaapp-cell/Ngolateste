import React, { useState, useMemo } from 'react';
import { Screen, TestModule, Specialization, Category, UserProfile } from '../types';
import { TEST_MODULES } from '../data/mockData';
import { WhatsAppBanner } from '../components/WhatsAppBanner';
import {
  evaluateCategoryAccess,
  checkIsCategoryFree,
  checkIsSpecializationFree,
  checkIsSpecializationUnlocked,
  isCategoryNew,
} from '../utils/accessControl';
import { isUserSubscriptionExpired } from '../utils/dateUtils';

interface TestModulesViewProps {
  modules?: TestModule[];
  categories?: Category[];
  selectedCategory?: Category | null;
  selectedSpecialization?: Specialization | null;
  userProfile?: UserProfile;
  onNavigate: (screen: Screen) => void;
  onStartExamModule: (module: TestModule) => void;
  onBack?: () => void;
}

export const TestModulesView: React.FC<TestModulesViewProps> = ({
  modules = [],
  categories = [],
  selectedCategory,
  selectedSpecialization,
  userProfile,
  onNavigate,
  onStartExamModule,
  onBack,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const allModules = modules;

  // Evaluate access with the 4-tier model (Grátis, Liberado [3 free], Novo [requer senha], Em breve)
  const access = evaluateCategoryAccess(
    selectedCategory,
    userProfile,
    selectedSpecialization,
    categories
  );

  const isNovo = isCategoryNew(selectedCategory);
  const isFree = access.isUnlimitedFree;
  const isExpired = userProfile ? isUserSubscriptionExpired(userProfile) : false;
  const unlocked = access.canAccess;

  const handleModuleClick = (test: TestModule) => {
    if (access.isComingSoon) {
      alert('Em breve aguardando exames. Esta categoria aguarda a publicação oficial dos simulados.');
      return;
    }
    if (!access.canAccess) {
      if (isExpired) {
        alert(access.message || 'A sua subscrição expirou e o prazo da sua senha terminou. Para voltar a utilizar as especialidades e realizar os simulados, por favor adquira e ative um novo código de ativação.');
      } else if (isNovo) {
        alert(access.message || 'Esta categoria do tipo Novo requer senha de ativação. Por favor ative a sua inscrição para aceder aos módulos e simulados.');
      } else {
        alert(access.message || 'Completou as suas 3 simulações gratuitas nesta categoria. Para continuar a testar, por favor ative a sua inscrição com a senha de ativação.');
      }
      onNavigate('activation');
      return;
    }
    onStartExamModule(test);
  };

  // Filter modules by specialization or category and sort in ascending alphabetical order (A-Z)
  const sortedModules = useMemo(() => {
    let baseList: TestModule[] = allModules;

    if (selectedSpecialization) {
      const specTitleLower = selectedSpecialization.title.toLowerCase();
      const catNameLower = (selectedCategory?.name || selectedSpecialization.categoryName || '').toLowerCase();

      const matches = allModules.filter((m) => {
        const modCatLower = (m.category || '').toLowerCase();
        const modTitleLower = (m.title || '').toLowerCase();
        
        const hasDirectSpecId = m.specializationIds && Array.isArray(m.specializationIds) && (
          m.specializationIds.includes(selectedSpecialization.id) ||
          m.specializationIds.some(id => id.toLowerCase().trim() === selectedSpecialization.id.toLowerCase().trim())
        );

        const hasDirectSpecName = m.specializationNames && Array.isArray(m.specializationNames) && (
          m.specializationNames.some(name => 
            name.toLowerCase().trim() === specTitleLower ||
            specTitleLower.includes(name.toLowerCase().trim()) ||
            name.toLowerCase().includes(specTitleLower)
          )
        );

        return (
          hasDirectSpecId ||
          hasDirectSpecName ||
          modCatLower.includes(specTitleLower) ||
          modTitleLower.includes(specTitleLower) ||
          (catNameLower && modCatLower.includes(catNameLower))
        );
      });

      if (matches.length > 0) {
        baseList = matches;
      } else {
        // Generate specialized modules dynamically for this specialization if no exact match exists
        baseList = [
          {
            id: `mod-${selectedSpecialization.id}-2025`,
            title: `Simulado Oficial de ${selectedSpecialization.title} 2025`,
            year: 2025,
            questionCount: 40,
            badge: 'RECOMENDADO',
            category: selectedSpecialization.title,
          },
          {
            id: `mod-${selectedSpecialization.id}-2024`,
            title: `Exame de Admissão de ${selectedSpecialization.title} 2024`,
            year: 2024,
            questionCount: 35,
            badge: 'OFICIAL',
            category: selectedSpecialization.title,
          },
          {
            id: `mod-${selectedSpecialization.id}-aptidao`,
            title: `Teste de Aptidão Profissional (${selectedSpecialization.title})`,
            year: 2024,
            questionCount: 30,
            badge: 'ESPECIAL',
            category: selectedSpecialization.title,
          },
        ];
      }
    }

    // Sort in ascending alphabetical order (A-Z)
    return [...baseList].sort((a, b) =>
      (a.title || '').localeCompare(b.title || '', 'pt-AO', {
        sensitivity: 'base',
        numeric: true,
      })
    );
  }, [allModules, selectedSpecialization, selectedCategory]);

  const displayedModules = useMemo(() => {
    if (!searchTerm.trim()) return sortedModules;
    const term = searchTerm.toLowerCase().trim();
    return sortedModules.filter(
      (m) =>
        (m.title || '').toLowerCase().includes(term) ||
        (m.category || '').toLowerCase().includes(term) ||
        (m.description || '').toLowerCase().includes(term) ||
        String(m.year || '').includes(term)
    );
  }, [sortedModules, searchTerm]);

  return (
    <div className="pt-24 pb-32 px-4 md:px-8 max-w-4xl mx-auto">
      {/* Back Navigation & Breadcrumb */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onBack || (() => onNavigate('categories'))}
          className="text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-1.5 text-xs font-bold bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          <span>Voltar para Especializações</span>
        </button>

        {selectedSpecialization && (
          <div className="flex items-center gap-2">
            <span className="bg-blue-100 text-blue-800 text-xs font-extrabold px-3 py-1 rounded-full border border-blue-200">
              {selectedSpecialization.title}
            </span>
            {access.isComingSoon ? (
              <span className="bg-slate-100 text-slate-800 text-xs font-black px-2.5 py-0.5 rounded-full border border-slate-300 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">schedule</span>
                <span>Em Breve</span>
              </span>
            ) : access.isUnlimitedFree ? (
              <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">savings</span>
                <span>100% Grátis</span>
              </span>
            ) : isExpired ? (
              <span className="bg-rose-100 text-rose-800 text-xs font-black px-2.5 py-0.5 rounded-full border border-rose-300 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">event_busy</span>
                <span>Prazo Expirado</span>
              </span>
            ) : access.isActivated ? (
              <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">check_circle</span>
                <span>Inscrição Ativa</span>
              </span>
            ) : access.isTrial && access.remainingTrials > 0 ? (
              <span className="bg-blue-100 text-blue-800 text-xs font-black px-2.5 py-0.5 rounded-full border border-blue-300 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">lock_clock</span>
                <span>{access.remainingTrials} de {access.maxTrials} Grátis</span>
              </span>
            ) : (
              <span className="bg-amber-100 text-amber-800 text-xs font-black px-2.5 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">lock</span>
                <span>Requer Inscrição</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* 1. Coming Soon Banner */}
      {access.isComingSoon && (
        <div className="mb-8 bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-600">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-3xl text-slate-200">schedule</span>
            </div>
            <div>
              <h3 className="text-xl font-black mb-1">
                Em Breve: Aguardando Exames Oficiais
              </h3>
              <p className="text-slate-300 text-xs md:text-sm leading-relaxed max-w-lg">
                Esta categoria e especialidade estão em preparação pela equipa pedagógica. Em breve serão publicados os testes e simulados oficiais.
              </p>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-1.5 border border-white/20 shrink-0">
            <span className="material-symbols-outlined text-sm text-slate-300">hourglass_top</span>
            <span>Em Preparação</span>
          </div>
        </div>
      )}

      {/* 2. Free Category Banner */}
      {access.isUnlimitedFree && (
        <div className="mb-8 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 border border-emerald-400/40">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-3xl text-white">savings</span>
            </div>
            <div>
              <h3 className="text-xl font-black mb-1">
                Acesso 100% Gratuito Liberado
              </h3>
              <p className="text-emerald-100 text-xs md:text-sm leading-relaxed max-w-lg">
                Esta categoria está aberta gratuitamente. Realize simulados, exames e testes práticos sem pagar inscrição e sem precisar de código!
              </p>
            </div>
          </div>

          <div className="bg-white/20 backdrop-blur-md px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-1.5 border border-white/30 shrink-0">
            <span className="material-symbols-outlined text-sm text-emerald-200">verified</span>
            <span>Sem Inscrição Necessária</span>
          </div>
        </div>
      )}

      {/* 3. Expired Subscription Banner: Strict Expiration Enforcement */}
      {isExpired && !access.isUnlimitedFree && !access.isComingSoon && (
        <div className="mb-8 bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 border border-rose-400">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-3xl text-white">event_busy</span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-white/20 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Prazo Encerrado
                </span>
                <h3 className="text-xl font-black">Senha de Ativação Expirada</h3>
              </div>
              <p className="text-rose-100 text-xs md:text-sm leading-relaxed max-w-lg">
                O prazo de validade da sua subscrição terminou {userProfile?.expiresAt ? `em ${userProfile.expiresAt}` : ''}. O acesso às especialidades anteriormente ativadas foi suspenso. Para voltar a utilizar os simulados, por favor adquira e ative um novo código.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('activation')}
            className="w-full md:w-auto bg-white hover:bg-slate-50 text-slate-900 font-extrabold px-6 py-3.5 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 text-sm cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-rose-600">vpn_key</span>
            <span>Ativar Novo Código</span>
          </button>
        </div>
      )}

      {/* 4. Novo Category Banner: Immediate Activation Password Required */}
      {!isExpired && isNovo && !access.isActivated && (
        <div className="mb-8 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 border border-amber-300/40">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-3xl text-white">vpn_key</span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-white/20 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Novo Concurso
                </span>
                <h3 className="text-xl font-black">Requer Senha de Ativação</h3>
              </div>
              <p className="text-amber-100 text-xs md:text-sm leading-relaxed max-w-lg">
                Esta categoria é do tipo <strong>Novo</strong>. Para realizar os simulados e aceder aos módulos, insira a sua senha de ativação.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('activation')}
            className="w-full md:w-auto bg-white hover:bg-slate-50 text-slate-900 font-extrabold px-6 py-3.5 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 text-sm cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-amber-600">key</span>
            <span>Inserir Senha de Ativação</span>
          </button>
        </div>
      )}

      {/* 5. Trial Mode Banner for Liberado (Up to 3 free simulations remaining) */}
      {!isExpired && !isNovo && access.isTrial && access.remainingTrials > 0 && !access.isActivated && (
        <div className="mb-8 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 border border-blue-400/40">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-3xl text-white">lock_clock</span>
            </div>
            <div>
              <h3 className="text-xl font-black mb-1">
                Modo de Teste Gratuito: {access.remainingTrials} de {access.maxTrials} Restantes
              </h3>
              <p className="text-blue-100 text-xs md:text-sm leading-relaxed max-w-lg">
                Pode realizar até <strong>3 simulações grátis</strong> nesta categoria. Já realizou {access.usedTrials} de {access.maxTrials}. Após a 3ª simulação, é solicitada a senha de ativação para continuar.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('activation')}
            className="w-full md:w-auto bg-white hover:bg-slate-50 text-blue-900 font-extrabold px-5 py-3 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-blue-600">vpn_key</span>
            <span>Ativar Inscrição Completa</span>
          </button>
        </div>
      )}

      {/* 6. Trial Exhausted Banner for Liberado (Must activate subscription) */}
      {!isExpired && !isNovo && !access.canAccess && !access.isComingSoon && (
        <div className="mb-8 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 border border-amber-400">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-3xl text-white">lock</span>
            </div>
            <div>
              <h3 className="text-xl font-black mb-1">
                Limite de 3 Simulações Grátis Concluído
              </h3>
              <p className="text-amber-100 text-xs md:text-sm leading-relaxed max-w-lg">
                Concluiu as 3 simulações gratuitas de teste nesta categoria. Para continuar a realizar exames e ter acesso total, insira a sua senha de ativação.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('activation')}
            className="w-full md:w-auto bg-white hover:bg-slate-50 text-slate-900 font-extrabold px-6 py-3.5 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 text-sm cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-amber-600">vpn_key</span>
            <span>Inserir Senha de Ativação</span>
          </button>
        </div>
      )}

      {/* Hero Header Section */}
      <section className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            {selectedSpecialization
              ? `Módulos: ${selectedSpecialization.title}`
              : selectedCategory
              ? `Módulos: ${selectedCategory.name}`
              : 'Módulos de Teste'}
          </h2>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-full border border-slate-200">
              <span className="material-symbols-outlined text-xs text-blue-600">sort_by_alpha</span>
              <span>Ordem A → Z</span>
            </span>
            <span className="inline-flex items-center px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-black rounded-full border border-blue-200">
              {displayedModules.length} módulos
            </span>
          </div>
        </div>
        <p className="text-slate-600 text-base md:text-lg leading-relaxed">
          {selectedSpecialization
            ? `Selecione um exame ou simulado de ${selectedSpecialization.title} para testar os seus conhecimentos.`
            : 'Prepare-se com exames reais e simulados especializados para o seu sucesso no concurso.'}
        </p>
      </section>

      {/* Search Filter Bar (useful when there are many modules) */}
      {sortedModules.length > 4 && (
        <div className="mb-6">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
              search
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar módulo pelo nome ou ano (ordem A-Z)..."
              className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-10 py-3 text-sm font-medium text-slate-800 placeholder-slate-400 shadow-xs outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                title="Limpar pesquisa"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Empty State for Search */}
      {displayedModules.length === 0 && (
        <div className="bg-white rounded-3xl p-8 text-center border border-dashed border-slate-300 space-y-3 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-3xl">search_off</span>
          </div>
          <h3 className="text-lg font-bold text-slate-800">Nenhum módulo encontrado</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Não encontramos nenhum módulo com o termo &quot;{searchTerm}&quot;. Tente pesquisar por outro nome ou limpe a busca.
          </p>
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Limpar Pesquisa
          </button>
        </div>
      )}

      {/* Grid of Test Modules in Ascending Alphabetical Order (A-Z) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {displayedModules.map((test, index) => (
          <div
            key={`mod-item-${test.id}-${index}`}
            onClick={() => handleModuleClick(test)}
            className={`rounded-2xl p-5 shadow-sm border transition-all group cursor-pointer block relative ${
              unlocked
                ? 'bg-white border-slate-200/80 hover:shadow-md hover:border-blue-300'
                : isExpired
                ? 'bg-slate-50/90 border-rose-200 hover:border-rose-400 opacity-90'
                : 'bg-slate-50/90 border-slate-200 hover:border-amber-400 opacity-90'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className={`p-3 rounded-xl transition-colors ${
                  unlocked
                    ? 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
                    : isExpired
                    ? 'bg-rose-100 text-rose-800 group-hover:bg-rose-600 group-hover:text-white'
                    : 'bg-amber-100 text-amber-800 group-hover:bg-amber-600 group-hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined">
                  {!unlocked
                    ? isExpired
                      ? 'event_busy'
                      : 'lock'
                    : test.id.includes('especialidade') || test.id.includes('mod-')
                    ? 'school'
                    : test.id.includes('recurso')
                    ? 'description'
                    : test.id.includes('simulado')
                    ? 'verified'
                    : 'menu_book'}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {!unlocked && (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border flex items-center gap-1 ${
                      isExpired
                        ? 'bg-rose-100 text-rose-800 border-rose-300'
                        : 'bg-amber-100 text-amber-800 border-amber-300'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[12px]">{isExpired ? 'event_busy' : 'lock'}</span>
                    {isExpired ? 'CÓDIGO EXPIRADO' : isNovo ? 'REQUER SENHA' : 'REQUER ATIVAÇÃO'}
                  </span>
                )}
                {test.badge && (
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      test.badge === 'RECOMENDADO'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {test.badge}
                  </span>
                )}
              </div>
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">
              {test.title}
            </h3>

            <div className="flex items-center gap-4 text-sm text-slate-500 font-medium">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                {test.year}
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[18px]">list_alt</span>
                {test.questionCount} questões
              </span>
            </div>

            <div
              className={`mt-4 pt-4 border-t border-slate-100 flex items-center justify-between font-bold text-sm ${
                unlocked ? 'text-blue-600' : isExpired ? 'text-rose-600' : 'text-amber-600'
              }`}
            >
              <span>{unlocked ? 'Iniciar Teste' : isExpired ? 'Reativar Código de Acesso' : isNovo ? 'Inserir Senha de Ativação' : 'Ativar Especialidade para Iniciar'}</span>
              <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">
                {unlocked ? 'arrow_forward' : 'vpn_key'}
              </span>
            </div>
          </div>
        ))}

        {/* Featured Challenge Banner */}
        <div className="md:col-span-2 relative overflow-hidden bg-blue-600 rounded-2xl p-6 md:p-8 text-white shadow-xl mt-2">
          <div className="relative z-10 max-w-md">
            <h3 className="text-2xl font-black mb-2">Desafio do Dia</h3>
            <p className="text-blue-100 mb-6 font-medium text-sm md:text-base leading-relaxed">
              Uma seleção rápida de 10 questões aleatórias para manter sua mente afiada.
            </p>
            <button
              onClick={() => {
                if (!unlocked) {
                  onNavigate('activation');
                } else {
                  onStartExamModule({
                    id: 'desafio-dia',
                    title: 'Desafio do Dia',
                    year: 2025,
                    questionCount: 10,
                    badge: 'OFICIAL',
                    category: 'Desafio Rápido',
                  });
                }
              }}
              className="inline-block bg-white text-blue-700 font-bold px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors active:scale-95 duration-200 cursor-pointer shadow-md text-sm"
            >
              {unlocked ? 'Começar Agora' : 'Ativar para Começar'}
            </button>
          </div>

          <div className="absolute -right-8 -bottom-8 opacity-20 pointer-events-none">
            <span className="material-symbols-outlined text-[180px]">auto_awesome</span>
          </div>
        </div>
      </div>

      {/* WhatsApp Banner */}
      <WhatsAppBanner />
    </div>
  );
};
