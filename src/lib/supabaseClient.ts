import { createClient } from '@supabase/supabase-js';

// @ts-ignore
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
// @ts-ignore
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = !!(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'TU_SUPABASE_URL_AQUI' && 
  supabaseAnonKey !== 'TU_SUPABASE_ANON_KEY_AQUI'
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })
  : null;

export function getSupabaseErrorMessage(error: any): string {
  if (!error) return 'Error desconocido';
  const msg = error.message || String(error);
  if (msg.includes('Invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if (msg.includes('Email not confirmed')) return 'Tu correo no ha sido confirmado. Revisa tu bandeja de entrada.';
  if (msg.includes('User already registered')) return 'Este correo ya está registrado. Intenta iniciar sesión.';
  if (msg.includes('Password should be at least 6 characters')) return 'La contraseña debe tener al menos 6 caracteres.';
  if (msg.includes('Unable to validate')) return 'Datos de acceso inválidos.';
  return msg;
}
