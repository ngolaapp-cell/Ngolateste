import React from 'react';
import { Screen, TestModule, Specialization, Category, UserProfile } from '../types';
import { TEST_MODULES } from '../data/mockData';
import { WhatsAppBanner } from '../components/WhatsAppBanner';
import { checkIsCategoryFree, checkIsSpecializationFree, checkIsSpecializationUnlocked } from '../utils/accessControl';

interface TestModulesViewProps {
  modules?: TestModule[];
  categories?: Category[];
  selectedCategory?: Category | null;
  selectedSpecialization?: Specialization | null;
  userProfile?: UserProfile;
  onNavigate: (screen: Screen) => void;
  onStartExamModule: (module: TestModule) => void;
}

export const TestModulesView: React.FC<TestModulesViewProps> = ({
  modules = [],
  categories = [],
  selectedCategory,
  selectedSpecialization,
  userProfile,
  onNavigate,
  onStartExamModule,
}) => {
  const allModules = modules;

  // Check if current category or specialization is free
  const isFree = selectedSpecialization
    ? checkIsSpecializationFree(selectedSpecialization, categories, selectedCategory)
    : checkIsCategoryFree(selectedCategory, categories);

  // Check if unlocked (either free OR activated)
  const unlocked = selectedSpecialization
    ? checkIsSpecializationUnlocked(selectedSpecialization, userProfile, categories, selectedCategory)
    : isFree || (userProfile?.isActivated ?? false) || (userProfile?.activatedSpecializations?.length ?? 0) > 0;

  const handleModuleClick = (test: TestModule) => {
    if (!unlocked) {
      onNavigate('activation');
      return;
    }
    onStartExamModule(test);
  };

  // Filter modules by specialization or category
  let filteredModules = allModules;

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
      filteredModules = matches;
    } else {
      // Generate specialized modules dynamically for this specialization if no exact match exists
      filteredModules = [
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

  return (
    <div className="pt-24 pb-32 px-4 md:px-8 max-w-4xl mx-auto">
      {/* Back Navigation & Breadcrumb */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => onNavigate('categories')}
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
            {isFree ? (
              <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">savings</span>
                <span>Acesso Grátis</span>
              </span>
            ) : unlocked ? (
              <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">check_circle</span>
                <span>Ativo</span>
              </span>
            ) : (
              <span className="bg-amber-100 text-amber-800 text-xs font-black px-2.5 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">lock</span>
                <span>Bloqueado</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Free Category Banner */}
      {isFree && (
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

      {/* Lock Notice Banner if Specialization is not activated and not free */}
      {!unlocked && (
        <div className="mb-8 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 border border-amber-400">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-3xl text-white">lock</span>
            </div>
            <div>
              <h3 className="text-xl font-black mb-1">
                Especialidade Não Ativada
              </h3>
              <p className="text-amber-100 text-xs md:text-sm leading-relaxed max-w-lg">
                Para realizar os testes e simulados de{' '}
                <strong>{selectedSpecialization?.title || 'esta especialidade'}</strong>, insira o código de ativação correspondente (1.000 Kz por 2 semanas).
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('activation')}
            className="w-full md:w-auto bg-white hover:bg-slate-50 text-slate-900 font-extrabold px-6 py-3.5 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 text-sm cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-amber-600">vpn_key</span>
            <span>Inserir Código de Ativação</span>
          </button>
        </div>
      )}

      {/* Hero Header Section */}
      <section className="mb-8">
        <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
          {selectedSpecialization
            ? `Módulos: ${selectedSpecialization.title}`
            : selectedCategory
            ? `Módulos: ${selectedCategory.name}`
            : 'Módulos de Teste'}
        </h2>
        <p className="text-slate-600 text-base md:text-lg leading-relaxed">
          {selectedSpecialization
            ? `Selecione um exame ou simulado de ${selectedSpecialization.title} para testar os seus conhecimentos.`
            : 'Prepare-se com exames reais e simulados especializados para o seu sucesso no concurso.'}
        </p>
      </section>

      {/* Grid of Test Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredModules.map((test) => (
          <div
            key={test.id}
            onClick={() => handleModuleClick(test)}
            className={`rounded-2xl p-5 shadow-sm border transition-all group cursor-pointer block relative ${
              unlocked
                ? 'bg-white border-slate-200/80 hover:shadow-md hover:border-blue-300'
                : 'bg-slate-50/90 border-slate-200 hover:border-amber-400 opacity-90'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className={`p-3 rounded-xl transition-colors ${
                  unlocked
                    ? 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
                    : 'bg-amber-100 text-amber-800 group-hover:bg-amber-600 group-hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined">
                  {!unlocked
                    ? 'lock'
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
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">lock</span>
                    REQUER CÓDIGO
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
                unlocked ? 'text-blue-600' : 'text-amber-600'
              }`}
            >
              <span>{unlocked ? 'Iniciar Teste' : 'Ativar Especialidade para Iniciar'}</span>
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
