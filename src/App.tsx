import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Screen, UserProfile, Question, ExamResult, TestModule, Category, Specialization, AdminAnnouncement } from './types';
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
  fetchAdminPassword,
  saveAdminPassword,
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
  fetchAdminAnnouncements,
  subscribeToRealtimeAnnouncements,
  isAnnouncementForUser,
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
import {
  checkIsCategoryFree,
  checkIsSpecializationFree,
  checkIsSpecializationUnlocked,
  checkHasFullPlatformAccess,
  evaluateCategoryAccess,
  recordCategorySimulation,
} from './utils/accessControl';
import { updateAppBadge, sendNativeNotification } from './utils/badgeManager';
import { AppNavState, pushNavHistory, replaceNavHistory, parseNavFromHash } from './utils/navigationHistory';

export function App() {
  // Check if a registered user session exists
  const getStoredUser = (): UserProfile | null => {
    try {
      const saved = localStorage.getItem('ngola_current_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.phone || parsed.email)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading stored user profile:', e);
    }
    return null;
  };

  const storedUser = getStoredUser();

  // Navigation state on initial load / refresh: always go directly to initial screen ('home' if logged in, 'login' if not)
  const getInitialNav = (): { screen: Screen; categoryId?: string | null; specializationId?: string | null } => {
    const isAuthed = Boolean(storedUser && (storedUser.phone?.trim() || storedUser.email?.trim()));
    const targetScreen: Screen = isAuthed ? 'home' : 'login';
    if (typeof window !== 'undefined') {
      try {
        window.history.replaceState(
          { screen: targetScreen, stepIndex: 0, timestamp: Date.now() },
          '',
          `#/${targetScreen}`
        );
      } catch (_) {}
    }
    return { screen: targetScreen };
  };

  const initialNav = React.useMemo(() => getInitialNav(), []);

  // First-time visit: opens login page directly. If logged in previously, opens home or restored screen.
  const [currentScreen, setCurrentScreen] = useState<Screen>(initialNav.screen);
  const navStepCountRef = React.useRef<number>(0);
  const lastBackPressRef = React.useRef<number>(0);
  const [showExitToast, setShowExitToast] = useState<boolean>(false);
  const exitToastTimeoutRef = React.useRef<any>(null);

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    return (
      storedUser || {
        name: '',
        phone: '',
        email: '',
        isActivated: false,
        dailyGoalQuestions: 30,
        dailyCompletedQuestions: 0,
        totalTestsTaken: 0,
        averageScore: 0,
      }
    );
  });

  const checkIsUserAuthenticated = useCallback(() => {
    if (userProfile && (userProfile.phone?.trim() || userProfile.email?.trim())) {
      return true;
    }
    try {
      const saved = localStorage.getItem('ngola_current_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.phone || parsed.email)) {
          return true;
        }
      }
    } catch (_) {}
    return false;
  }, [userProfile]);

  const isUserAuthenticated = checkIsUserAuthenticated();

  const getCachedData = <T,>(key: string, fallback: T): T => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed as unknown as T;
        }
      }
    } catch (e) {
      console.warn(`Error reading cached ${key}:`, e);
    }
    return fallback;
  };

  const sortModulesAlphabetically = (mods: TestModule[]) => {
    return [...mods].sort((a, b) =>
      (a.title || '').localeCompare(b.title || '', 'pt-AO', {
        sensitivity: 'base',
        numeric: true,
      })
    );
  };

  const [testModules, setTestModules] = useState<TestModule[]>(() =>
    sortModulesAlphabetically(getCachedData('ngola_test_modules', TEST_MODULES))
  );
  const [questionsPool, setQuestionsPool] = useState<Question[]>(() =>
    getCachedData('ngola_questions_pool', MOCK_QUESTIONS)
  );
  const [categories, setCategories] = useState<Category[]>(() =>
    getCachedData('ngola_categories', HOME_CATEGORIES)
  );
  const [specializations, setSpecializations] = useState<Specialization[]>(() =>
    getCachedData('ngola_specializations', SPECIALIZATIONS)
  );
  const [isDataLoading, setIsDataLoading] = useState<boolean>(() => {
    // If we have cached categories, we don't need a full blocking loader
    return !localStorage.getItem('ngola_categories');
  });
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSpecialization, setSelectedSpecialization] = useState<Specialization | null>(null);

  // Load modules, questions, categories, specs, and user profile from Supabase on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [fetchedMods, fetchedQuestions, fetchedCats, fetchedSpecs, fetchedPass] = await Promise.all([
          fetchTestModules(),
          fetchQuestions(),
          fetchCategories(),
          fetchSpecializations(),
          fetchAdminPassword(),
        ]);
        if (fetchedMods && fetchedMods.length > 0) setTestModules(sortModulesAlphabetically(fetchedMods));
        if (fetchedQuestions && fetchedQuestions.length > 0) setQuestionsPool(fetchedQuestions);
        if (fetchedCats && fetchedCats.length > 0) setCategories(fetchedCats);
        if (fetchedSpecs && fetchedSpecs.length > 0) setSpecializations(fetchedSpecs);
        if (fetchedPass) {
          setAdminPassword(fetchedPass);
          localStorage.setItem('ngola_admin_password', fetchedPass);
        }

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
      } finally {
        setIsDataLoading(false);
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
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('ngola_admin_authenticated') === 'true';
    } catch (_) {
      return false;
    }
  });

  const checkIsAdminAuthenticated = useCallback(() => {
    if (isAdminAuthenticated) return true;
    try {
      return sessionStorage.getItem('ngola_admin_authenticated') === 'true';
    } catch (_) {
      return false;
    }
  }, [isAdminAuthenticated]);

  const [showAdminModal, setShowAdminModal] = useState<boolean>(false);

  // Announcements & Notification System state
  const [announcements, setAnnouncements] = useState<AdminAnnouncement[]>([]);
  const [readAnnouncementIds, setReadAnnouncementIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`ngola_read_ann_${userProfile.phone}`);
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });

  const loadAnnouncements = useCallback(async () => {
    try {
      const data = await fetchAdminAnnouncements();
      if (data) {
        setAnnouncements(data);
      }
    } catch (e) {
      console.warn('Erro ao carregar comunicados do administrador:', e);
    }
  }, []);

  // Synthesized notification chime (Web Audio API)
  const playNotificationChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12); // A5

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (_) {}
  }, []);

  // Real-Time Active Subscription (SSE + Supabase Realtime + BroadcastChannel + Auto-poll)
  useEffect(() => {
    const unsubscribe = subscribeToRealtimeAnnouncements((freshData) => {
      setAnnouncements(freshData);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Sync user-specific read keys when userProfile.phone changes
  useEffect(() => {
    if (userProfile.phone) {
      try {
        const savedRead = localStorage.getItem(`ngola_read_ann_${userProfile.phone}`);
        setReadAnnouncementIds(savedRead ? JSON.parse(savedRead) : []);
      } catch (_) {}
    }
  }, [userProfile.phone]);

  // Calculate unread notifications count for the current user with normalized targeting
  const userAnnouncements = useMemo(() => {
    return announcements.filter((a) =>
      isAnnouncementForUser(a, userProfile.phone, userProfile.email)
    );
  }, [announcements, userProfile.phone, userProfile.email]);

  const unreadAnnouncementsCount = useMemo(() => {
    return userAnnouncements.filter((a) => !readAnnouncementIds.includes(a.id)).length;
  }, [userAnnouncements, readAnnouncementIds]);

  // Synchronize native App Icon Badge, Favicon badge, and title with unread notifications count
  useEffect(() => {
    updateAppBadge(unreadAnnouncementsCount);
  }, [unreadAnnouncementsCount]);

  // Listen for real-time user profile updates from Admin, activation or Supabase
  useEffect(() => {
    const handleUserUpdated = (e: any) => {
      if (e?.detail) {
        setUserProfile(e.detail);
      }
    };
    window.addEventListener('ngola-user-updated', handleUserUpdated);
    return () => window.removeEventListener('ngola-user-updated', handleUserUpdated);
  }, []);

  // Trigger system notification & audio chime when a new unread announcement arrives
  useEffect(() => {
    if (unreadAnnouncementsCount > 0 && userAnnouncements.length > 0) {
      const firstUnread = userAnnouncements.find((a) => !readAnnouncementIds.includes(a.id));
      if (firstUnread) {
        const lastNotifiedId = sessionStorage.getItem('ngola_last_notified_ann_id');
        if (lastNotifiedId !== firstUnread.id) {
          sessionStorage.setItem('ngola_last_notified_ann_id', firstUnread.id);
          playNotificationChime();
          sendNativeNotification(
            firstUnread.title || 'NgolaTeste: Novo Comunicado do Administrador',
            firstUnread.content || 'Você recebeu uma nova mensagem oficial.',
            firstUnread.mediaUrl || '/official_logo.png'
          );
        }
      }
    }
  }, [unreadAnnouncementsCount, userAnnouncements, readAnnouncementIds, playNotificationChime]);

  const handleMarkAnnouncementAsRead = useCallback((id: string) => {
    setReadAnnouncementIds((prev) => {
      if (prev.includes(id)) return prev;
      const updated = [...prev, id];
      try {
        localStorage.setItem(`ngola_read_ann_${userProfile.phone}`, JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
  }, [userProfile.phone]);

  const handleMarkAllAnnouncementsAsRead = useCallback(() => {
    const allIds = userAnnouncements.map((a) => a.id);
    const updated = Array.from(new Set([...readAnnouncementIds, ...allIds]));
    setReadAnnouncementIds(updated);
    try {
      localStorage.setItem(`ngola_read_ann_${userProfile.phone}`, JSON.stringify(updated));
    } catch (_) {}
  }, [userAnnouncements, readAnnouncementIds, userProfile.phone]);

  // Active exam state
  const [activeQuestions, setActiveQuestions] = useState<Question[]>(MOCK_QUESTIONS);
  const [activeTestTitle, setActiveTestTitle] = useState<string>('Simulado Geral');
  const [lastExamQuestions, setLastExamQuestions] = useState<Question[]>([]);
  const [lastExamTitle, setLastExamTitle] = useState<string>('Simulado');
  const [lastExamModule, setLastExamModule] = useState<TestModule | null>(null);
  const [lastExamResult, setLastExamResult] = useState<ExamResult | null>(null);

  // Synchronize initial browser history entry if not already set
  useEffect(() => {
    const state = typeof window !== 'undefined' ? (window.history.state as AppNavState | null) : null;
    if (!state || !state.screen) {
      replaceNavHistory({
        screen: currentScreen,
        categoryId: selectedCategory?.id || initialNav.categoryId || null,
        specializationId: selectedSpecialization?.id || initialNav.specializationId || null,
        stepIndex: 0,
      });
    } else {
      navStepCountRef.current = state.stepIndex || 0;
    }
  }, []);

  // Sync category / specialization if restored from history / hash
  useEffect(() => {
    const state = typeof window !== 'undefined' ? (window.history.state as AppNavState | null) : null;
    const catId = state?.categoryId || initialNav.categoryId;
    const specId = state?.specializationId || initialNav.specializationId;

    if (catId && categories.length > 0 && !selectedCategory) {
      const foundCat = categories.find(
        (c) => c.id.toLowerCase() === catId.toLowerCase() || c.name.toLowerCase() === catId.toLowerCase()
      );
      if (foundCat) setSelectedCategory(foundCat);
    }

    if (specId && specializations.length > 0 && !selectedSpecialization) {
      const foundSpec = specializations.find(
        (s) => s.id.toLowerCase() === specId.toLowerCase() || s.title.toLowerCase() === specId.toLowerCase()
      );
      if (foundSpec) setSelectedSpecialization(foundSpec);
    }
  }, [categories, specializations]);

  // Handle Browser / Native Phone Back and Forward Navigation (popstate)
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const state = e.state as AppNavState | null;

      if (state && state.screen) {
        navStepCountRef.current = state.stepIndex ?? Math.max(0, navStepCountRef.current - 1);

        if (!checkIsUserAuthenticated() && state.screen !== 'login' && state.screen !== 'admin') {
          setCurrentScreen('login');
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }

        if (state.screen === 'admin' && !checkIsAdminAuthenticated()) {
          setShowAdminModal(true);
          return;
        }

        setCurrentScreen(state.screen);

        if (state.categoryId) {
          const cat = categories.find((c) => c.id === state.categoryId) || null;
          setSelectedCategory(cat);
        } else {
          setSelectedCategory(null);
        }

        if (state.specializationId) {
          const spec = specializations.find((s) => s.id === state.specializationId) || null;
          setSelectedSpecialization(spec);
        } else {
          setSelectedSpecialization(null);
        }

        if (state.testTitle) {
          setActiveTestTitle(state.testTitle);
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        // Popped to root / initial entry
        const isCurrentlyHome = currentScreen === 'home' || currentScreen === 'login';

        if (isCurrentlyHome) {
          // Double-back-to-exit protection on phone / mobile browser
          const now = Date.now();
          if (now - lastBackPressRef.current < 2500) {
            // Allow exit/close
            return;
          }

          // First back tap on root screen: show prompt and re-arm
          lastBackPressRef.current = now;
          setShowExitToast(true);
          if (exitToastTimeoutRef.current) clearTimeout(exitToastTimeoutRef.current);
          exitToastTimeoutRef.current = setTimeout(() => setShowExitToast(false), 2500);

          pushNavHistory({
            screen: isUserAuthenticated ? 'home' : 'login',
            stepIndex: 0,
          });
          return;
        }

        // Stepped back to root from an inner screen
        navStepCountRef.current = 0;
        const targetScreen: Screen = isUserAuthenticated ? 'home' : 'login';
        setCurrentScreen(targetScreen);
        setSelectedCategory(null);
        setSelectedSpecialization(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [categories, specializations, isUserAuthenticated, isAdminAuthenticated, currentScreen]);

  // Navigation handlers
  const handleNavigate = useCallback(
    (
      screen: Screen,
      options?: {
        category?: Category | null;
        specialization?: Specialization | null;
        testTitle?: string;
        replace?: boolean;
      }
    ) => {
      // If not authenticated and trying to access any screen other than login or admin, force login
      if (!checkIsUserAuthenticated() && screen !== 'login' && screen !== 'admin') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setCurrentScreen('login');
        replaceNavHistory({ screen: 'login', stepIndex: 0 });
        return;
      }

      if (screen === 'admin' && !checkIsAdminAuthenticated()) {
        setShowAdminModal(true);
        return;
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });
      setCurrentScreen(screen);

      let nextCat = selectedCategory;
      if (options && 'category' in options) {
        nextCat = options.category ?? null;
        setSelectedCategory(nextCat);
      } else if (screen === 'home') {
        nextCat = null;
        setSelectedCategory(null);
      }

      let nextSpec = selectedSpecialization;
      if (options && 'specialization' in options) {
        nextSpec = options.specialization ?? null;
        setSelectedSpecialization(nextSpec);
      } else if (screen === 'home' || (screen === 'categories' && (!options || !('specialization' in options)))) {
        nextSpec = null;
        setSelectedSpecialization(null);
      }

      const nextTestTitle = options?.testTitle || activeTestTitle;
      if (options?.testTitle) {
        setActiveTestTitle(options.testTitle);
      }

      if (options?.replace) {
        replaceNavHistory({
          screen,
          categoryId: nextCat?.id || null,
          specializationId: nextSpec?.id || null,
          testTitle: nextTestTitle,
          stepIndex: navStepCountRef.current,
        });
      } else {
        navStepCountRef.current += 1;
        pushNavHistory({
          screen,
          categoryId: nextCat?.id || null,
          specializationId: nextSpec?.id || null,
          testTitle: nextTestTitle,
          stepIndex: navStepCountRef.current,
        });
      }
    },
    [isUserAuthenticated, isAdminAuthenticated, selectedCategory, selectedSpecialization, activeTestTitle]
  );

  const handleBack = useCallback(() => {
    if (navStepCountRef.current > 0) {
      window.history.back();
      return;
    }

    // Fallback if at step 0 or accessed directly
    if (currentScreen === 'categories') {
      if (selectedCategory) {
        handleNavigate('categories', { category: null });
      } else {
        handleNavigate('home');
      }
    } else if (currentScreen === 'tests') {
      handleNavigate('categories', { category: selectedCategory });
    } else if (currentScreen === 'exam') {
      handleNavigate('tests', { category: selectedCategory, specialization: selectedSpecialization });
    } else if (currentScreen === 'result') {
      handleNavigate('tests', { category: selectedCategory, specialization: selectedSpecialization });
    } else if (currentScreen === 'activation') {
      if (selectedSpecialization) {
        handleNavigate('categories', { category: selectedCategory });
      } else {
        handleNavigate('home');
      }
    } else if (currentScreen === 'profile' || currentScreen === 'admin') {
      handleNavigate('home');
    } else if (currentScreen === 'login') {
      if (isUserAuthenticated) handleNavigate('home');
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentScreen, selectedCategory, selectedSpecialization, isUserAuthenticated, handleNavigate]);

  const handleCategoryClick = (cat: Category | null) => {
    handleNavigate('categories', {
      category: cat,
      specialization: null,
    });
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
    return checkIsCategoryFree(cat, categories);
  };

  const handleSpecializationClick = (spec: Specialization) => {
    // Find parent category to sync selectedCategory
    const normSpecCatId = (spec.categoryId || '').toLowerCase().trim();
    const normSpecCatName = (spec.categoryName || '').toLowerCase().trim();
    const parentCategory = categories.find(
      (c) =>
        (normSpecCatId && (c.id.toLowerCase().trim() === normSpecCatId || c.name.toLowerCase().trim() === normSpecCatId)) ||
        (normSpecCatName && (c.name.toLowerCase().trim() === normSpecCatName || c.id.toLowerCase().trim() === normSpecCatName)) ||
        (selectedCategory && selectedCategory.id === c.id)
    );
    const targetCategory = parentCategory || selectedCategory;

    const access = evaluateCategoryAccess(targetCategory, userProfile, spec, categories);

    if (access.isComingSoon) {
      alert('Em breve aguardando exames. Esta categoria aguarda a publicação oficial dos simulados.');
      return;
    }

    if (access.canAccess) {
      handleNavigate('tests', { category: targetCategory, specialization: spec });
    } else {
      alert(access.message || 'Completou as suas 5 simulações gratuitas nesta categoria. Para continuar a testar, por favor ative a sua inscrição.');
      handleNavigate('activation', { category: targetCategory, specialization: spec });
    }
  };

  const handleUpdateAdminPassword = (newPass: string) => {
    setAdminPassword(newPass);
    localStorage.setItem('ngola_admin_password', newPass);
    saveAdminPassword(newPass);
  };

  const handleUpdateAdminRecoveryEmail = (newEmail: string) => {
    setAdminRecoveryEmail(newEmail);
    localStorage.setItem('ngola_admin_recovery_email', newEmail);
  };

  const handleLockAdmin = () => {
    try {
      sessionStorage.removeItem('ngola_admin_authenticated');
    } catch (_) {}
    setIsAdminAuthenticated(false);
    handleNavigate('home');
  };

  const handleStartExam = (categoryOrSubject?: string) => {
    if (userProfile.isBlocked) {
      alert(`O seu acesso ao sistema está bloqueado por comportamento irregular.\nMotivo: ${userProfile.blockedReason || 'Suspeita de irregularidade'}.\nEntre em contacto com o suporte.`);
      handleNavigate('profile');
      return;
    }

    const targetCat = categoryOrSubject
      ? categories.find(
          (c) =>
            c.id.toLowerCase().trim() === categoryOrSubject.toLowerCase().trim() ||
            c.name.toLowerCase().trim() === categoryOrSubject.toLowerCase().trim() ||
            categoryOrSubject.toLowerCase().includes(c.name.toLowerCase()) ||
            c.name.toLowerCase().includes(categoryOrSubject.toLowerCase())
        )
      : selectedCategory;

    const access = evaluateCategoryAccess(targetCat || selectedCategory, userProfile, selectedSpecialization, categories);

    if (access.isComingSoon) {
      alert('Em breve aguardando exames. Esta categoria aguarda a publicação oficial dos simulados.');
      return;
    }

    if (!access.canAccess) {
      alert(access.message || 'Completou as suas 5 simulações gratuitas nesta categoria. Para continuar a testar, por favor ative a sua inscrição.');
      handleNavigate('activation', { category: targetCat || selectedCategory, specialization: selectedSpecialization });
      return;
    }

    let filtered: Question[] = [];
    if (categoryOrSubject && categoryOrSubject !== 'geral' && categoryOrSubject !== 'rapido') {
      const cleanCat = categoryOrSubject.toLowerCase().trim();
      filtered = questionsPool.filter(
        (q) =>
          (q.category && (q.category.toLowerCase().includes(cleanCat) || cleanCat.includes(q.category.toLowerCase()))) ||
          (q.moduleId && q.moduleId.toLowerCase().includes(cleanCat))
      );
      if (filtered.length === 0) {
        filtered = MOCK_QUESTIONS.filter(
          (q) => q.category && (q.category.toLowerCase().includes(cleanCat) || cleanCat.includes(q.category.toLowerCase()))
        );
      }
    } else if (categoryOrSubject === 'rapido') {
      filtered = questionsPool.slice(0, 10);
    } else {
      filtered = questionsPool;
    }

    const finalQuestions = filtered.length > 0 ? filtered : MOCK_QUESTIONS;
    const finalTitle =
      categoryOrSubject === 'rapido'
        ? 'Simulado Rápido'
        : categoryOrSubject && categoryOrSubject !== 'geral'
        ? `Simulado de ${categoryOrSubject}`
        : 'Simulado Geral Nacional';

    setActiveQuestions(finalQuestions);
    setActiveTestTitle(finalTitle);
    setLastExamQuestions(finalQuestions);
    setLastExamTitle(finalTitle);
    setLastExamModule(null);
    handleNavigate('exam');
  };

  const handleStartExamModule = (module: TestModule) => {
    if (userProfile.isBlocked) {
      alert(`O seu acesso ao sistema está bloqueado por comportamento irregular.\nMotivo: ${userProfile.blockedReason || 'Suspeita de irregularidade'}.\nEntre em contacto com o suporte.`);
      handleNavigate('profile');
      return;
    }

    // Check if parent category or module category has access
    const matchingCat = categories.find(
      (c) =>
        (module.category && (c.id.toLowerCase() === module.category.toLowerCase() || c.name.toLowerCase() === module.category.toLowerCase())) ||
        (selectedCategory && selectedCategory.id === c.id) ||
        (selectedSpecialization && (selectedSpecialization.categoryId === c.id || selectedSpecialization.categoryName?.toLowerCase() === c.name.toLowerCase()))
    );

    const access = evaluateCategoryAccess(matchingCat || selectedCategory, userProfile, selectedSpecialization, categories);

    if (access.isComingSoon) {
      alert('Em breve aguardando exames. Esta categoria aguarda a publicação oficial dos simulados.');
      return;
    }

    if (!access.canAccess) {
      alert(access.message || 'Completou as suas 5 simulações gratuitas nesta categoria. Para continuar a testar, por favor ative a sua inscrição.');
      handleNavigate('activation', { category: matchingCat || selectedCategory, specialization: selectedSpecialization });
      return;
    }

    // 1. Direct match by moduleId
    const cleanModId = String(module.id).toLowerCase().trim();
    const cleanModTitle = (module.title || '').toLowerCase().trim();
    const cleanModCat = (module.category || '').toLowerCase().trim();
    const cleanSpecTitle = (selectedSpecialization?.title || '').toLowerCase().trim();
    const cleanCatName = (selectedCategory?.name || '').toLowerCase().trim();

    // Priority 1: questions directly associated to this module ID
    let matchedQuestions = questionsPool.filter(
      (q) => q.moduleId && String(q.moduleId).toLowerCase().trim() === cleanModId
    );

    // Priority 2: questions matching module category, specialization title, or category name
    if (matchedQuestions.length === 0) {
      matchedQuestions = questionsPool.filter((q) => {
        const qCat = (q.category || '').toLowerCase().trim();
        if (cleanModCat && (qCat.includes(cleanModCat) || cleanModCat.includes(qCat))) return true;
        if (cleanSpecTitle && (qCat.includes(cleanSpecTitle) || cleanSpecTitle.includes(qCat))) return true;
        if (cleanCatName && (qCat.includes(cleanCatName) || cleanCatName.includes(qCat))) return true;
        if (cleanModTitle && qCat && cleanModTitle.includes(qCat)) return true;
        return false;
      });
    }

    // Priority 3: check MOCK_QUESTIONS for this category/specialization
    if (matchedQuestions.length === 0) {
      matchedQuestions = MOCK_QUESTIONS.filter((q) => {
        const qCat = (q.category || '').toLowerCase().trim();
        if (cleanModCat && (qCat.includes(cleanModCat) || cleanModCat.includes(qCat))) return true;
        if (cleanSpecTitle && (qCat.includes(cleanSpecTitle) || cleanSpecTitle.includes(qCat))) return true;
        if (cleanCatName && (qCat.includes(cleanCatName) || cleanCatName.includes(qCat))) return true;
        return false;
      });
    }

    // Priority 4: If no questions exist yet in the database for this specific module/specialization,
    // generate relevant questions for this specific module instead of mixing all unrelated questions from other careers!
    if (matchedQuestions.length === 0) {
      const topicName = selectedSpecialization?.title || module.category || module.title;
      matchedQuestions = [
        {
          id: `dyn-${cleanModId}-1`,
          category: topicName,
          banca: 'MINMED / MED • 2025',
          statement: `No âmbito de ${topicName}, qual dos seguintes princípios fundamentais orienta a atuação e a conformidade técnica dos profissionais desta área?`,
          options: [
            `Aplicação rigorosa das normas técnicas, ética profissional e legislação vigente de ${topicName}.`,
            'Desconsideração dos protocolos oficiais em situações de rotina administrativa.',
            'Aplicação exclusiva de critérios subjetivos sem fundamentação teórica.',
            'Supressão dos procedimentos de verificação e controle de qualidade.'
          ],
          correctIndex: 0,
          explanation: `A atuação na área de ${topicName} exige estrita observância às normas técnicas, regulamentos e ética da profissão.`
        },
        {
          id: `dyn-${cleanModId}-2`,
          category: topicName,
          banca: 'Concurso Público Geral • 2024',
          statement: `Em relação aos procedimentos e boas práticas em ${topicName}, assinale a opção correta:`,
          options: [
            'O planejamento e a avaliação contínua são essenciais para garantir a eficácia dos processos.',
            'A ausência de documentação é recomendada para agilizar os fluxos operacionais.',
            'O cumprimento das metas independe do conhecimento específico da legislação aplicável.',
            'A capacitação continuada dos servidores é dispensável após a fase de admissão.'
          ],
          correctIndex: 0,
          explanation: 'O planejamento estratégico e a avaliação constante são pilares para a qualidade e eficácia no serviço público.'
        },
        {
          id: `dyn-${cleanModId}-3`,
          category: topicName,
          banca: 'IASP • 2025',
          statement: `Qual é o objetivo principal das diretrizes oficiais estabelecidas para ${topicName} no contexto dos concursos públicos em Angola?`,
          options: [
            'Assegurar a padronização, a legalidade, a eficiência e o mérito técnico na prestação do serviço público.',
            'Restringir o acesso dos cidadãos aos serviços prestados pelo Estado.',
            'Substituir a legislação nacional por regulamentos informais.',
            'Eliminar a necessidade de prestação de contas aos órgãos fiscalizadores.'
          ],
          correctIndex: 0,
          explanation: 'As diretrizes oficiais visam garantir a eficiência, transparência, mérito e qualidade dos serviços prestados ao público.'
        }
      ];
    }

    setActiveQuestions(matchedQuestions);
    setActiveTestTitle(module.title);
    setLastExamQuestions(matchedQuestions);
    setLastExamTitle(module.title);
    setLastExamModule(module);
    handleNavigate('exam');
  };

  const handleRestartLastExam = () => {
    if (lastExamQuestions && lastExamQuestions.length > 0) {
      setActiveQuestions(lastExamQuestions);
      setActiveTestTitle(lastExamTitle || 'Simulado');
      handleNavigate('exam', { testTitle: lastExamTitle || 'Simulado' });
    } else if (lastExamModule) {
      handleStartExamModule(lastExamModule);
    } else {
      handleStartExam();
    }
  };

  const handleFinishExam = (result: ExamResult) => {
    setLastExamResult(result);
    saveExamResult(result, userProfile.phone);

    // Record simulation for category trials tracking (5 free simulations)
    const catIdentifier = selectedCategory?.id || selectedCategory?.name || result.categoryName || 'geral';
    recordCategorySimulation(catIdentifier, userProfile.phone);

    // Update daily questions stats & last simulation date
    const formattedSimDate = result.date || new Date().toLocaleDateString('pt-AO');
    setUserProfile((prev) => {
      const updated = {
        ...prev,
        dailyCompletedQuestions: Math.min(prev.dailyCompletedQuestions + result.total, prev.dailyGoalQuestions),
        totalTestsTaken: prev.totalTestsTaken + 1,
        lastSimulationDate: formattedSimDate,
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
    setTestModules((prev) => {
      const withoutExisting = prev.filter((m) => m.id !== newModule.id);
      return sortModulesAlphabetically([newModule, ...withoutExisting]);
    });
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
    localStorage.removeItem('ngola_current_user');
    setUserProfile({
      name: '',
      phone: '',
      email: '',
      isActivated: false,
      dailyGoalQuestions: 30,
      dailyCompletedQuestions: 0,
      totalTestsTaken: 0,
      averageScore: 0,
    });
    handleNavigate('login', { replace: true });
  };


  return (
    <div className="min-h-screen bg-[#F0F7FF] text-slate-900 font-sans antialiased flex flex-col">
      {/* Universal Top Header (hidden on exam view, login, and admin view which has its own toolbar) */}
      {currentScreen !== 'exam' && currentScreen !== 'login' && currentScreen !== 'admin' && (
        <Header
          currentScreen={currentScreen}
          onNavigate={handleNavigate}
          showBack={currentScreen !== 'home'}
          onBack={handleBack}
          showSearch={currentScreen === 'home' || currentScreen === 'tests'}
          onSearchClick={() => handleNavigate('categories')}
          unreadCount={unreadAnnouncementsCount}
        />
      )}

      {/* Dynamic Screen View */}
      <main className="flex-grow">
        {currentScreen === 'home' && (
          <HomeView
            categories={categories}
            userProfile={userProfile}
            isLoading={isDataLoading}
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
            onBack={handleBack}
          />
        )}

        {currentScreen === 'tests' && (
          <TestModulesView
            modules={testModules}
            categories={categories}
            selectedCategory={selectedCategory}
            selectedSpecialization={selectedSpecialization}
            userProfile={userProfile}
            onNavigate={handleNavigate}
            onStartExamModule={handleStartExamModule}
            onBack={handleBack}
          />
        )}

        {currentScreen === 'exam' && (
          <ExamView
            questions={activeQuestions}
            categoryTitle={activeTestTitle}
            onNavigate={handleNavigate}
            onFinishExam={handleFinishExam}
            onBack={handleBack}
          />
        )}

        {currentScreen === 'result' && (
          <ResultView
            userProfile={userProfile}
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
            onRestartExam={handleRestartLastExam}
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
            onBack={handleBack}
          />
        )}

        {currentScreen === 'login' && (
          <LoginView
            onNavigate={handleNavigate}
            canGoBack={isUserAuthenticated}
            onBack={handleBack}
            onLoginSuccess={(userData) => {
              setUserProfile(userData);
              try {
                localStorage.setItem('ngola_current_user', JSON.stringify(userData));
              } catch (_) {}
              window.scrollTo({ top: 0, behavior: 'smooth' });
              setCurrentScreen('home');
              setSelectedCategory(null);
              setSelectedSpecialization(null);
              replaceNavHistory({ screen: 'home', stepIndex: 0 });
            }}
          />
        )}

        {currentScreen === 'profile' && (
          <ProfileView
            userProfile={userProfile}
            onNavigate={handleNavigate}
            onLogout={handleLogout}
            announcements={announcements}
            unreadCount={unreadAnnouncementsCount}
            readIds={readAnnouncementIds}
            onMarkAsRead={handleMarkAnnouncementAsRead}
            onMarkAllAsRead={handleMarkAllAnnouncementsAsRead}
            onRefreshAnnouncements={loadAnnouncements}
          />
        )}

        {currentScreen === 'admin' && (
          <AdminView
            modules={testModules}
            categories={categories}
            specializations={specializations}
            questions={questionsPool}
            currentUserProfile={userProfile}
            onUpdateUserProfile={(profile) => setUserProfile(profile)}
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
            onBack={handleBack}
          />
        )}
      </main>

      {/* Admin Authentication Password Modal */}
      <AdminAuthModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        onSuccess={() => {
          try {
            sessionStorage.setItem('ngola_admin_authenticated', 'true');
          } catch (_) {}
          setIsAdminAuthenticated(true);
          setShowAdminModal(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setCurrentScreen('admin');
          setSelectedCategory(null);
          setSelectedSpecialization(null);
          navStepCountRef.current += 1;
          pushNavHistory({
            screen: 'admin',
            stepIndex: navStepCountRef.current,
          });
        }}
        adminPassword={adminPassword}
        onResetPassword={handleUpdateAdminPassword}
      />

      {/* Bottom Navigation Bar */}
      {currentScreen !== 'login' && isUserAuthenticated && (
        <BottomNav
          currentScreen={currentScreen}
          onNavigate={handleNavigate}
          unreadCount={unreadAnnouncementsCount}
        />
      )}

      {/* Back-to-Exit Toast Notification on Mobile / Phone */}
      {showExitToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-2xl backdrop-blur-md pointer-events-none transition-all border border-slate-700/60 flex items-center gap-2">
          <span className="material-symbols-outlined text-sm text-blue-400">arrow_back</span>
          <span>Pressione voltar novamente para sair do aplicativo</span>
        </div>
      )}
    </div>
  );
}

export default App;
