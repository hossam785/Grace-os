import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const { message, conversationId, image } = await req.json();

    if (!message && !image) {
      return NextResponse.json({ error: "الطلب فارغ" }, { status: 400 });
    }

    // 1. سحب تاريخ المحادثة الكامل (Chat History) من الـ Supabase
    let historyJson = "[]";
    let formattedHistory: any[] = [];
    
    if (conversationId) {
      const supabaseMessagesBypass: any = supabase.from("messages");
      const { data: pastMessages } = await supabaseMessagesBypass
        .select("role", "text")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (pastMessages && pastMessages.length > 0) {
        // تحويل التاريخ للهيكل اللي بيفهمه الـ API الرسمي لـ Gemini مباشرة
        formattedHistory = pastMessages.map((msg: any) => ({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.text || "" }]
        }));
      }
    }

    // 2. جلب مصفوفة المفاتيح من جدول system_settings
    const supabaseSettingsBypass: any = supabase.from("system_settings");
    const { data: dbSettings, error: dbError } = await supabaseSettingsBypass
      .select("*")
      .eq("id", 1)
      .single();

    if (dbError || !dbSettings) {
      return NextResponse.json({ error: "فشل جلب إعدادات النظام" }, { status: 500 });
    }

    const settings = dbSettings as any;

    const keysArray = [
      settings.key_1,
      settings.key_2,
      settings.key_3,
      settings.key_4,
      settings.key_5
    ];

    let startIndex = (settings.active_key_index || 1) - 1;
    let fallbackCounter = 0;
    let replyText = "";
    let successfulKeyIndex = startIndex;
    let lastError = "لم يتم العثور على مفتاح صالح في المصفوفة";

    // 3. الـ Loop على المفاتيح وتمرير الـ History مباشرة من الـ Node.js
    while (fallbackCounter < 5) {
      const currentIndex = (startIndex + fallbackCounter) % 5;
      const currentKey = keysArray[currentIndex];

      if (!currentKey || currentKey.trim() === "") {
        fallbackCounter++;
        continue;
      }

      try {
        // رابط الـ API الرسمي لـ Gemini (باستخدام موديل gemini-1.5-flash السريع والاقتصادي والممتاز للصور)
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${currentKey}`;
        
        // بناء محتوى الطلب (Contents Payload) متضمناً التاريخ الحالي
        const contents = [...formattedHistory];
        
        const currentTurnParts: any[] = [];

        // إذا كان المستخدم رافع صورة Base64، بنباصيها عل طول للسيرفر بدون حفظ ملف مؤقت
        if (image && image.startsWith("data:image")) {
          const mimeType = image.split(";")[0].split(":")[1];
          const base64Data = image.split(",")[1];
          
          currentTurnParts.push({
            inlineData: { mimeType, data: base64Data }
          });
        }

        // إضافة نص الرسالة الحالية
        currentTurnParts.push({ text: message || "حلل المرفق المرفق الفاخر" });

        // دفع الدور الحالي للمستخدم داخل مصفوفة الـ contents
        contents.push({
          role: "user",
          parts: currentTurnParts
        });

        const geminiResponse = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents })
        });

        const geminiData = await geminiResponse.json();

        if (geminiData.candidates && geminiData.candidates[0]?.content?.parts[0]?.text) {
          replyText = geminiData.candidates[0].content.parts[0].text;
          successfulKeyIndex = currentIndex;
          break; // نجح الاستدعاء! اخرج فوراً من الـ Loop
        } else {
          lastError = geminiData.error?.message || JSON.stringify(geminiData);
        }
      } catch (err: any) {
        lastError = err.message || err;
      }

      fallbackCounter++;
    }

    if (!replyText) {
      return NextResponse.json({ error: `❌ خطأ في نفاذ المحرك: ${lastError}` }, { status: 503 });
    }

    // 4. تحديث الـ active_key_index في قاعدة البيانات لو اتغير
    const nextActiveIndexForDb = successfulKeyIndex + 1;
    if (nextActiveIndexForDb !== settings.active_key_index) {
      const supabaseUpdateBypass: any = supabase.from("system_settings");
      await supabaseUpdateBypass
        .update({ active_key_index: nextActiveIndexForDb })
        .eq("id", 1);
    }

    return NextResponse.json({ reply: replyText });

  } catch (error: any) {
    console.error("Internal Server Error:", error);
    return NextResponse.json({ error: "حدث خطأ داخلي في السيستم" }, { status: 500 });
  }
}
