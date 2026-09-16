import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Load Supabase URL and Key from environment variables — no hardcoded defaults.
const getEnvVar = (key: string): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return '';
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] ⚠️ URL or Anon Key is missing. Check your .env file. Running in offline-only mode.');
}

// Create and export the Supabase client (a no-op placeholder if unconfigured)
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

export const supabaseAvailable = Boolean(supabaseUrl && supabaseAnonKey);

