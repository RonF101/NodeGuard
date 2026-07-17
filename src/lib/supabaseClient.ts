import { createClient, SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;

export function isNodeGuardDemoMode() {
  return process.env.NEXT_PUBLIC_NODEGUARD_DEMO_MODE === "true";
}

export function isSupabaseConfigured() {
  if (isNodeGuardDemoMode()) return false;
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function getSupabaseClient() {
  if (!isSupabaseConfigured()) return null;
  if (!cachedClient) {
    const isServer = typeof window === "undefined";
    const serverServiceKey = isServer
      ? process.env.SUPABASE_SERVICE_ROLE_KEY
      : undefined;
    cachedClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serverServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: !isServer,
          autoRefreshToken: !isServer,
          detectSessionInUrl: !isServer,
        },
      },
    );
  }
  return cachedClient;
}
