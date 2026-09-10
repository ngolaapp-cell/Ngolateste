import { Category, Specialization, UserProfile } from '../types';
import { isUserSubscriptionExpired } from './dateUtils';

/**
 * Normalizes string for comparison (removes accents, lowercase, trim)
 */
export function normalizeText(str?: string | null): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Maximum number of free simulations allowed for "LIBERADO" categories
 */
export const MAX_FREE_SIMULATIONS_PER_CATEGORY = 3;

/**
 * Checks if a category status tag represents 100% free access without payment/code
 */
export function isFreeStatusTag(statusTag?: string | null): boolean {
  if (!statusTag) return false;
  const tag = normalizeText(statusTag);
  return (
    tag === 'gratis' ||
    tag === 'free' ||
    tag === 'livre' ||
    tag === 'gratuito' ||
    tag === 'desativado' ||
    tag === 'sem codigo' ||
    tag === 'aberto' ||
    tag === 'isento' ||
    tag === '0' ||
    tag.includes('gratis') ||
    tag.includes('livre') ||
    tag.includes('desativad') ||
    tag.includes('sem cod')
  );
}

/**
 * Checks if a category status tag is "NOVO" (featured + requires activation password, 0 free tests)
 */
export function isCategoryNew(categoryOrTag?: Category | string | null): boolean {
  if (!categoryOrTag) return false;
  const tag = typeof categoryOrTag === 'string' ? categoryOrTag : categoryOrTag.statusTag;
  if (!tag) return false;
  const norm = normalizeText(tag);
  return norm === 'novo' || norm.includes('novo');
}

/**
 * Checks if a category status tag is "EM BREVE" (awaiting exams)
 */
export function isCategoryComingSoon(categoryOrTag?: Category | string | null): boolean {
  if (!categoryOrTag) return false;
  const tag = typeof categoryOrTag === 'string' ? categoryOrTag : categoryOrTag.statusTag;
  if (!tag) return false;
  const norm = normalizeText(tag);
  return norm === 'em breve' || norm.includes('em breve') || norm.includes('aguardando');
}

/**
 * Gets simulation count completed for a category by the user
 */
export function getCategorySimulationsCount(
  categoryIdOrName?: string | null,
  userPhone?: string | null
): number {
  if (!categoryIdOrName || typeof window === 'undefined') return 0;
  try {
    const key = `ngola_cat_sims_${userPhone ? normalizeText(userPhone) : 'guest'}`;
    const raw = localStorage.getItem(key);
    if (!raw) return 0;
    const map = JSON.parse(raw);
    const normKey = normalizeText(categoryIdOrName);
    return Number(map[normKey] || 0);
  } catch {
    return 0;
  }
}

/**
 * Records (increments) a simulation completed for a category
 */
export function recordCategorySimulation(
  categoryIdOrName?: string | null,
  userPhone?: string | null
): number {
  if (!categoryIdOrName || typeof window === 'undefined') return 0;
  try {
    const key = `ngola_cat_sims_${userPhone ? normalizeText(userPhone) : 'guest'}`;
    const raw = localStorage.getItem(key);
    const map = raw ? JSON.parse(raw) : {};
    const normKey = normalizeText(categoryIdOrName);
    const current = Number(map[normKey] || 0);
    const updated = current + 1;
    map[normKey] = updated;
    localStorage.setItem(key, JSON.stringify(map));
    return updated;
  } catch {
    return 1;
  }
}

/**
 * Detailed category access result
 */
export interface CategoryAccessStatus {
  canAccess: boolean;
  isUnlimitedFree: boolean;
  isActivated: boolean;
  isComingSoon: boolean;
  isTrial: boolean;
  remainingTrials: number;
  usedTrials: number;
  maxTrials: number;
  message?: string;
}

/**
 * Evaluates category access according to the 4 strict types:
 * 1. LIBERADO: 3 free simulations; after this, requires activation password.
 * 2. GRÁTIS: 100% free without inscription or code.
 * 3. NOVO: Highlighted in categories; clicking its modules asks for activation password (0 free simulations).
 * 4. EM BREVE: Awaiting exams.
 */
