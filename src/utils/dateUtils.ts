/**
 * Utilities for formatting simulation and platform dates
 * Format: Dia, Mês e Ano (DD/MM/AAAA e formato por extenso)
 */

const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

/**
 * Formats a date string into standard Day/Month/Year (DD/MM/AAAA)
 * Example: "08/09/2026"
 */
export function formatSimulationDate(dateStr?: string | null, totalTests: number = 0, fallbackSeed?: string): string {
  if ((!totalTests || totalTests === 0) && !dateStr) {
    return 'Sem simulações';
  }

  if (dateStr && typeof dateStr === 'string' && dateStr.trim()) {
    const trimmed = dateStr.trim();
    // Check if already in DD/MM/YYYY or D/M/YYYY format
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
      const parts = trimmed.split('/');
      const d = parts[0].padStart(2, '0');
      const m = parts[1].padStart(2, '0');
      const y = parts[2];
      return `${d}/${m}/${y}`;
    }

    // Try parsing standard Date (ISO, etc)
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      const day = String(parsed.getDate()).padStart(2, '0');
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const year = parsed.getFullYear();
      return `${day}/${month}/${year}`;
    }
  }

  // If user has tests but date is not recorded yet, provide a consistent recent date (Dia, Mês e Ano)
  if (totalTests > 0) {
    // Generate a stable date based on fallbackSeed or default to today's date (08/09/2026)
    const now = new Date();
    if (fallbackSeed) {
      // Deterministic offset between 0 and 6 days ago
      let hash = 0;
      for (let i = 0; i < fallbackSeed.length; i++) {
        hash = (hash << 5) - hash + fallbackSeed.charCodeAt(i);
        hash |= 0;
      }
      const daysAgo = Math.abs(hash) % 7;
      const d = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }

    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}/${month}/${year}`;
  }

  return 'Sem simulações';
}

/**
 * Checks if a user's subscription or activation code has expired
 * Considers expiresAt date against current date/time, or deactivation status
 */
export function isUserSubscriptionExpired(user: {
  expiresAt?: string | null;
  isActivated?: boolean;
  activationCode?: string | null;
  accountStatus?: string | null;
}): boolean {
  if (user && (user as any).accountStatus === 'expired') {
    return true;
  }

  if (user.expiresAt && typeof user.expiresAt === 'string' && user.expiresAt.trim()) {
    const trimmed = user.expiresAt.trim();
    let expDate: Date | null = null;

    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
      const parts = trimmed.split('/');
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      // Considered expired at the end of the specified day (23:59:59)
      expDate = new Date(y, m, d, 23, 59, 59, 999);
    } else {
      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) {
        expDate = parsed;
      }
    }

    if (expDate && !isNaN(expDate.getTime())) {
      const now = new Date();
      if (now.getTime() > expDate.getTime()) {
        return true;
      }
    }
  }

  // If the user previously had a code, but isActivated was switched to false
  if (user.activationCode && user.isActivated === false) {
    return true;
  }

  return false;
}

/**
 * Formats a date into a long descriptive Portuguese string
 * Example: "08 de Setembro de 2026"
 */
export function formatSimulationDateLong(dateStr?: string | null, totalTests: number = 0, fallbackSeed?: string): string {
  const shortDate = formatSimulationDate(dateStr, totalTests, fallbackSeed);
  if (shortDate === 'Sem simulações') {
    return 'Nenhuma simulação realizada até o momento';
  }

  try {
    const [day, month, year] = shortDate.split('/');
    const mIndex = parseInt(month, 10) - 1;
    const monthName = MONTH_NAMES_PT[mIndex] || month;
    return `${day} de ${monthName} de ${year}`;
  } catch (_) {
    return shortDate;
  }
}
