"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Users, Key, AlertTriangle, CheckCircle, LayoutDashboard, Menu, X, Database, Loader2, LogOut } from "lucide-react";

interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
}

export default function AdminDashboard() {
  const [adminUser, setAdminUser] = useState<string | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [keys, setKeys] = useState({
    key_1: "",
    key_2: "",
    key_3: "",
    key_4: "",
    key_5: "",
    active_key_index: 1
  });
  
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [systemStatus, setSystemStatus] = useState<"stable" | "all_down">("stable");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  // 🔒 الخطوة 3: حماية الصفحة والتحقق من جلسة الـ localStorage للمسؤول
  useEffect(() => {
    const verifyDashboardAdmin = async () => {
      const isAuth = localStorage.getItem("is_grace_dashboard_admin");
      const storedEmail = localStorage.getItem("dashboard_admin_email");

      // لو مش أدمن أو مش مسجل دخول من صفحة اللوجين، ارميه بره فوراً
      if (isAuth !== "true" || !storedEmail) {
        window.location.replace("/dashboard/login");
        return;
      }

      setAdminUser(storedEmail);

      try {
        // 🌟 التعديل السحري الحاسم لجدول الـ profiles: لتفادي كراش الـ never في السيرفر
        const supabaseProfilesBypass: any = supabase.from("profiles");
        const { data: pData } = await supabaseProfilesBypass.select("id, name, email");
        if (pData) setUsers(pData);

        // 🌟 التعديل السحري الحاسم لجدول الـ system_settings: فصل الاستدعاء وعمل casting لتدمير الـ never تماماً
        const supabaseSettingsBypass: any = supabase.from("system_settings");
        const { data: sData } = await supabaseSettingsBypass.select("*").eq("id", 1).single();
        
        if (sData) {
          const safeData = sData as any;
          setKeys({
            key_1: safeData.key_1 || "",
            key_2: safeData.key_2 || "",
            key_3: safeData.key_3 || "",
            key_4: safeData.key_4 || "",
            key_5: safeData.key_5 || "",
            active_key_index: safeData.active_key_index || 1
          });
          const hasAnyKey = [safeData.key_1, safeData.key_2, safeData.key_3, safeData.key_4, safeData.key_5].some(k => k && k.trim() !== "");
          setSystemStatus(hasAnyKey ? "stable" : "all_down");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    verifyDashboardAdmin();
  }, []);

  // دالة حفظ المفاتيح والـ active index
  const handleSaveSettings = async () => {
    setSaveLoading(true);
    try {
      // 🌟 التعديل السحري الحاسم للـ update: استخدام الـ Variable Bypass لمنع تفتيش الـ Compiler
      const supabaseUpdateBypass: any = supabase.from("system_settings");
      const { error } = await supabaseUpdateBypass
        .update({
          key_1: keys.key_1,
          key_2: keys.key_2,
          key_3: keys.key_3,
          key_4: keys.key_4,
          key_5: keys.key_5,
          active_key_index: keys.active_key_index
        })
        .eq("id", 1);

      if (!error) {
        const hasAnyKey = [keys.key_1, keys.key_2, keys.key_3, keys.key_4, keys.key_5].some(k => k && k.trim() !== "");
        setSystemStatus(hasAnyKey ? "stable" : "all_down");
        setAlertMessage("🎉 تم حفظ وتحديث مصفوفة الـ system_settings بنجاح!");
        setTimeout(() => setAlertMessage(""), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaveLoading(false);
    }
  };

  // زرار الخروج يمسح الجلسة الإدارية ويرجعك للوجين
  const handleAdminSignOut = () => {
    localStorage.removeItem("is_grace_dashboard_admin");
    localStorage.removeItem("dashboard_admin_email");
    window.location.replace("/dashboard/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07040e] flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="animate-spin text-purple-500 mx-auto" size={36} />
          <p className="text-xs text-purple-300/40 tracking-widest">تأمين الاتصال وبناء النواة الفاخرة...</p>
        </div>
      </div>
    );
  }

  const apiKeysList = [
    { index: 1, field: "key_1", label: "المفتاح الأساسي (1)" },
    { index: 2, field: "key_2", label: "المفتاح الاحتياطي (2)" },
    { index: 3, field: "key_3", label: "المفتاح الاحتياطي (3)" },
    { index: 4, field: "key_4", label: "المفتاح الاحتياطي (4)" },
    { index: 5, field: "key_5", label: "المفتاح الاحتياطي (5)" },
  ];

  return (
    <div className="min-h-screen bg-[#07040e] text-purple-100 font-sans flex flex-col lg:flex-row relative overflow-x-hidden select-none">
      
      {/* التنبيه العلوي الفخم */}
      <AnimatePresence>
        {alertMessage && (
          <motion.div initial={{ opacity: 0, y: -20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.95 }} className="fixed top-6 left-4 right-4 z-50 max-w-md mx-auto">
            <div className="p-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl text-xs font-bold text-center shadow-2xl border border-purple-400/20 shadow-purple-600/20 tracking-wide">{alertMessage}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* هيدر الموبايل الأنيق */}
      <header className="lg:hidden bg-[#0d071a]/80 backdrop-blur-xl border-b border-purple-950/40 p-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl text-white shadow-lg"><Sparkles size={16} /></div>
          <span className="font-extrabold text-sm tracking-wide bg-gradient-to-l from-purple-100 to-purple-300 bg-clip-text text-transparent">Grace OS</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-purple-300 bg-purple-500/5 border border-purple-500/10 rounded-xl transition-all">
          {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </header>

      {/* Sidebar الإدارة الاحترافي عالي الجودة - متوافق تماماً مع جميع الشاشات */}
      <aside className={`fixed lg:sticky top-[61px] lg:top-0 right-0 z-40 w-full lg:w-66 h-[calc(100vh-61px)] lg:h-screen bg-[#0e081c]/95 lg:bg-[#0c0718]/60 backdrop-blur-2xl border-l border-purple-950/40 p-6 flex flex-col justify-between transition-transform duration-300 ease-out ${isMobileMenuOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}`}>
        <div className="space-y-8">
          <div className="hidden lg:flex items-center gap-3 flex-row-reverse justify-end pb-4 border-b border-purple-950/30">
            <div className="p-2.5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl text-white shadow-xl shadow-purple-500/10"><Sparkles size={16} /></div>
            <div className="text-right">
              <h1 className="text-sm font-black tracking-wider bg-gradient-to-l from-purple-100 via-purple-300 to-indigo-200 bg-clip-text text-transparent">Grace OS</h1>
              <span className="text-[9px] bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold px-2 py-0.5 rounded-full mt-0.5 inline-block">HQ PANEL</span>
            </div>
          </div>
          <nav className="space-y-1.5">
            <div className="flex items-center justify-between px-4 py-3 bg-purple-500/10 text-purple-200 font-bold rounded-xl text-xs flex-row-reverse border border-purple-500/20 shadow-inner">
              <div className="flex items-center gap-3 flex-row-reverse">
                <LayoutDashboard size={15} className="text-purple-400" />
                <span className="tracking-wide">لوحة تحكم النواة</span>
              </div>
            </div>
          </nav>
        </div>
        
        <div className="space-y-4 text-center border-t border-purple-950/40 pt-4">
          <div className="text-[10px] font-bold text-purple-300/30 truncate tracking-wide bg-purple-950/40 p-2 rounded-lg border border-purple-950" dir="ltr">ROOT: {adminUser}</div>
          <button onClick={handleAdminSignOut} className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-500/5 hover:bg-red-500/10 text-red-400 border border-red-500/10 rounded-xl text-xs font-bold transition-all duration-150">
            <LogOut size={13} />
            <span>قطع الاتصال الآمن</span>
          </button>
        </div>
      </aside>

      {/* المحتوى الرئيسي الزجاجي المتناسق */}
      <main className="flex-1 p-4 md:p-8 lg:p-10 space-y-6 md:space-y-8 overflow-y-auto text-right relative z-10" dir="rtl">
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-purple-600/5 blur-[120px] pointer-events-none" />
        
        <div>
          <h2 className="text-xl md:text-2xl font-black tracking-wide bg-gradient-to-l from-purple-50 via-purple-200 to-indigo-100 bg-clip-text text-transparent">إعدادات النظام العليا (System Settings)</h2>
          <p className="text-xs md:text-sm text-purple-300/40 mt-1 font-medium tracking-wide">إعادة تدوير وإدارة مصفوفة الـ 5 مفاتيح الكلية ومراقبة تمدد قاعدة البيانات</p>
        </div>

        {/* الكروت الإحصائية الـ VIP */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
          <div className={`p-5 rounded-2xl border backdrop-blur-2xl flex items-start gap-4 shadow-xl transition-all duration-200 ${systemStatus === 'all_down' ? 'bg-red-500/5 border-red-500/10 text-red-200 shadow-red-950/20' : 'bg-emerald-500/5 border-emerald-500/15 text-emerald-200 shadow-black/20'}`}>
            <div className={`p-2.5 rounded-xl text-white shadow-lg shrink-0 ${systemStatus === 'all_down' ? 'bg-red-500 shadow-red-500/20' : 'bg-emerald-600 shadow-emerald-500/20'}`}>{systemStatus === 'all_down' ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}</div>
            <div>
              <h4 className="font-bold text-xs md:text-sm tracking-wide">حالة مصفوفة المفاتيح الكلية</h4>
              <p className="text-[11px] md:text-xs mt-1.5 opacity-60 leading-relaxed font-medium">{systemStatus === 'stable' ? `المصفوفة مستقرة بالكامل وتعمل بالمفتاح النشط رقم (${keys.active_key_index})` : '🚨 تحذير أمني: الـ 5 مفاتيح فارغة تماماً، المحرك متوقف!'}</p>
            </div>
          </div>

          <div className="bg-[#120a21]/40 border border-purple-950/60 p-5 rounded-2xl backdrop-blur-2xl flex items-start gap-4 shadow-xl shadow-black/20 text-purple-100">
            <div className="p-2.5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl text-white shadow-lg shadow-purple-500/10 shrink-0"><Users size={16} /></div>
            <div>
              <h4 className="font-bold text-xs md:text-sm tracking-wide">المشتركين الموثقين بالنواة</h4>
              <p className="text-2xl md:text-3xl font-black mt-1 text-purple-400 tracking-wider">{users.length}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          
          {/* جدول المشتركين المطور مظهرياً ليكون فخم للغاية وغير مكرر */}
          <section className="xl:col-span-5 bg-[#110a1f]/40 backdrop-blur-2xl border border-purple-950/50 rounded-2xl p-5 md:p-6 shadow-xl shadow-black/10 space-y-4">
            <h3 className="font-bold text-purple-200 flex items-center gap-2.5 text-sm md:text-base border-b border-purple-950/40 pb-3"><Users size={16} className="text-purple-400" /> هويات المشتركين</h3>
            <div className="overflow-x-auto w-full custom-scrollbar">
              <table className="w-full text-xs md:text-sm text-right text-purple-200/70">
                <thead className="text-[10px] md:text-xs uppercase font-bold text-purple-300/40 bg-[#0c0717]/60 tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-right rounded-r-xl">الاسم الرسمي</th>
                    <th className="px-4 py-3 text-right rounded-l-xl">البريد الإلكتروني المربوط</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-950/30">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="text-center py-6 text-[11px] text-purple-300/20">لا يوجد مستخدمين مسجلين حالياً.</td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id} className="hover:bg-purple-950/20 transition-colors group">
                        <td className="px-4 py-3 font-bold text-purple-200 text-[12.5px] group-hover:text-purple-100 transition-colors">{u.name || "مستشار غير مسمى"}</td>
                        <td className="px-4 py-3 font-mono text-[11px] text-purple-400/50 group-hover:text-purple-400/80 transition-colors tracking-wide" dir="ltr">{u.email}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* تدوير وتحرير المفاتيح الـ 5 بلمسة سوبر لوكس فائقة الفخامة */}
          <section className="xl:col-span-7 bg-[#110a1f]/40 backdrop-blur-2xl border border-purple-950/50 rounded-2xl p-5 md:p-6 shadow-xl shadow-black/10 space-y-5">
            <h3 className="font-bold text-purple-200 flex items-center gap-2.5 text-sm md:text-base border-b border-purple-950/40 pb-3"><Key size={16} className="text-purple-400" /> مصفوفة تدوير الـ 5 مفاتيح المشفرة</h3>
            <div className="space-y-3.5">
              {apiKeysList.map((item) => (
                <div key={item.index} className="p-4 bg-[#0a0514]/70 border border-purple-950/40 rounded-xl space-y-2 transition-all duration-200 focus-within:border-purple-500/20">
                  <div className="flex justify-between items-center flex-row-reverse">
                    <span className="text-[11px] font-bold text-purple-300/60 tracking-wide">{item.label}</span>
                    <button 
                      type="button"
                      onClick={() => setKeys({...keys, active_key_index: item.index})}
                      className={`text-[10px] px-3 py-1 rounded-full font-black tracking-wide transition-all duration-150 shadow-sm ${keys.active_key_index === item.index ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-inner' : 'bg-purple-950/40 text-purple-400/40 border border-transparent hover:bg-purple-950 hover:text-purple-300'}`}
                    >
                      {keys.active_key_index === item.index ? '🌟 النشط بالنظام' : 'تعيين كنشط'}
                    </button>
                  </div>
                  <input 
                    type="password" 
                    value={(keys as any)[item.field]} 
                    onChange={(e) => setKeys({ ...keys, [item.field]: e.target.value })} 
                    placeholder="ألصق كود المفتاح السري المخصص بأمان..." 
                    className="w-full bg-[#110a1f]/80 border border-purple-950/60 focus:border-purple-500/30 rounded-lg py-2.5 px-3 text-xs font-mono outline-none text-purple-300 placeholder-purple-300/10 text-left focus:bg-[#140e24] transition-all tracking-widest" 
                  />
                </div>
              ))}
            </div>
            
            {/* زر الحفظ الإداري والاتصال بالقاعدة */}
            <button onClick={handleSaveSettings} disabled={saveLoading} className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl py-3 px-4 shadow-lg shadow-purple-600/10 flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.98] text-xs md:text-sm mt-4 tracking-wide">
              {saveLoading ? <Loader2 className="animate-spin text-purple-200" size={15} /> : <Database size={15} />}
              <span>تثبيت ومزامنة مصفوفة الـ settings فوراً</span>
            </button>
          </section>
        </div>
      </main>
    </div>
  );
}