export function evaluateCategoryAccess(
  category?: Category | null,
  userProfile?: UserProfile | null,
  specialization?: Specialization | null,
  categoriesList: Category[] = []
): CategoryAccessStatus {
  const maxTrials = MAX_FREE_SIMULATIONS_PER_CATEGORY; // 3 free trials for LIBERADO

  // 1. Blocked account
  if (userProfile?.isBlocked) {
    return {
      canAccess: false,
      isUnlimitedFree: false,
      isActivated: false,
      isComingSoon: false,
      isTrial: false,
      remainingTrials: 0,
      usedTrials: 0,
      maxTrials,
      message: 'Conta com acesso bloqueado por comportamento irregular.',
    };
  }

  // Find effective category
  const normCatId = normalizeText(category?.id);
  const normCatName = normalizeText(category?.name);
  const effectiveCat =
    category ||
    categoriesList.find((c) => {
      const cId = normalizeText(c.id);
      const cName = normalizeText(c.name);
      return (
        (normCatId && (cId === normCatId || cName === normCatId)) ||
        (normCatName && (cId === normCatName || cName === normCatName)) ||
        (specialization?.categoryId && normalizeText(c.id) === normalizeText(specialization.categoryId)) ||
        (specialization?.categoryName && normalizeText(c.name) === normalizeText(specialization.categoryName))
      );
    });

  // 2. Check if Category is "EM BREVE" (Aguardando exames)
  if (isCategoryComingSoon(effectiveCat)) {
    return {
      canAccess: false,
      isUnlimitedFree: false,
      isActivated: false,
      isComingSoon: true,
      isTrial: false,
      remainingTrials: 0,
      usedTrials: 0,
      maxTrials,
      message: 'Em breve aguardando exames. Esta categoria está em preparação pela equipa pedagógica.',
    };
  }

  // 3. Check if Category is "GRÁTIS" (100% gratuito sem pagar inscrição ou código)
  if (isFreeStatusTag(effectiveCat?.statusTag)) {
    return {
      canAccess: true,
      isUnlimitedFree: true,
      isActivated: false,
      isComingSoon: false,
      isTrial: false,
      remainingTrials: 9999,
      usedTrials: 0,
      maxTrials,
    };
  }

  // 4. CRITICAL: Rigorous Subscription Expiration Enforcement!
  // Candidates whose subscription/code has expired CANNOT continue using activated specializations or free trials.
  // Whenever they want to use again, it MUST ask for an activation code to purchase and activate again.
  const isExpired = userProfile ? isUserSubscriptionExpired(userProfile) : false;
  if (isExpired && userProfile?.role !== 'admin') {
    return {
      canAccess: false,
      isUnlimitedFree: false,
      isActivated: false,
      isComingSoon: false,
      isTrial: false,
      remainingTrials: 0,
      usedTrials: maxTrials,
      maxTrials,
      message: userProfile?.expiresAt
        ? `A sua subscrição expirou em ${userProfile.expiresAt} e a sua senha de ativação já não é válida. Para voltar a utilizar as especialidades e simulados, por favor adquira e ative um novo código de ativação.`
        : 'O prazo do seu código de ativação expirou. Para voltar a utilizar esta especialidade, por favor adquira e ative um novo código de ativação.',
    };
  }

  // 5. Global platform access (Admin, VIP, Global Plan or Activated Account - ONLY when not expired)
  if (checkHasFullPlatformAccess(userProfile)) {
    return {
      canAccess: true,
      isUnlimitedFree: true,
      isActivated: true,
      isComingSoon: false,
      isTrial: false,
      remainingTrials: 9999,
      usedTrials: 0,
      maxTrials,
    };
  }

  // 6. Check if specialization is explicitly activated
  if (specialization && userProfile && !isExpired) {
    const activatedList = userProfile.activatedSpecializations || [];
    const normSpecId = normalizeText(specialization.id);
    const normSpecTitle = normalizeText(specialization.title);
    const isSpecActivated = activatedList.some((act) => {
      const normAct = normalizeText(act);
      return (
        normAct === normSpecId ||
        normAct === normSpecTitle ||
        normAct === 'all' ||
        normAct === 'todas' ||
        normAct === 'global'
      );
    });
    if (isSpecActivated) {
      return {
        canAccess: true,
        isUnlimitedFree: true,
        isActivated: true,
        isComingSoon: false,
        isTrial: false,
        remainingTrials: 9999,
        usedTrials: 0,
        maxTrials,
      };
    }
  }

  // 7. Check if category is explicitly activated
  if (effectiveCat && userProfile && !isExpired) {
    const activatedList = userProfile.activatedSpecializations || [];
    const normEffectiveCatId = normalizeText(effectiveCat.id);
    const normEffectiveCatName = normalizeText(effectiveCat.name);
    const isCatActivated = activatedList.some((act) => {
      const normAct = normalizeText(act);
      return (
        normAct === normEffectiveCatId ||
        normAct === normEffectiveCatName
      );
    });
    if (isCatActivated) {
      return {
        canAccess: true,
        isUnlimitedFree: true,
        isActivated: true,
        isComingSoon: false,
        isTrial: false,
        remainingTrials: 9999,
        usedTrials: 0,
        maxTrials,
      };
    }
  }

  // 6. Check if Category is "EM BREVE" (Aguardando exames)
  if (isCategoryComingSoon(effectiveCat)) {
    return {
      canAccess: false,
      isUnlimitedFree: false,
      isActivated: false,
      isComingSoon: true,
      isTrial: false,
      remainingTrials: 0,
      usedTrials: 0,
      maxTrials,
      message: 'Em breve aguardando exames. Esta categoria está em preparação pela equipa pedagógica.',
    };
  }

  // 7. Check if Category is "GRÁTIS" (100% gratuito sem pagar inscrição ou código)
  if (isFreeStatusTag(effectiveCat?.statusTag)) {
    return {
      canAccess: true,
      isUnlimitedFree: true,
      isActivated: false,
      isComingSoon: false,
      isTrial: false,
      remainingTrials: 9999,
      usedTrials: 0,
      maxTrials,
    };
  }

  // 8. "NOVO": Quando o utilizador clicar nos módulos que tiver nela, vai pedir senha de ativação, não faz testes grátis
  if (isCategoryNew(effectiveCat)) {
    return {
      canAccess: false,
      isUnlimitedFree: false,
      isActivated: false,
      isComingSoon: false,
      isTrial: false,
      remainingTrials: 0,
      usedTrials: 0,
      maxTrials: 0,
      message: 'Esta categoria do tipo Novo requer senha de ativação. Por favor insira a sua senha de ativação para aceder aos módulos e simulados.',
    };
  }

  // 9. "LIBERADO": Somente a categoria "liberado" faz 3 testes grátis. Após isto, também pede senha de ativação.
  const catIdentifier =
    effectiveCat?.id ||
    effectiveCat?.name ||
    specialization?.categoryId ||
    specialization?.categoryName ||
    'geral';

  const used = getCategorySimulationsCount(catIdentifier, userProfile?.phone);
  const remaining = Math.max(0, maxTrials - used);

  if (remaining > 0) {
    return {
      canAccess: true,
      isUnlimitedFree: false,
      isActivated: false,
      isComingSoon: false,
      isTrial: true,
      remainingTrials: remaining,
      usedTrials: used,
      maxTrials,
    };
  }

  // 10. Trials exhausted (após 3 simulações grátis na categoria liberada)
  return {
    canAccess: false,
    isUnlimitedFree: false,
    isActivated: false,
    isComingSoon: false,
    isTrial: true,
    remainingTrials: 0,
    usedTrials: used,
    maxTrials,
    message: 'Concluiu as suas 3 simulações gratuitas nesta categoria. Para continuar a testar, por favor insira a sua senha de ativação.',
  };
}

