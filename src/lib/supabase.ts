import { createClient } from '@supabase/supabase-js';

const env = import.meta.env;
const supabaseUrl = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY
  || env.VITE_SUPABASE_ANON_KEY
  || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

const clientUrl = supabaseUrl || 'https://not-configured.supabase.co';
const clientKey = supabaseKey || 'supabase-not-configured';

export const createIsolatedAuthClient = () => createClient(clientUrl, clientKey, {
  auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
});

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    detectSessionInUrl: true,
    persistSession: true,
  },
});
