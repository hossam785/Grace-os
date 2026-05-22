"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Lock, Loader2, CheckCircle } from "lucide-react";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // التأكد إن اليوزر جاي برابط صالح من الإيميل
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setError("🚨 الرابط منتهي الصلاحية أو غير صالح، يرجى طلب رابط جديد.");
      }
    };
    checkSession();
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      // تحديث كلمة السر في سوبابيز داتابيز فوراً للحساب الحالي
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      setMessage("🎉 تم تحديث كلمة السر بنجاح في قاعدة البيانات! جاري تحويلك لصفحة اللوجين العادية...");
      
      // عمل تسجيل خروج أمان ثم تحويله للرئيسية بعد 3 ثواني ليعمل لوجين بالجديد
      await supabase.auth.signOut();
      setTimeout(() => {
        window.location.replace("/");
      }, 3500);

    } catch (err: any) {
      setError(err.message || "فشل تحديث كلمة السر.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#06030d] flex items-center justify-center p-4 font-sans relative overflow-hidden select-none" dir="rtl">
      
      {/* طبقات الإضاءة الخلفية العميقة الـ VIP */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-purple-600/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/5 blur-[130px] pointer-events-none" />

      {/* كارت التعيين الزجاجي الفاخر - متوافق تماماً موبايل وشاشة كبيرة */}
      <div className="w-full max-w-md bg-[#110a1f]/40 backdrop-blur-2xl rounded-[2rem] p-8 md:p-10 border border-purple-950/40 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] relative z-10 text-right space-y-6">
        
        {/* الهيدر واللوجو المطور */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3.5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl text-white shadow-xl shadow-purple-500/10 mb-2">
            <Lock size={22} className="animate-pulse" />
          </div>
          <h2 className="text-xl font-black tracking-wide bg-gradient-to-l from-purple-100 via-purple-300 to-indigo-200 bg-clip-text text-transparent">تأمين الحساب العالي</h2>
          <p className="text-[11px] text-purple-300/40 font-medium tracking-wide">قم بتعيين كلمة السر الجديدة لحسابك لتحديثها فوراً بالنواة</p>
        </div>

        {/* رسائل التنبيه والخطأ بتنسيق داكن فاخر */}
        {error && (
          <div className="p-4 bg-red-500/5 border border-red-500/10 text-red-400 text-xs font-semibold rounded-xl text-center tracking-wide leading-relaxed">
            {error}
          </div>
        )}
        
        {message && (
          <div className="p-4 bg-emerald-500/5 border border-emerald-500/15 text-emerald-400 text-xs font-semibold rounded-xl text-center tracking-wide leading-relaxed flex flex-col items-center gap-2">
            <CheckCircle size={16} className="text-emerald-400 animate-bounce" />
            <span>{message}</span>
          </div>
        )}

        {!message && (
          <form onSubmit={handleUpdatePassword} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-purple-300/50 block mr-1 tracking-wide">كلمة السر الجديدة الكلية</label>
              <div className="relative flex items-center">
                <Lock className="absolute right-4 text-purple-400/30" size={15} />
                <input 
                  type="password" 
                  required 
                  minLength={6} 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="اكتب 6 أحرف أو أرقام على الأقل لضمان القوة" 
                  className="w-full bg-[#0c0717]/80 border border-purple-950/60 focus:border-purple-500/30 focus:shadow-[0_0_15px_rgba(147,51,234,0.05)] rounded-xl py-3 pr-11 pl-4 text-xs outline-none text-purple-100 transition-all text-left placeholder-purple-300/10 tracking-wide" 
                />
              </div>
            </div>

            {/* زر التحديث الفاخر */}
            <button 
              type="submit" 
              disabled={loading || !!error} 
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-purple-950/40 disabled:to-indigo-950/40 disabled:text-purple-300/20 text-white font-bold rounded-xl py-3 flex items-center justify-center gap-2 text-xs shadow-lg shadow-purple-600/10 transition-all duration-150 active:scale-[0.98] mt-4 tracking-wide"
            >
              {loading ? (
                <Loader2 className="animate-spin text-purple-300" size={15} />
              ) : (
                <span className="font-bold">تحديث واعتماد المحور الرئيسي 🔓</span>
              )}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}