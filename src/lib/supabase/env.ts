const PLACEHOLDER_VALUES = new Set([
  "your_supabase_project_url",
  "your_supabase_anon_key",
  "your_supabase_service_role_key",
]);

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed || PLACEHOLDER_VALUES.has(trimmed)) return undefined;
  return trimmed;
}

export function getSupabaseEnv() {
  const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const serviceRoleKey = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  const isValidUrl =
    typeof url === "string" &&
    (url.startsWith("http://") || url.startsWith("https://"));

  return {
    url: isValidUrl ? url : null,
    anonKey: anonKey || null,
    serviceRoleKey: serviceRoleKey || null,
    isConfigured: isValidUrl && !!anonKey,
  };
}

export const SUPABASE_CONFIG_ERROR =
  "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local (real values from Supabase dashboard), save the file, then restart npm run dev.";
