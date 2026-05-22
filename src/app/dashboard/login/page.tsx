"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Sparkles, Mail, Lock, Loader2 } from "lucide-react";

export default function DashboardLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 🔍 الفحص المباشر والحصري من جدول مشرفين الداش بورد الجديد
      const { data, error: dbError } = await supabase
        .from("dashboard_admins")
        .select("*")
        .eq("email", email)
        .eq("password", password)
        .single();

      if (dbError || !data) {
        setError("❌ البريد الإلكتروني أو كلمة المرور غير صحيحة.");
      } else {
        // تثبيت جلسة الإدارة في المتصفح
        localStorage.setItem("is_grace_dashboard_admin", "true");
        localStorage.setItem("dashboard_admin_email", email);
        
        // تحويلك فوراً للداش بورد الرئيسية
        window.location.replace("/dashboard");
      }
    } catch (err) {
      setError("حدث خطأ غير متوقع أثناء الدخول.");
    } finally {
      loading && setLoading(false);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#06030d] flex items-center justify-center p-4 font-sans relative overflow-hidden select-none" dir="rtl">
      
      {/* طبقات الإضاءة الخلفية الفاخرة المخصصة للـ VIP Look */}
      <div className="absolute top-[-25%] left-[-15%] w-[600px] h-[600px] rounded-full bg-purple-600/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-25%] right-[-15%] w-[600px] h-[600px] rounded-full bg-indigo-600/5 blur-[130px] pointer-events-none" />

      {/* كارت الدخول الزجاجي الفاخر - متوافق بالكامل مع الموبايل والشاشات */}
      <div className="w-full max-w-md bg-[#110a1f]/40 backdrop-blur-2xl rounded-[2rem] p-8 md:p-10 border border-purple-950/40 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] relative z-10 text-right">
        
        {/* الهيدر واللوجو المطور */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3.5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl text-white shadow-xl shadow-purple-500/10 mb-3.5">
            <Sparkles size={22} className="animate-pulse" />
          </div>
          <h2 className="text-xl font-black tracking-wide bg-gradient-to-l from-purple-100 via-purple-300 to-indigo-200 bg-clip-text text-transparent">بوابة الإدارة العليا</h2>
          <p className="text-[11px] text-purple-300/40 font-medium mt-1.5 tracking-wide">الوصول حصري للمسؤولين المعينين بالنظام</p>
        </div>

        {/* رسائل الخطأ المنسقة كلياً مع المظهر المظلم */}
        {error && (
          <div className="p-3.5 bg-red-500/5 border border-red-500/10 text-red-400 text-xs font-semibold rounded-xl text-center mb-5 tracking-wide">
            {error}
          </div>
        )}

        {/* فورم الدخول المدعوم بستايل ألترا لوكس */}
        <form onSubmit={handleAdminLogin} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-purple-300/50 block mr-1 tracking-wide">البريد الإلكتروني للإدارة</label>
            <div className="relative flex items-center">
              <Mail className="absolute right-4 text-purple-400/30 group-focus-within:text-purple-400 transition-colors" size={15} />
              <input 
                type="email" 
                required 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="admin@grace.com" 
                className="w-full bg-[#0c0717]/80 border border-purple-950/60 focus:border-purple-500/30 focus:shadow-[0_0_15px_rgba(147,51,234,0.05)] rounded-xl py-3 pr-11 pl-4 text-xs outline-none text-purple-100 transition-all text-left font-mono placeholder-purple-300/10" 
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-purple-300/50 block mr-1 tracking-wide">كلمة السر الصارمة</label>
            <div className="relative flex items-center">
              <Lock className="absolute right-4 text-purple-400/30" size={15} />
              <input 
                type="password" 
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••" 
                className="w-full bg-[#0c0717]/80 border border-purple-950/60 focus:border-purple-500/30 focus:shadow-[0_0_15px_rgba(147,51,234,0.05)] rounded-xl py-3 pr-11 pl-4 text-xs outline-none text-purple-100 transition-all text-left placeholder-purple-300/10 tracking-widest" 
              />
            </div>
          </div>

          {/* زر التثبيت والإرسال الفاخر */}
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-purple-950/40 disabled:to-indigo-950/40 disabled:text-purple-300/20 text-white font-bold rounded-xl py-3 flex items-center justify-center gap-2 text-xs shadow-lg shadow-purple-600/10 transition-all duration-150 active:scale-[0.98] mt-8 tracking-wide"
          >
            {loading ? (
              <Loader2 className="animate-spin text-purple-300" size={15} />
            ) : (
              <span className="font-bold">ولوج آمن للوحة التحكم</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}