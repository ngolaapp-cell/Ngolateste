import React, { useState, useEffect } from 'react';
import { Screen, UserProfile, Question, ExamResult, TestModule, Category, Specialization } from './types';
import {
  INITIAL_USER_PROFILE,
  MOCK_QUESTIONS,
  TEST_MODULES,
  HOME_CATEGORIES,
  SPECIALIZATIONS,
} from './data/mockData';
import {
  fetchTestModules,
  fetchQuestions,
  fetchCategories,
  fetchSpecializations,
  fetchUserProfile,
  saveQuestion,
  deleteQuestion,
  saveTestModule,
  deleteTestModule as supabaseDeleteModule,
  saveCategory,
  deleteCategory,
  saveSpecialization,
  deleteSpecializationFromSupabase,
  saveBulkQuestions,
  saveUserProfile,
  saveExamResult,
} from './services/supabaseService';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { AdminAuthModal } from './components/AdminAuthModal';
import { HomeView } from './views/HomeView';
import { CategoriesView } from './views/CategoriesView';
import { TestModulesView } from './views/TestModulesView';
import { ExamView } from './views/ExamView';
import { ResultView } from './views/ResultView';
import { ActivationView } from './views/ActivationView';
import { LoginView } from './views/LoginView';
import { ProfileView } from './views/ProfileView';
import { AdminView } from './views/AdminView';

