import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Load Supabase URL and Key from environment variables — no hardcoded defaults.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] ⚠️ URL or Anon Key is missing. Check your .env file. Running in offline-only mode.');
}

// Create and export the Supabase client (a no-op placeholder if unconfigured)
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

export const supabaseAvailable = Boolean(supabaseUrl && supabaseAnonKey);

