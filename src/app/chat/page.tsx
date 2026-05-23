"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { LogOut, Sparkles, Send, User, Loader2, MessageSquare, Plus, Trash2, Image as ImageIcon, X, Menu, Copy, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Conversation {
  id: string;
  title: string;
  created_at: string;
}

interface Message {
  id: string;
  role: "user" | "model";
  text: string;
}

export default function ChatPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // غرف الشات والمحادثة النشطة
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  
  const [inputMessage, setInputMessage] = useState("");
  const [botLoading, setBotLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // الستيتس الخاصة برفع الصور والملفات
  const [attachedImage, setAttachedImage] = useState<string | null>(null); 
  const [imagePreview, setImagePreview] = useState<string | null>(null); 
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ستيت إضافية للتحكم في فتح وغلق القائمة الجانبية على الموبايل دون تداخل مع اللوجيك
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // دالة نسخ النصوص المدمجة بالـ UI
  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // 1. الكشف عن اليوزر وسحب قائمة المحادثات (Conversations) أول ما تفتح الصفحة
  useEffect(() => {
    const initializeChat = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.replace("/");
        return;
      }
      setUser(session.user);

      // 🌟 التعديل السحري الحاسم: تحويل الاستدعاء إلى any لمنع تعارض الـ Schema والـ never تماماً
      const supabaseConversationsBypass: any = supabase.from("conversations");
      const { data: convs } = await supabaseConversationsBypass
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (convs && convs.length > 0) {
        // تفهيم الـ compiler إن المصفوفة مسموح بقراءة الـ id جواها
        const safeConvs = convs as any[];
        setConversations(safeConvs);
        setActiveConvId(safeConvs[0].id); // افتح أحدث محادثة أوتوماتيك
      } else {
        setLoading(false);
      }
    };
    initializeChat();
  }, []);

  // 2. تتبع تغيير الـ Conversation النشط وسحب رسائله التفصيلية من جدول messages
  useEffect(() => {
    const fetchMessages = async () => {
      if (!activeConvId) return;
      setBotLoading(true);

      const supabaseMessagesBypass: any = supabase.from("messages");
      const { data: msgs, error } = await supabaseMessagesBypass
        .select("id, role, text")
        .eq("conversation_id", activeConvId)
        .order("created_at", { ascending: true });

      if (!error && msgs) {
        setMessages(msgs as Message[]);
      }
      setBotLoading(false);
      setLoading(false);
    };

    fetchMessages();
  }, [activeConvId]);

  // Scroll تلقائي لأسفل الشات
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, botLoading]);

  // دالة معالجة وتحويل الصورة المرفوعة إلى Base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImagePreview(URL.createObjectURL(file));
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // دالة تصفير وإلغاء الصورة المرفوعة
  const clearAttachment = () => {
    setAttachedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 3. دالة بدء محادثة جديدة تماماً 
  const handleCreateConversation = async () => {
    if (!user) return;
    
    const supabaseCreateBypass: any = supabase.from("conversations");
    const { data: newConv, error } = await supabaseCreateBypass
      .insert([{ user_id: user.id, title: "محادثة جديدة 📑" }])
      .select()
      .single();

    if (!error && newConv) {
      setConversations(prev => [newConv, ...prev]);
      setActiveConvId(newConv.id);
      setMessages([]);
      setIsSidebarOpen(false); // غلق السايدبار تلقائياً على الموبايل بعد الكرييت لمظهر مريح
    }
  };

  // 4. 🔥 دالة إرسال الرسالة الحقيقية المنظفة تماماً من كراش تكرار الحفظ والـ IDs العشوائية
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputMessage.trim() && !attachedImage) || botLoading) return;

    let currentConvId = activeConvId;
    const userText = inputMessage;
    const sendImage = attachedImage; 
    
    setInputMessage(""); 
    clearAttachment();

    // ✨ [AUTO-SAVE STEP 1]: إنشاء الغرفة فوراً وحفظها إذا لم تكن موجودة
    if (!currentConvId) {
      const titleText = userText ? (userText.slice(0, 20) + "...") : "تحليل صورة...📸";
      const supabaseAutoConvBypass: any = supabase.from("conversations");
      const { data: newConv, error: convError } = await supabaseAutoConvBypass
        .insert([{ user_id: user.id, title: titleText }])
        .select()
        .single();
      
      if (!convError && newConv) {
        currentConvId = newConv.id;
        setConversations([newConv]);
        setActiveConvId(newConv.id);
      } else {
        console.error("فشل الحفظ التلقائي للمحادثة");
        return;
      }
    }

    // 🔒 [تعديل منع التكرار الحاسم]: تم إزالة جملة الـ insert اليدوية لرسالة المستخدم لمنع تكرار الإدخال
    const uniqueUserId = `user-${Date.now()}`;
    setMessages(prev => [...prev, { id: uniqueUserId, role: "user", text: userText }]);
    setBotLoading(true);

    try {
      // 🔒 [قفل تأمين الـ API الجديد]: جلب الـ Session Token وتمريره في الـ Headers لتخطي جدار الحماية بنجاح
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || "";

      // استدعاء الـ API الـ Route الذكي (هو المسؤول عن حفظ رسالة اليوزر ورد البوت مرة واحدة فقط داخل السيرفر)
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ 
          message: userText, 
          conversationId: currentConvId,
          image: sendImage 
        })
      });

      const data = await response.json();
      const botReply = data.reply || data.error || "لم أستطع الحصول على رد من السيرفر.";

      // 🔒 [تعديل منع التكرار الحاسم]: تم إزالة جملة الـ insert اليدوية لرد البوت من هنا لأن السيرفر حفظها بالفعل
      setMessages(prev => [...prev, {
        id: `model-${Date.now()}`,
        role: "model",
        text: botReply,
      }]);

      // تحديث عنوان المحادثة في الجانب لو كانت "محادثة جديدة" دون تدمير الـ messages state
      setConversations(prev => prev.map(c => 
        c.id === currentConvId && (c.title === "محادثة جديدة 📑" || c.title.includes("محادثة جديدة"))
          ? { ...c, title: userText ? (userText.slice(0, 18) + "...") : "تحليل صورة...📸" } 
          : c
      ));

    } catch (err) {
      setMessages(prev => [...prev, { id: `error-${Date.now()}`, role: "model", text: "❌ حدث خطأ في الاتصال بالسيرفر الداخلي." }]);
    } finally {
      setBotLoading(false);
    }
  };

  // 🗑️ دالة حذف محادثة معينة بكل رسايلها من الـ Database فوراً
  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // منع فتح الشات أثناء الضغط على حذف
    if (!confirm("هل تريد حذف هذه المحادثة بالكامل؟")) return;

    // الحذف من جدول الـ Supabase (تأكد أن الـ Foreign Key مضبوط على Cascade ليمسح الرسائل المرتبطة تلقائياً)
    const supabaseDeleteBypass: any = supabase.from("conversations");
    await supabaseDeleteBypass.delete().eq("id", convId);
    setConversations(prev => prev.filter(c => c.id !== convId));
    
    if (activeConvId === convId) {
      setMessages([]);
      setActiveConvId(null);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.replace("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#110c1a] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative flex items-center justify-center">
            <Loader2 className="animate-spin text-purple-500 relative z-10" size={40} />
            <div className="absolute w-10 h-10 bg-purple-500/20 blur-xl rounded-full animate-pulse" />
          </div>
          <p className="text-sm font-medium tracking-wide text-purple-200/60">جاري تحميل السجل الفاخر والمحادثات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#0b0713] flex font-sans relative overflow-hidden select-none" dir="rtl">
      
      {/* طبقة الـ Backdrop لغلق السايدبار عند الضغط خارجها في الموبايل */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar الفخم لـ Super Ultra Luxe / VIP - متوافق تماماً موبايل وشاشة كبيرة */}
      <aside className={`fixed top-0 bottom-0 right-0 w-72 bg-[#120a1f]/95 backdrop-blur-2xl border-l border-purple-950/40 flex flex-col justify-between p-5 z-40 transition-transform duration-300 ease-out shadow-2xl lg:shadow-none lg:static lg:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="space-y-5 flex flex-col h-[85%]">
          
          {/* اللوجو العالي الجودة */}
          <div className="flex items-center gap-3 px-1 py-1 flex-row-reverse justify-end border-b border-purple-950/30 pb-4">
            <div className="p-2.5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl text-white shadow-lg shadow-purple-500/20">
              <Sparkles size={18} className="animate-pulse" />
            </div>
            <div className="text-right">
              <h1 className="text-sm font-extrabold tracking-wider bg-gradient-to-l from-purple-200 via-purple-400 to-indigo-300 bg-clip-text text-transparent">Grace OS</h1>
              <span className="text-[9px] bg-purple-500/10 text-purple-300 border border-purple-500/20 font-bold px-2 py-0.5 rounded-full mt-0.5 inline-block">VIP ULTRA</span>
            </div>
          </div>

          {/* زر إنشاء شات جديد فخم وبدون ستايل AI تقليدي */}
          <button 
            onClick={handleCreateConversation}
            className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs transition-all duration-200 active:scale-[0.98] shadow-lg shadow-purple-600/15"
          >
            <Plus size={14} />
            <span>محادثة راقية جديدة</span>
          </button>

          {/* قائمة الـ Conversations التاريخية المروقة */}
          <div className="flex-1 flex flex-col space-y-1 overflow-hidden pt-2">
            <span className="px-2 text-[10px] uppercase font-bold tracking-widest text-purple-300/30 text-right block mb-2">الأرشيف الزمني</span>
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
              {conversations.length === 0 ? (
                <div className="py-8 text-center px-4">
                  <p className="text-[11px] text-purple-300/40 leading-relaxed">ابدأ بكتابة أول رسالة بالأسفل ليتم حفظ المساحة تلقائياً بخصوصية تامة.</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <div 
                    key={conv.id} 
                    onClick={() => {
                      setActiveConvId(conv.id);
                      setIsSidebarOpen(false);
                    }}
                    className={`w-full text-right p-3 rounded-xl text-xs font-medium cursor-pointer flex items-center justify-between transition-all duration-200 group border ${
                      activeConvId === conv.id 
                        ? "bg-purple-500/10 text-purple-200 border-purple-500/30 shadow-inner shadow-purple-500/5" 
                        : "text-purple-300/60 border-transparent hover:bg-purple-950/30 hover:text-purple-200"
                    }`}
                  >
                    {/* 🗑️ زرار الحذف متاح دائماً وأنيق بدون تشويه */}
                    <button 
                      onClick={(e) => handleDeleteConversation(conv.id, e)} 
                      className="text-purple-400/40 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-150" 
                      title="حذف المحادثة"
                    >
                      <Trash2 size={12} />
                    </button>
                    
                    <div className="flex items-center gap-2.5 truncate max-w-[80%] flex-row-reverse">
                      <span className="truncate tracking-wide">{conv.title}</span>
                      <MessageSquare size={13} className={activeConvId === conv.id ? "text-purple-400" : "text-purple-300/30"} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* البروفايل السفلي وزر الخروج */}
        <div className="border-t border-purple-950/40 pt-4 space-y-3">
          <div className="flex items-center gap-3 px-2 flex-row-reverse justify-end">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-500/10 to-indigo-500/10 flex items-center justify-center text-purple-300 font-black text-xs border border-purple-500/20 shadow-inner">
              {user?.email?.[0].toUpperCase()}
            </div>
            <div className="truncate flex-1 text-right">
              <p className="text-xs font-bold text-purple-100 truncate">{user?.email?.split('@')[0]}</p>
              <p className="text-[10px] text-purple-300/40 truncate tracking-wide">{user?.email}</p>
            </div>
          </div>
          <button onClick={handleSignOut} className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-500/5 hover:bg-red-500/10 text-red-400 border border-red-500/10 rounded-xl text-xs font-semibold transition-all duration-150">
            <LogOut size={13} />
            <span>تسجيل الخروج الآمن</span>
          </button>
        </div>
      </aside>

      {/* منطقة الشات الرئيسية وعرض الرسائل المحدثة */}
      <div className="flex-1 flex flex-col h-full relative z-10 bg-radial-glow">
        
        {/* الهيدر العلوي المخصص للموبايل والـ Layout الفخم */}
        <header className="h-14 border-b border-purple-950/20 px-4 flex items-center justify-between lg:justify-end bg-[#0b0713]/40 backdrop-blur-md">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-purple-400 hover:text-purple-300 bg-purple-500/5 border border-purple-500/10 rounded-xl lg:hidden transition-colors"
          >
            <Menu size={18} />
          </button>
          
          <div className="flex items-center gap-2 text-left lg:hidden">
            <Sparkles size={14} className="text-purple-400" />
            <span className="text-xs font-bold text-purple-200">Grace OS</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          <div className="max-w-3xl mx-auto space-y-6">
            
            {messages.length === 0 && !botLoading && (
              <div className="text-center py-20 space-y-4 max-w-md mx-auto">
                <div className="w-14 h-14 bg-purple-500/5 border border-purple-500/10 rounded-2xl flex items-center justify-center mx-auto shadow-xl">
                  <Sparkles size={24} className="text-purple-400 animate-pulse" />
                </div>
                <div className="space-y-1.5">
                  <p className="text-sm font-bold text-purple-100">مرحباً بك في فضائك الخاص</p>
                  <p className="text-xs text-purple-300/40 leading-relaxed px-4">المستشار نشط بالكامل بميزة الحفظ التلقائي وحوار منفصل ومحمي لتجربة تصفح غاية في السلاسة والاحترافية.</p>
                </div>
              </div>
            )}

            {/* 🔒 [إصلاح الاتجاهات النهائي والكامل]: ضبط الـ الـ Row والـ Alignment ليكون اليوزر يمين والبوت شمال بالملي */}
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex items-start gap-4 w-full ${
                  msg.role === "user" ? "justify-start flex-row" : "justify-start flex-row-reverse"
                }`}
              >
                
                {/* الأواتار الفخم */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-md border shrink-0 transition-transform duration-200 ${
                  msg.role === "user" 
                    ? "bg-purple-600 border-purple-500 text-white order-2" 
                    : "bg-[#181126] border-purple-500/20 text-purple-400 order-1"
                }`}>
                  {msg.role === "user" ? <User size={15} /> : <Sparkles size={14} className="text-purple-400" />}
                </div>

                <div className={`max-w-[85%] rounded-2xl p-4 text-sm shadow-xl relative group transition-all border text-right ${
                  msg.role === "user" 
                    ? "bg-gradient-to-br from-purple-600 to-indigo-600 text-purple-50 border-purple-500/20 rounded-tl-none shadow-purple-600/15 order-1 mr-auto" 
                    : "bg-[#140e21] text-purple-100 border-purple-950/50 rounded-tr-none shadow-black/20 order-2 ml-auto"
                }`}>
                  
                  {/* زرار نسخ البرومبت الفخم والذكي يظهر عند الهوفر أو اللمس السريع */}
                  <button
                    onClick={() => handleCopyText(msg.text, msg.id)}
                    className="absolute top-3 left-3 p-1.5 rounded-lg bg-black/40 border border-white/5 text-purple-300/60 hover:text-purple-200 opacity-0 group-hover:opacity-100 transition-all duration-200 backdrop-blur-md"
                    title="نسخ النص"
                  >
                    {copiedId === msg.id ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                  </button>

                  {/* تأكيد اتجاه السرد الصارم RTL ومنع المتصفحات من قلب الكلمات */}
                  <p 
                    className="leading-relaxed whitespace-pre-line text-[13.5px] tracking-wide font-normal pl-6"
                    style={{ direction: "rtl", textJustify: "inter-word" }}
                  >
                    {msg.text}
                  </p>
                </div>
              </div>
            ))}

            {/* أنيميشن تفكير البوت المخصص والممتاز */}
            {botLoading && (
              <div className="flex items-start gap-4 flex-row">
                <div className="w-9 h-9 rounded-xl bg-[#181126] border border-purple-500/20 flex items-center justify-center text-purple-400 shadow-md order-1">
                  <Sparkles size={14} className="animate-spin text-purple-400" style={{ animationDuration: '3s' }} />
                </div>
                <div className="bg-[#140e21] border border-purple-950/50 rounded-2xl rounded-tr-none p-4 shadow-xl flex items-center gap-2 order-2 ml-auto">
                  <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* صندوق كتابة الرسائل السفلي بلمسة الترا لوكس مريحة للموبايل والشاشات */}
        <footer className="bg-[#0b0713]/60 backdrop-blur-xl border-t border-purple-950/20 p-4 space-y-3">
          
          {/* صندوق معاينة الصورة المرفوعة قبل الإرسال الفخم جداً */}
          <AnimatePresence>
            {imagePreview && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="max-w-3xl mx-auto flex justify-end"
              >
                <div className="relative inline-block bg-[#160f24] p-2 rounded-xl border border-purple-500/20 shadow-2xl">
                  <img src={imagePreview} alt="Upload preview" className="h-16 w-16 object-cover rounded-lg border border-purple-500/10" />
                  <button
                    type="button"
                    onClick={clearAttachment}
                    className="absolute -top-2 -left-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-lg transition-all duration-150 active:scale-90"
                  >
                    <X size={11} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* الفورم الأساسي مدعوم بالكامل ومظبوط أبعاده للموبايل */}
          <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex items-center gap-2.5">
            <input 
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            
            {/* زر رفع الصور */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()} 
              className="p-3 bg-[#140e21] border border-purple-950 text-purple-400 hover:text-purple-300 hover:bg-[#1a122b] rounded-xl flex items-center justify-center transition-all duration-150 shadow-md shrink-0 active:scale-[0.97]"
              title="إرفاق صورة للتحليل"
              disabled={botLoading}
            >
              <ImageIcon size={18} />
            </button>

            {/* حقل الإدخال الراقس النصي */}
            <input 
              type="text" 
              value={inputMessage} 
              onChange={(e) => setInputMessage(e.target.value)} 
              placeholder={imagePreview ? "اكتب المطلوب تحليل من الصورة بالفضاء الفاخر..." : "أرسل توجيهك الآن للمحرك الإبداعي الذكي..."} 
              className="flex-1 bg-[#140e21] border border-purple-950/60 rounded-xl py-3 px-4 text-[13.5px] outline-none text-purple-100 placeholder-purple-300/20 focus:border-purple-500/30 transition-colors text-right shadow-inner" 
              disabled={botLoading}
            />
            
            {/* زر الإرسال الملحق بأنيميشن فاخر وسلس */}
            <button 
              type="submit" 
              disabled={(!inputMessage.trim() && !attachedImage) || botLoading} 
              className="p-3 bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl flex items-center justify-center transition-all duration-150 disabled:from-purple-950/40 disabled:to-indigo-950/40 disabled:text-purple-300/20 shrink-0 shadow-lg shadow-purple-600/10 active:scale-[0.97]"
            >
              <Send size={17} className="rotate-180" />
            </button>
          </form>
        </footer>
      </div>
    </div>
  );
}
