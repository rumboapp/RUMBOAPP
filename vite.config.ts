import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import dotenv from 'dotenv';

import fs from 'fs';

// Load environment variables
dotenv.config();

// Sync environment variables from process.env to .env to make sure Vite reads them reliably.
const envVarsToSync = {
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.SUPABASE_KEY || '',
  VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '',
  VITE_MERCADOPAGO_PREMIUM_URL: process.env.VITE_MERCADOPAGO_PREMIUM_URL || '',
  VITE_MERCADOPAGO_PRO_URL: process.env.VITE_MERCADOPAGO_PRO_URL || '',
};

if (envVarsToSync.VITE_SUPABASE_URL && envVarsToSync.VITE_SUPABASE_ANON_KEY) {
  let envContent = '';
  for (const [key, val] of Object.entries(envVarsToSync)) {
    if (val) {
      envContent += `${key}="${val}"\n`;
    }
  }
  fs.writeFileSync('.env', envContent);
  console.log('💾 Automatically synced environment variables from process.env into .env');
  dotenv.config(); // Reload env
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.SUPABASE_KEY || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

const mpPremiumUrl = process.env.VITE_MERCADOPAGO_PREMIUM_URL || '';
const mpProUrl = process.env.VITE_MERCADOPAGO_PRO_URL || '';

console.log('🔌 Vite Config: Supabase URL detected =', supabaseUrl ? 'YES' : 'NO');
console.log('🔌 Vite Config: Supabase Anon Key detected =', supabaseAnonKey ? 'YES text-length: ' + supabaseAnonKey.length : 'NO');

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
