import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// تأمين الكلاينت بنظام الـ Casting لمنع الـ compiler من قراءة index signature مكسور
const getSupabaseClient = () => {
  const globalRef = globalThis as any;
  
  if (!globalRef.supabaseInstance) {
    globalRef.supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return globalRef.supabaseInstance;
};

export const supabase = getSupabaseClient();