import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Fallbacks are provided, but prefer environment keys from platform config
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.SUPABASE_KEY || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

const mpPremiumUrl = process.env.VITE_MERCADOPAGO_PREMIUM_URL || '';
const mpProUrl = process.env.VITE_MERCADOPAGO_PRO_URL || '';

console.log('🔌 Vite Config: Supabase URL detected =', supabaseUrl ? 'YES' : 'NO');
console.log('🔌 Vite Config: Supabase Anon Key detected =', supabaseAnonKey ? 'YES' : 'NO');

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
      'import.meta.env.VITE_MERCADOPAGO_PREMIUM_URL': JSON.stringify(mpPremiumUrl),
      'import.meta.env.VITE_MERCADOPAGO_PRO_URL': JSON.stringify(mpProUrl),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
