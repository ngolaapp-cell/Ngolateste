import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const sanitizeSupabaseUrl = (rawUrl: string): string => {
  if (!rawUrl) return '';
  let url = rawUrl.trim();
  // Remove wrapping quotes
  url = url.replace(/^["']|["']$/g, '');
  // Remove /rest/v1 or /rest/v1/ or /auth/v1 or /graphql etc.
  url = url.replace(/\/rest\/v1\/?$/i, '');
  url = url.replace(/\/auth\/v1\/?$/i, '');
  url = url.replace(/\/graphql\/v1\/?$/i, '');
  // Remove all trailing slashes
  url = url.replace(/\/+$/, '');
  return url;
};

export const sanitizeSupabaseKey = (rawKey: string): string => {
  if (!rawKey) return '';
  let key = rawKey.trim();
  // Remove wrapping quotes or spaces
  key = key.replace(/^["']|["']$/g, '');
  return key;
};

export const getSupabaseConfig = () => {
  const rawUrl = import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('ngola_supabase_url') || '';
  const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('ngola_supabase_key') || '';
  
  const url = sanitizeSupabaseUrl(rawUrl);
  const key = sanitizeSupabaseKey(rawKey);

  // If local storage had an un-sanitized url (e.g. with /rest/v1), fix it in storage
  if (rawUrl && rawUrl !== url && typeof window !== 'undefined') {
    localStorage.setItem('ngola_supabase_url', url);
  }

  return { url, key };
};

export const isSupabaseConfigured = (): boolean => {
  const { url, key } = getSupabaseConfig();
  return Boolean(
    url &&
    key &&
    url.startsWith('http') &&
    !url.includes('your-project-ref') &&
    !url.includes('your-supabase-project')
  );
};

let clientInstance: SupabaseClient | null = null;
let lastUrl = '';
let lastKey = '';

export const getSupabaseClient = (): SupabaseClient | null => {
  if (!isSupabaseConfigured()) return null;
  const { url, key } = getSupabaseConfig();
  if (!clientInstance || lastUrl !== url || lastKey !== key) {
    lastUrl = url;
    lastKey = key;
    clientInstance = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return clientInstance;
};

export const resetSupabaseClient = () => {
  clientInstance = null;
  lastUrl = '';
  lastKey = '';
};

// Dynamic proxy ensuring `supabase` is never stale even if credentials are set dynamically
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop: string | symbol) {
    const client = getSupabaseClient();
    if (!client) {
      if (prop === 'from') {
        return (table: string) => {
          console.warn(`[Supabase] Chamada para a tabela "${table}" ignorada: Supabase não está configurado.`);
          return {
            select: async () => ({ data: null, error: new Error('Supabase não configurado') }),
            insert: async () => ({ data: null, error: new Error('Supabase não configurado') }),
            upsert: async () => ({ data: null, error: new Error('Supabase não configurado') }),
            update: async () => ({ data: null, error: new Error('Supabase não configurado') }),
            delete: async () => ({ data: null, error: new Error('Supabase não configurado') }),
          };
        };
      }
      return undefined;
    }
    const val = (client as any)[prop];
    if (typeof val === 'function') {
      return val.bind(client);
    }
    return val;
  },
});


