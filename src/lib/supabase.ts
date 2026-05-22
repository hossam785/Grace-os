import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

let supabaseClient: ReturnType<typeof createClient>;

if (process.env.NODE_ENV === "production") {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });
} else {
  const globalRef = globalThis as any;
  if (!globalRef.supabaseInstance) {
    globalRef.supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  supabaseClient = globalRef.supabaseInstance;
}

export const supabase = supabaseClient;
