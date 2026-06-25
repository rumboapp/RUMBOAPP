import { createClient } from '@supabase/supabase-js';

// @ts-ignore
const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
// @ts-ignore
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Clean surrounding quotes if any are present
const cleanValue = (val: string) => {
  let cleaned = val.trim();
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(1, -1);
  }
  if (cleaned.startsWith("'") && cleaned.endsWith("'")) {
    cleaned = cleaned.slice(1, -1);
  }
  return cleaned.trim();
};

export const supabaseUrl = cleanValue(rawUrl);
export const supabaseAnonKey = cleanValue(rawKey);

export const isSupabaseConfigured = !!(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'TU_SUPABASE_URL_AQUI' && 
  supabaseAnonKey !== 'TU_SUPABASE_ANON_KEY_AQUI' &&
  !supabaseUrl.includes('YOUR_PROJECT_ID') &&
  !supabaseAnonKey.includes('YOUR_ANON_PUBLISHABLE_KEY') &&
  supabaseUrl.startsWith('http')
);

// Safe diagnostic inside the browser console to help troubleshoot
console.log('🔌 Supabase Config Diagnostic:', {
  hasUrl: !!supabaseUrl,
  urlStartsWithHttp: supabaseUrl.startsWith('http'),
  urlLength: supabaseUrl.length,
  hasKey: !!supabaseAnonKey,
  keyLength: supabaseAnonKey.length,
  isConfigured: isSupabaseConfigured
});

let supabaseInstance = null;
if (isSupabaseConfigured) {
  try {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    });
  } catch (err) {
    console.error('Error al inicializar el cliente de Supabase:', err);
  }
}

export const supabase = supabaseInstance;

export function getSupabaseErrorMessage(error: any): string {
  if (!error) return 'Error desconocido';
  const msg = error.message || String(error);
  if (msg.includes('Invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if (msg.includes('Email not confirmed')) return 'Tu correo no ha sido confirmado. Revisa tu bandeja de entrada.';
  if (msg.includes('User already registered')) return 'Este correo ya está registrado. Intenta iniciar sesión.';
  if (msg.includes('Password should be at least 8 characters')) return 'La contraseña debe tener al menos 8 caracteres.';
  if (msg.includes('Unable to validate')) return 'Datos de acceso inválidos.';
  return msg;
}
