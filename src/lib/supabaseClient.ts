import { createClient, SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;

export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function getSupabaseClient() {
  if (!isSupabaseConfigured()) return null;
  if (!cachedClient) {
    const serverServiceKey = typeof window === "undefined" ? process.env.SUPABASE_SERVICE_ROLE_KEY : undefined;
    cachedClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serverServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
      }
    );
  }
  return cachedClient;
}
