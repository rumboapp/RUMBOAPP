import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

// Checks if the user has updated the placeholders with real credentials in the environment variables
export const isSupabaseConfigured = !!(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'TU_SUPABASE_URL_AQUI' && 
  supabaseAnonKey !== 'TU_SUPABASE_ANON_KEY_AQUI'
);

export let isSupabaseSyncError = false;
export const setSupabaseSyncError = (val: boolean) => {
  isSupabaseSyncError = val;
};

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
