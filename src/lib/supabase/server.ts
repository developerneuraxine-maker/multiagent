import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv, SUPABASE_CONFIG_ERROR } from "./env";

export async function createClient() {
  const { url, anonKey, isConfigured } = getSupabaseEnv();

  if (!isConfigured || !url || !anonKey) {
    throw new Error(SUPABASE_CONFIG_ERROR);
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from Server Component — middleware handles refresh
        }
      },
    },
  });
}

export async function createServiceClient() {
  const { url, serviceRoleKey, isConfigured } = getSupabaseEnv();

  if (!isConfigured || !url || !serviceRoleKey) {
    throw new Error(SUPABASE_CONFIG_ERROR);
  }

  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, serviceRoleKey);
}
