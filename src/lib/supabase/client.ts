import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv, SUPABASE_CONFIG_ERROR } from "./env";

export function createClient() {
  const { url, anonKey, isConfigured } = getSupabaseEnv();

  if (!isConfigured || !url || !anonKey) {
    throw new Error(SUPABASE_CONFIG_ERROR);
  }

  return createBrowserClient(url, anonKey);
}
