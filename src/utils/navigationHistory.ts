import { Screen } from '../types';

export interface AppNavState {
  screen: Screen;
  categoryId?: string | null;
  specializationId?: string | null;
  testTitle?: string | null;
  stepIndex: number;
  timestamp: number;
}

export function buildNavHash(
  screen: Screen,
  categoryId?: string | null,
  specializationId?: string | null
): string {
  switch (screen) {
    case 'home':
      return '#/home';
    case 'categories':
      return categoryId ? `#/categories/${encodeURIComponent(categoryId)}` : '#/categories';
    case 'tests':
      return specializationId
        ? `#/tests/${encodeURIComponent(specializationId)}`
        : categoryId
        ? `#/tests?cat=${encodeURIComponent(categoryId)}`
        : '#/tests';
    case 'exam':
      return '#/exam';
    case 'result':
      return '#/result';
    case 'activation':
      return specializationId
        ? `#/activation/${encodeURIComponent(specializationId)}`
        : '#/activation';
    case 'profile':
      return '#/profile';
    case 'admin':
      return '#/admin';
    case 'login':
      return '#/login';
    default:
      return '#/home';
  }
}

export function parseNavFromHash(
  hash: string
): { screen: Screen; categoryId?: string | null; specializationId?: string | null } | null {
  if (!hash || hash === '#' || hash === '#/') {
    return null;
  }

  const clean = hash.startsWith('#/') ? hash.slice(2) : hash.startsWith('#') ? hash.slice(1) : hash;
  const [routePart, queryPart] = clean.split('?');
  const segments = routePart.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  const rawScreen = segments[0] as Screen;
  const validScreens: Screen[] = [
    'home',
    'categories',
    'tests',
    'exam',
    'result',
    'activation',
    'login',
    'profile',
    'admin',
  ];

  if (!validScreens.includes(rawScreen)) {
    return null;
  }

  let categoryId: string | null = null;
  let specializationId: string | null = null;

  if (rawScreen === 'categories' && segments[1]) {
    categoryId = decodeURIComponent(segments[1]);
  } else if (rawScreen === 'tests' && segments[1]) {
    specializationId = decodeURIComponent(segments[1]);
  } else if (rawScreen === 'activation' && segments[1]) {
    specializationId = decodeURIComponent(segments[1]);
  }

  if (queryPart) {
    const params = new URLSearchParams(queryPart);
    if (params.has('cat')) categoryId = params.get('cat');
    if (params.has('spec')) specializationId = params.get('spec');
  }

  return {
    screen: rawScreen,
    categoryId,
    specializationId,
  };
}

export function pushNavHistory(state: Omit<AppNavState, 'timestamp'>): void {
  try {
    const fullState: AppNavState = {
      ...state,
      timestamp: Date.now(),
    };
    const hash = buildNavHash(state.screen, state.categoryId, state.specializationId);
    window.history.pushState(fullState, '', hash);
  } catch (err) {
    console.warn('Failed to pushNavHistory:', err);
  }
}

export function replaceNavHistory(state: Omit<AppNavState, 'timestamp'>): void {
  try {
    const fullState: AppNavState = {
      ...state,
      timestamp: Date.now(),
    };
    const hash = buildNavHash(state.screen, state.categoryId, state.specializationId);
    window.history.replaceState(fullState, '', hash);
  } catch (err) {
    console.warn('Failed to replaceNavHistory:', err);
  }
}
