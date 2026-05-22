"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Sparkles, Mail, Lock, User, Loader2, ArrowLeft } from "lucide-react";

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  
  // تزويد متغير الاسم هنا
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (isForgotPassword) {
        // 🔄 استعادة كلمة السر
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (resetError) throw resetError;
        setMessage("📩 تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني بنجاح.");
      } else if (isSignUp) {
        // 📝 إنشاء حساب جديد: نمرر البريد، كلمة السر، والاسم جوه الـ options
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name, // هنا بيتم حفظ الاسم في الـ metadata أوتوماتيك للبروفايل
            }
          }
        });
        if (signUpError) throw signUpError;
        if (data.user) window.location.replace("/chat");
      } else {
        // 🔑 تسجيل دخول لحساب موجود
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        if (data.user) window.location.replace("/chat");
      }
    } catch (err: any) {
      setError(err.message || "حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#06030d] flex items-center justify-center p-4 font-sans relative overflow-hidden select-none" dir="rtl">
      
      {/* طبقات الإضاءة الخلفية العميقة الـ VIP الموحدة للبراند */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-purple-600/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/5 blur-[130px] pointer-events-none" />

      {/* كارت الـ Auth الزجاجي الفاخر والمتحول تلقائياً */}
      <div className="w-full max-w-md bg-[#110a1f]/40 backdrop-blur-2xl rounded-[2rem] p-8 md:p-10 border border-purple-950/40 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] relative z-10 text-right space-y-6 transition-all duration-300">
        
        {/* الهيدر واللوجو المطور بنصوص احترافية */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3.5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl text-white shadow-xl shadow-purple-500/10 mb-2">
            <Sparkles size={22} className="animate-pulse" />
          </div>
          <h2 className="text-xl font-black tracking-wide bg-gradient-to-l from-purple-100 via-purple-300 to-indigo-200 bg-clip-text text-transparent">
            {isForgotPassword ? "استعادة الحساب" : isSignUp ? "إنشاء حساب جديد" : "تسجيل الدخول إلى Grace OS"}
          </h2>
          <p className="text-[11px] text-purple-300/40 font-medium tracking-wide">
            {isForgotPassword ? "أدخل بريدك الإلكتروني لإرسال رابط تعيين كلمة المرور" : "مرحباً بك، يرجى إدخال بيانات الاعتماد للوصول إلى المنصة"}
          </p>
        </div>

        {/* رسائل التنبيه والخطأ المنسقة */}
        {error && (
          <div className="p-3.5 bg-red-500/5 border border-red-500/10 text-red-400 text-xs font-semibold rounded-xl text-center tracking-wide leading-relaxed">
            {error}
          </div>
        )}
        {message && (
          <div className="p-3.5 bg-emerald-500/5 border border-emerald-500/15 text-emerald-400 text-xs font-semibold rounded-xl text-center tracking-wide leading-relaxed">
            {message}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          
          {/* 🌟 خانة الاسم بالكامل في حالة إنشاء حساب جديد */}
          {isSignUp && !isForgotPassword && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-purple-300/50 block mr-1 tracking-wide">الاسم بالكامل</label>
              <div className="relative flex items-center">
                <User className="absolute right-4 text-purple-400/30" size={15} />
                <input 
                  type="text" 
                  required 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="أدخل اسمك الثلاثي..." 
                  className="w-full bg-[#0c0717]/80 border border-purple-950/60 focus:border-purple-500/30 focus:shadow-[0_0_15px_rgba(147,51,234,0.05)] rounded-xl py-3 pr-11 pl-4 text-xs outline-none text-purple-100 transition-all text-right placeholder-purple-300/10 tracking-wide" 
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-purple-300/50 block mr-1 tracking-wide">البريد الإلكتروني</label>
            <div className="relative flex items-center">
              <Mail className="absolute right-4 text-purple-400/30" size={15} />
              <input 
                type="email" 
                required 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="example@domain.com" 
                className="w-full bg-[#0c0717]/80 border border-purple-950/60 focus:border-purple-500/30 focus:shadow-[0_0_15px_rgba(147,51,234,0.05)] rounded-xl py-3 pr-11 pl-4 text-xs outline-none text-purple-100 transition-all text-left font-mono placeholder-purple-300/10 tracking-wide" 
              />
            </div>
          </div>

          {!isForgotPassword && (
            <div className="space-y-1.5">
              <div className="flex justify-between items-center px-1">
                <label className="text-xs font-bold text-purple-300/50 tracking-wide">كلمة المرور</label>
                {!isSignUp && (
                  <button type="button" onClick={() => { setIsForgotPassword(true); setError(""); setMessage(""); }} className="text-[11px] font-bold text-purple-400 hover:text-purple-300 transition-colors">
                    نسيت كلمة المرور؟
                  </button>
                )}
              </div>
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
          )}

          {/* زر الاعتماد والولوج الرئيسي بنصوص احترافية */}
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-purple-950/40 disabled:to-indigo-950/40 disabled:text-purple-300/20 text-white font-bold rounded-xl py-3 flex items-center justify-center gap-2 text-xs shadow-lg shadow-purple-600/10 transition-all duration-150 active:scale-[0.98] pt-3 tracking-wide"
          >
            {loading ? (
              <Loader2 className="animate-spin text-purple-300" size={15} />
            ) : (
              <span className="font-bold">{isForgotPassword ? "إرسال رابط استعادة الحساب" : isSignUp ? "تأكيد التسجيل والدخول" : "تسجيل الدخول"}</span>
            )}
          </button>
        </form>

        {/* تذييل الكارت للتبديل السلس وبنصوص رسمية شيك */}
        <div className="text-center pt-4 border-t border-purple-950/40">
          {isForgotPassword ? (
            <button type="button" onClick={() => { setIsForgotPassword(false); setError(""); setMessage(""); }} className="text-xs text-purple-400 font-bold flex items-center gap-1.5 mx-auto hover:text-purple-300 transition-colors">
              <ArrowLeft size={13} /> العودة لصفحة تسجيل الدخول
            </button>
          ) : (
            <button type="button" onClick={() => { setIsSignUp(!isSignUp); setError(""); setMessage(""); }} className="text-xs text-purple-400 font-bold hover:text-purple-300 transition-colors tracking-wide">
              {isSignUp ? "لديك حساب بالفعل؟ سجل دخولك الآن" : "ليس لديك حساب؟ اضغط لإنشاء حساب جديد"}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}