export function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('ngola_current_user');
    return saved ? JSON.parse(saved) : INITIAL_USER_PROFILE;
  });
  const [testModules, setTestModules] = useState<TestModule[]>(TEST_MODULES);
  const [questionsPool, setQuestionsPool] = useState<Question[]>(MOCK_QUESTIONS);
  const [categories, setCategories] = useState<Category[]>(HOME_CATEGORIES);
  const [specializations, setSpecializations] = useState<Specialization[]>(SPECIALIZATIONS);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSpecialization, setSelectedSpecialization] = useState<Specialization | null>(null);

  // Load modules, questions, categories, specs, and user profile from Supabase on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [fetchedMods, fetchedQuestions, fetchedCats, fetchedSpecs] = await Promise.all([
          fetchTestModules(),
          fetchQuestions(),
          fetchCategories(),
          fetchSpecializations(),
        ]);
        if (fetchedMods) setTestModules(fetchedMods);
        if (fetchedQuestions) setQuestionsPool(fetchedQuestions);
        if (fetchedCats) setCategories(fetchedCats);
        if (fetchedSpecs) setSpecializations(fetchedSpecs);

        const currentSaved = localStorage.getItem('ngola_current_user');
        if (currentSaved) {
          const parsed = JSON.parse(currentSaved);
          if (parsed.phone) {
            const dbProfile = await fetchUserProfile(parsed.phone);
            if (dbProfile) {
              setUserProfile(dbProfile);
            }
          }
        }
      } catch (err) {
        console.warn('Error loading Supabase initial data:', err);
      }
    }
    loadData();
  }, []);

  // Admin security state
  const [adminPassword, setAdminPassword] = useState<string>(() => {
    return localStorage.getItem('ngola_admin_password') || 'ngola2025';
  });
  const [adminRecoveryEmail, setAdminRecoveryEmail] = useState<string>(() => {
    return localStorage.getItem('ngola_admin_recovery_email') || 'ngolaapp@gmail.com';
  });
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [showAdminModal, setShowAdminModal] = useState<boolean>(false);

  // Active exam state
  const [activeQuestions, setActiveQuestions] = useState<Question[]>(MOCK_QUESTIONS);
  const [activeTestTitle, setActiveTestTitle] = useState<string>('Simulado Geral');
  const [lastExamResult, setLastExamResult] = useState<ExamResult | null>(null);

  // Navigation handlers
  const handleNavigate = (screen: Screen) => {
    if (screen === 'admin' && !isAdminAuthenticated) {
      setShowAdminModal(true);
      return;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    setCurrentScreen(screen);
  };

  const handleCategoryClick = (cat: Category | null) => {
    setSelectedCategory(cat);
    setSelectedSpecialization(null);
    handleNavigate('categories');
  };

  const isCategoryFree = (catIdOrName?: string) => {
    if (!catIdOrName) return false;
    const clean = catIdOrName.toLowerCase().trim();
    const cat = categories.find(
      (c) =>
        c.id.toLowerCase().trim() === clean ||
        c.name.toLowerCase().trim() === clean ||
        c.name.toLowerCase().includes(clean) ||
        clean.includes(c.name.toLowerCase())
    );
    if (!cat) return false;
    const tag = (cat.statusTag || '').toUpperCase().trim();
    return tag === 'GRÁTIS' || tag === 'GRATIS' || tag === 'FREE';
  };

  const handleSpecializationClick = (spec: Specialization) => {
    setSelectedSpecialization(spec);

    // Find parent category to see if it's free
    const parentCategory = categories.find(
      (c) =>
        (spec.categoryId && (c.id.toLowerCase() === spec.categoryId.toLowerCase() || c.name.toLowerCase() === spec.categoryId.toLowerCase())) ||
        (spec.categoryName && (c.name.toLowerCase() === spec.categoryName.toLowerCase() || c.id.toLowerCase() === spec.categoryName.toLowerCase())) ||
        (selectedCategory && selectedCategory.id === c.id)
    );
    const parentIsFree = parentCategory && (
      (parentCategory.statusTag || '').toUpperCase() === 'GRÁTIS' ||
      (parentCategory.statusTag || '').toUpperCase() === 'GRATIS' ||
      (parentCategory.statusTag || '').toUpperCase() === 'FREE'
    );

    // Check if this specific specialization is unlocked
    const activatedList = userProfile.activatedSpecializations || [];
    const isUnlocked =
      parentIsFree ||
      activatedList.includes(spec.id) ||
      activatedList.includes(spec.title) ||
      activatedList.some(
        (s) =>
          s.toLowerCase().trim() === spec.id.toLowerCase().trim() ||
          s.toLowerCase().trim() === spec.title.toLowerCase().trim()
      );

    if (isUnlocked) {
      handleNavigate('tests');
    } else {
      // Per business rule: each specialization requires its own activation code
      handleNavigate('activation');
    }
  };

  const handleUpdateAdminPassword = (newPass: string) => {
    setAdminPassword(newPass);
    localStorage.setItem('ngola_admin_password', newPass);
  };

  const handleUpdateAdminRecoveryEmail = (newEmail: string) => {
    setAdminRecoveryEmail(newEmail);
    localStorage.setItem('ngola_admin_recovery_email', newEmail);
  };

  const handleLockAdmin = () => {
    setIsAdminAuthenticated(false);
    handleNavigate('home');
  };

  const handleStartExam = (categoryOrSubject?: string) => {
    if (userProfile.isBlocked) {
      alert(`O seu acesso ao sistema está bloqueado por comportamento irregular.\nMotivo: ${userProfile.blockedReason || 'Suspeita de irregularidade'}.\nEntre em contacto com o suporte.`);
      handleNavigate('profile');
      return;
    }

    const freeAccess = isCategoryFree(categoryOrSubject) || (selectedCategory && isCategoryFree(selectedCategory.id));
    const activatedList = userProfile.activatedSpecializations || [];
    const hasAccess = freeAccess || activatedList.length > 0;

    if (!hasAccess) {
      handleNavigate('activation');
      return;
    }

    let filtered = [...questionsPool];
    if (categoryOrSubject && categoryOrSubject !== 'geral' && categoryOrSubject !== 'rapido') {
      filtered = questionsPool.filter(
        (q) =>
          q.category.toLowerCase().includes(categoryOrSubject.toLowerCase()) ||
          categoryOrSubject.toLowerCase().includes(q.category.toLowerCase())
      );
      if (filtered.length === 0) filtered = questionsPool;
    }

    setActiveQuestions(filtered.length > 0 ? filtered : MOCK_QUESTIONS);
    setActiveTestTitle(
      categoryOrSubject === 'rapido'
        ? 'Simulado Rápido'
        : categoryOrSubject
        ? `Simulado de ${categoryOrSubject}`
        : 'Simulado Geral Nacional'
    );
    handleNavigate('exam');
  };

  const handleStartExamModule = (module: TestModule) => {
    if (userProfile.isBlocked) {
      alert(`O seu acesso ao sistema está bloqueado por comportamento irregular.\nMotivo: ${userProfile.blockedReason || 'Suspeita de irregularidade'}.\nEntre em contacto com o suporte.`);
      handleNavigate('profile');
      return;
    }

    // Check if parent category or module category is Free
    const matchingCat = categories.find(
      (c) =>
        (module.category && (c.id.toLowerCase() === module.category.toLowerCase() || c.name.toLowerCase() === module.category.toLowerCase())) ||
        (selectedCategory && selectedCategory.id === c.id) ||
        (selectedSpecialization && (selectedSpecialization.categoryId === c.id || selectedSpecialization.categoryName?.toLowerCase() === c.name.toLowerCase()))
    );
    const isCategoryFreeAccess = matchingCat && (
      (matchingCat.statusTag || '').toUpperCase() === 'GRÁTIS' ||
      (matchingCat.statusTag || '').toUpperCase() === 'GRATIS' ||
      (matchingCat.statusTag || '').toUpperCase() === 'FREE'
    );

    const activatedList = userProfile.activatedSpecializations || [];
    const hasUnlockedSpecInModule =
      (module.specializationIds && module.specializationIds.some(id =>
        activatedList.some(act => act.toLowerCase().trim() === id.toLowerCase().trim())
      )) ||
      (module.specializationNames && module.specializationNames.some(name =>
        activatedList.some(act => act.toLowerCase().trim() === name.toLowerCase().trim())
      ));

    const isUnlocked =
      isCategoryFreeAccess ||
      hasUnlockedSpecInModule ||
      (selectedSpecialization && (
        activatedList.includes(selectedSpecialization.id) ||
        activatedList.includes(selectedSpecialization.title) ||
        activatedList.some(
          (s) =>
            s.toLowerCase().trim() === selectedSpecialization.id.toLowerCase().trim() ||
            s.toLowerCase().trim() === selectedSpecialization.title.toLowerCase().trim()
        )
      )) ||
      activatedList.includes(module.id) ||
      activatedList.includes(module.category) ||
      activatedList.includes(module.title);

    if (!isUnlocked) {
      handleNavigate('activation');
      return;
    }

    // Filter questions that belong to this module or category
    const moduleQuestions = questionsPool.filter(
      (q) => q.moduleId === module.id || (module.category && q.category.toLowerCase().includes(module.category.toLowerCase()))
    );

    setActiveQuestions(moduleQuestions.length > 0 ? moduleQuestions : questionsPool);
    setActiveTestTitle(module.title);
    handleNavigate('exam');
  };

  const handleFinishExam = (result: ExamResult) => {
    setLastExamResult(result);
    saveExamResult(result, userProfile.phone);

    // Update daily questions stats
    setUserProfile((prev) => {
      const updated = {
        ...prev,
        dailyCompletedQuestions: Math.min(prev.dailyCompletedQuestions + result.total, prev.dailyGoalQuestions),
        totalTestsTaken: prev.totalTestsTaken + 1,
      };
      saveUserProfile(updated);
      return updated;
    });
    handleNavigate('result');
  };

  const handleActivationSuccess = (
    code: string,
    days: number,
    specializationId?: string,
    specializationTitle?: string
  ) => {
    const expiresDate = new Date();
    expiresDate.setDate(expiresDate.getDate() + days);

    setUserProfile((prev) => {
      const currentActivatedSpecs = prev.activatedSpecializations || [];
      const newSpecsToAdd = [
        ...(specializationId ? [specializationId] : []),
        ...(specializationTitle ? [specializationTitle] : []),
      ];

      const updatedSpecs = Array.from(new Set([...currentActivatedSpecs, ...newSpecsToAdd]));

      const updated = {
        ...prev,
        isActivated: true,
        activationCode: code,
        expiresAt: expiresDate.toLocaleDateString('pt-AO'),
        activatedSpecializations: updatedSpecs,
      };
      saveUserProfile(updated);
      localStorage.setItem('ngola_current_user', JSON.stringify(updated));
      return updated;
    });
  };

  const handleAddQuestion = (newQuestion: Question) => {
    setQuestionsPool((prev) => [newQuestion, ...prev]);
    saveQuestion(newQuestion);

    if (newQuestion.moduleId) {
      setTestModules((prev) => {
        const updated = prev.map((mod) =>
          mod.id === newQuestion.moduleId
            ? { ...mod, questionCount: mod.questionCount + 1 }
            : mod
        );
        const targetMod = updated.find((m) => m.id === newQuestion.moduleId);
        if (targetMod) saveTestModule(targetMod);
        return updated;
      });
    }
  };

  const handleUpdateQuestion = (updatedQuestion: Question) => {
    setQuestionsPool((prev) =>
      prev.map((q) => (q.id === updatedQuestion.id ? updatedQuestion : q))
    );
    saveQuestion(updatedQuestion);
  };

  const handleDeleteQuestion = (questionId: string) => {
    setQuestionsPool((prev) => prev.filter((q) => q.id !== questionId));
    deleteQuestion(questionId);
  };

  const handleAddModule = (newModule: TestModule) => {
    setTestModules((prev) => [newModule, ...prev]);
    saveTestModule(newModule);
  };

  const handleAddCategory = (newCat: Category) => {
    setCategories((prev) => {
      const exists = prev.some((c) => c.id === newCat.id);
      if (exists) {
        return prev.map((c) => (c.id === newCat.id ? newCat : c));
      }
      return [newCat, ...prev];
    });
    saveCategory(newCat);
  };

  const handleDeleteCategory = (catId: string) => {
    setCategories((prev) =>
      prev.filter(
        (c) =>
          String(c.id).toLowerCase() !== String(catId).toLowerCase() &&
          c.name.toLowerCase() !== String(catId).toLowerCase()
      )
    );
    deleteCategory(catId);
  };

  const handleAddSpecialization = (newSpec: Specialization) => {
    setSpecializations((prev) => {
      const exists = prev.some((s) => s.id === newSpec.id);
      if (exists) {
        return prev.map((s) => (s.id === newSpec.id ? newSpec : s));
      }
      return [newSpec, ...prev];
    });
    saveSpecialization(newSpec);
  };

  const handleDeleteSpecialization = (specId: string) => {
    setSpecializations((prev) =>
      prev.filter(
        (s) =>
          String(s.id).toLowerCase() !== String(specId).toLowerCase() &&
          s.title.toLowerCase() !== String(specId).toLowerCase()
      )
    );
    deleteSpecializationFromSupabase(specId);
  };

  const handleDeleteModule = (moduleId: string) => {
    setTestModules((prev) =>
      prev.filter(
        (mod) =>
          String(mod.id).toLowerCase() !== String(moduleId).toLowerCase() &&
          mod.title.toLowerCase() !== String(moduleId).toLowerCase()
      )
    );
    setQuestionsPool((prev) =>
      prev.filter((q) => String(q.moduleId).toLowerCase() !== String(moduleId).toLowerCase())
    );
    supabaseDeleteModule(moduleId);
  };

  const handleBulkAddQuestions = (newQuestions: Question[], targetModuleId?: string) => {
    setQuestionsPool((prev) => [...newQuestions, ...prev]);
    saveBulkQuestions(newQuestions);

    if (targetModuleId) {
      setTestModules((prev) => {
        const updated = prev.map((mod) =>
          mod.id === targetModuleId
            ? { ...mod, questionCount: mod.questionCount + newQuestions.length }
            : mod
        );
        const targetMod = updated.find((m) => m.id === targetModuleId);
        if (targetMod) saveTestModule(targetMod);
        return updated;
      });
    }
  };

  const handleLogout = () => {
    const resetUser = {
      ...INITIAL_USER_PROFILE,
      isActivated: false,
    };
    setUserProfile(resetUser);
    localStorage.removeItem('ngola_current_user');
    handleNavigate('login');
  };


  return (
    <div className="min-h-screen bg-[#F0F7FF] text-slate-900 font-sans antialiased flex flex-col">
      {/* Universal Top Header (hidden on exam view, login, and admin view which has its own toolbar) */}
      {currentScreen !== 'exam' && currentScreen !== 'login' && currentScreen !== 'admin' && (
        <Header
          currentScreen={currentScreen}
          onNavigate={handleNavigate}
          showBack={currentScreen !== 'home'}
          onBack={() => handleNavigate('home')}
          showSearch={currentScreen === 'home' || currentScreen === 'tests'}
          onSearchClick={() => handleNavigate('categories')}
        />
      )}

      {/* Dynamic Screen View */}
      <main className="flex-grow">
        {currentScreen === 'home' && (
          <HomeView
            categories={categories}
            userProfile={userProfile}
            onNavigate={handleNavigate}
            onSelectCategory={handleCategoryClick}
            onStartExam={handleStartExam}
          />
        )}

        {currentScreen === 'categories' && (
          <CategoriesView
            categories={categories}
            selectedCategory={selectedCategory}
            selectedSpecialization={selectedSpecialization}
            specializations={specializations}
            userProfile={userProfile}
            onNavigate={handleNavigate}
            onSelectCategory={(cat) => setSelectedCategory(cat)}
            onSelectSpecialization={handleSpecializationClick}
          />
        )}

        {currentScreen === 'tests' && (
          <TestModulesView
            modules={testModules}
            selectedCategory={selectedCategory}
            selectedSpecialization={selectedSpecialization}
            userProfile={userProfile}
            onNavigate={handleNavigate}
            onStartExamModule={handleStartExamModule}
          />
        )}

        {currentScreen === 'exam' && (
          <ExamView
            questions={activeQuestions}
            categoryTitle={activeTestTitle}
            onNavigate={handleNavigate}
            onFinishExam={handleFinishExam}
          />
        )}

        {currentScreen === 'result' && (
          <ResultView
            result={
              lastExamResult || {
                score: 16,
                total: 20,
                percentage: 80,
                correctCount: 16,
                incorrectCount: 4,
                finalGrade: 16,
                studyTip:
                  'Revise as questões de Legislação. Foi onde você teve mais dificuldades hoje. Mantenha a constância!',
                categoryName: 'Direito Administrativo',
                testName: activeTestTitle,
                date: new Date().toLocaleDateString('pt-AO'),
              }
            }
            onNavigate={handleNavigate}
            onRestartExam={() => handleStartExam('geral')}
          />
        )}

        {currentScreen === 'activation' && (
          <ActivationView
            userProfile={userProfile}
            selectedSpecialization={selectedSpecialization}
            specializations={specializations}
            onNavigate={handleNavigate}
            onSelectSpecialization={(spec) => setSelectedSpecialization(spec)}
            onActivationSuccess={handleActivationSuccess}
          />
        )}

        {currentScreen === 'login' && (
          <LoginView
            onNavigate={handleNavigate}
            onLoginSuccess={(userData) => {
              setUserProfile(userData);
              localStorage.setItem('ngola_current_user', JSON.stringify(userData));
            }}
          />
        )}

        {currentScreen === 'profile' && (
          <ProfileView
            userProfile={userProfile}
            onNavigate={handleNavigate}
            onLogout={handleLogout}
          />
        )}

        {currentScreen === 'admin' && (
          <AdminView
            modules={testModules}
            categories={categories}
            specializations={specializations}
            questions={questionsPool}
            onNavigate={handleNavigate}
            onAddQuestion={handleAddQuestion}
            onUpdateQuestion={handleUpdateQuestion}
            onDeleteQuestion={handleDeleteQuestion}
            onAddModule={handleAddModule}
            onDeleteModule={handleDeleteModule}
            onAddCategory={handleAddCategory}
            onDeleteCategory={handleDeleteCategory}
            onAddSpecialization={handleAddSpecialization}
            onDeleteSpecialization={handleDeleteSpecialization}
            onBulkAddQuestions={handleBulkAddQuestions}
            adminPassword={adminPassword}
            onUpdateAdminPassword={handleUpdateAdminPassword}
            adminRecoveryEmail={adminRecoveryEmail}
            onUpdateAdminRecoveryEmail={handleUpdateAdminRecoveryEmail}
            onLockAdmin={handleLockAdmin}
          />
        )}
      </main>

      {/* Admin Authentication Password Modal */}
      <AdminAuthModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        onSuccess={() => {
          setIsAdminAuthenticated(true);
          setShowAdminModal(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setCurrentScreen('admin');
        }}
        adminPassword={adminPassword}
        onResetPassword={handleUpdateAdminPassword}
      />

      {/* Bottom Navigation Bar */}
      {currentScreen !== 'login' && (
        <BottomNav currentScreen={currentScreen} onNavigate={handleNavigate} />
      )}
    </div>
  );
}

export default App;
