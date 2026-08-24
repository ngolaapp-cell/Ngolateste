import { Category, Specialization, UserProfile } from '../types';

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
 * Checks if a category status tag represents free/unlocked access
 * Includes: GRÁTIS, GRATIS, FREE, LIVRE, GRATUITO, DESATIVADO, SEM CÓDIGO, ABERTO, ISENTO, etc.
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

  // 3. Admin / VIP / Global plan access
  if (
    userProfile.role === 'admin' ||
    userProfile.isVip === true ||
    userProfile.plan === 'ilimitado'
  ) {
    return true;
  }

  // 4. Activated specializations list
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
