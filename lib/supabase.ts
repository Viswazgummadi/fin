// Supabase helpers will be wired once you provide project credentials.
// These placeholders keep the app structure ready.

export const isSupabaseConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
