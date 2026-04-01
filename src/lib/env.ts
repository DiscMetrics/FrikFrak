const requiredEnvKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "AUTH_SECRET",
] as const;

export function isSupabaseConfigured() {
  return requiredEnvKeys.every((key) => Boolean(process.env[key]));
}

export function getRequiredEnv(name: (typeof requiredEnvKeys)[number]) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}