/**
 * Checks if a category is free/unlocked
 */
export function checkIsCategoryFree(
  category?: Category | null,
  categoriesList?: Category[]
): boolean {
  if (!category) return false;

  if (isFreeStatusTag(category.statusTag)) return true;

  // If statusTag isn't directly on category, check in categoriesList by ID or Name
  if (categoriesList && categoriesList.length > 0) {
    const normId = normalizeText(category.id);
    const normName = normalizeText(category.name);
    const matched = categoriesList.find((c) => {
      const cId = normalizeText(c.id);
      const cName = normalizeText(c.name);
      return (
        cId === normId ||
        cName === normName ||
        (normId && cName.includes(normId)) ||
        (normName && cId.includes(normName))
      );
    });
    if (matched && isFreeStatusTag(matched.statusTag)) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if a specialization is free/unlocked by checking its parent category or flags
 */
export function checkIsSpecializationFree(
  spec?: Specialization | null,
  categoriesList: Category[] = [],
  selectedCategory?: Category | null
): boolean {
  if (!spec) return false;

  // Direct flag if present
  if ((spec as any).isFree === true || (spec as any).requiresActivation === false) {
    return true;
  }

  // Check selectedCategory first if matched
  if (selectedCategory && checkIsCategoryFree(selectedCategory, categoriesList)) {
    const normSelId = normalizeText(selectedCategory.id);
    const normSelName = normalizeText(selectedCategory.name);
    const normSpecCatId = normalizeText(spec.categoryId);
    const normSpecCatName = normalizeText(spec.categoryName);

    if (
      (!normSpecCatId && !normSpecCatName) ||
      normSpecCatId === normSelId ||
      normSpecCatId === normSelName ||
      normSpecCatName === normSelName ||
      normSpecCatName === normSelId ||
      (normSelName && normSpecCatName && normSelName.includes(normSpecCatName)) ||
      (normSpecCatName && normSelName && normSpecCatName.includes(normSelName))
    ) {
      return true;
    }
  }

  // Find parent category in list
  const normSpecCatId = normalizeText(spec.categoryId);
  const normSpecCatName = normalizeText(spec.categoryName);

  const parent = categoriesList.find((c) => {
    const cId = normalizeText(c.id);
    const cName = normalizeText(c.name);
    return (
      (normSpecCatId &&
        (cId === normSpecCatId ||
          cName === normSpecCatId ||
          cName.includes(normSpecCatId) ||
          normSpecCatId.includes(cName))) ||
      (normSpecCatName &&
        (cName === normSpecCatName ||
          cId === normSpecCatName ||
          cName.includes(normSpecCatName) ||
          normSpecCatName.includes(cName)))
    );
  });

  if (parent && checkIsCategoryFree(parent, categoriesList)) {
    return true;
  }

  return false;
}

/**
 * Checks if a user has full platform access (activated, admin, VIP, or 14-day global unlock)
 */
export function checkHasFullPlatformAccess(userProfile?: UserProfile | null): boolean {
  if (!userProfile) return false;
  if (userProfile.isBlocked) return false;

  // CRITICAL: Subscriptions that have expired CANNOT have full platform access!
  if (isUserSubscriptionExpired(userProfile)) {
    // Only administrators bypass expiration for system management
    if (userProfile.role === 'admin') {
      return true;
    }
    return false;
  }

  if (userProfile.role === 'admin') {
    return true;
  }

  if (
    userProfile.isActivated === true ||
    userProfile.isVip === true ||
    userProfile.plan === 'ilimitado' ||
    userProfile.plan === '14d_todas_especialidades' ||
    userProfile.plan === '14d_completo'
  ) {
    return true;
  }

  const activated = userProfile.activatedSpecializations || [];
  if (
    activated.includes('all') ||
    activated.includes('ALL') ||
    activated.includes('TODAS') ||
    activated.includes('GLOBAL')
  ) {
    return true;
  }

  return false;
}

/**
 * Checks if a specialization is unlocked for a user (either free OR activated)
 */
export function checkIsSpecializationUnlocked(
  spec?: Specialization | null,
  userProfile?: UserProfile | null,
  categoriesList: Category[] = [],
  selectedCategory?: Category | null
): boolean {
  if (!spec) return false;

  // 1. Is it free?
  if (checkIsSpecializationFree(spec, categoriesList, selectedCategory)) {
    return true;
  }

  if (!userProfile) return false;

  // 2. Is user blocked?
  if (userProfile.isBlocked) {
    return false;
  }

  // 3. CRITICAL: Strict Subscription Expiration Check!
  // If the user's subscription or code has expired, their previously activated specializations
  // CANNOT continue to be used. They must acquire and enter a new activation code!
  if (isUserSubscriptionExpired(userProfile) && userProfile.role !== 'admin') {
    return false;
  }

  // 4. Activated user / Admin / VIP / Global plan access (14d all specialties)
  if (checkHasFullPlatformAccess(userProfile)) {
    return true;
  }

  // 5. Activated specializations list (only valid when subscription has not expired)
  const activated = userProfile.activatedSpecializations || [];
  if (
    activated.includes('all') ||
    activated.includes('ALL') ||
    activated.includes('TODAS') ||
    activated.includes('GLOBAL')
  ) {
    return true;
  }

  const normSpecId = normalizeText(spec.id);
  const normSpecTitle = normalizeText(spec.title);
  const normSpecCatId = normalizeText(spec.categoryId);
  const normSpecCatName = normalizeText(spec.categoryName);

  return activated.some((act) => {
    const normAct = normalizeText(act);
    return (
      normAct === normSpecId ||
      normAct === normSpecTitle ||
      (normSpecCatId && normAct === normSpecCatId) ||
      (normSpecCatName && normAct === normSpecCatName) ||
      (normSpecTitle && normAct.includes(normSpecTitle)) ||
      (normSpecTitle && normSpecTitle.includes(normAct))
    );
  });
}
