// Backend settings, baked in at build time from GitHub repository variables
// (see SETUP.md). Both values are public: reads are open and writes need the admin password.
export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '') ?? ''
export const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? ''
export const HAS_BACKEND = Boolean(SUPABASE_URL && SUPABASE_KEY)
