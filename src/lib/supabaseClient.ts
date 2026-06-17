import { createClient } from '@supabase/supabase-js';

// @ts-ignore
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
// @ts-ignore
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

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
