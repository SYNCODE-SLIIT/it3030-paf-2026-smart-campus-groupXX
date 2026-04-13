export interface SupabasePublicEnv {
  url: string;
  anonKey: string;
}

function normalizeEnvValue(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function getSupabasePublicEnv(): SupabasePublicEnv | null {
  const url = normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = normalizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!url || !anonKey) {
    return null;
  }

  return {
    url,
    anonKey,
  };
}

export function hasSupabasePublicEnv() {
  return getSupabasePublicEnv() !== null;
}

export function getSupabaseUrl() {
  return getSupabasePublicEnv()?.url ?? null;
}

export function getSupabaseAnonKey() {
  return getSupabasePublicEnv()?.anonKey ?? null;
}
