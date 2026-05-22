import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const { message, conversationId, image } = await req.json();

    if (!message && !image) {
      return NextResponse.json({ error: "الطلب فارغ" }, { status: 400 });
    }

    // 1. سحب تاريخ المحادثة الكامل (Chat History) لتأمين الربط التراكمي والتتابعي 100%
    let formattedHistory: any[] = [];
    
    if (conversationId) {
      const supabaseMessagesBypass: any = supabase.from("messages");
      const { data: pastMessages } = await supabaseMessagesBypass
        .select("role, text")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true }); // ترتيب تصاعدي حتمي لبناء الأسئلة المتتابعة على السياق القديم

      if (pastMessages && pastMessages.length > 0) {
        // فلترة وتأمين الهيكل ليكون متوافق 100% مع الـ API الرسمي لـ Gemini
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
    let lastError = "لم يتم العثور على مفتاح صالح في مصفوفة النظام";

    // 🌟 3. حقن تعليمات السيرفر العليا المحدثة (Sequential Interview Protocol)
    // تجبر المحرك على طرح سؤال واحد ذكي بكل دور، يبنيه على إجابة المستخدم السابقة لتقييم وعيه بالمجال
    const systemInstruction = 
      "You are Grace OS VIP Elite Prompt Engineer. Your core function is to extract details from the user to build the perfect prompt. " +
      "STRICT SEQUENTIAL RULES: " +
      "1. NEVER ask multiple questions at once. " +
      "2. You must ask exactly ONE highly intelligent, short question per turn. " +
      "3. Every new question MUST be directly built upon the user's previous answer found in the chat history. " +
      "4. Analyze their response to judge their background knowledge and depth in the field, then adjust your next question accordingly. " +
      "5. Do this for a maximum of 2 to 3 turns of questions. Once you have enough context, deliver the final masterpiece prompt. " +
      "Keep the tone sharp, elite, luxurious, and supportive. Always connect context and reply in Arabic.";

    // 4. الـ Loop الذكي لتجربة المفاتيح ومخاطبة جوجل مباشرة بـ Gemini 2.5
    while (fallbackCounter < 5) {
      const currentIndex = (startIndex + fallbackCounter) % 5;
      const currentKey = keysArray[currentIndex];

      if (!currentKey || currentKey.trim() === "") {
        fallbackCounter++;
        continue;
      }

      try {
        // الربط الحتمي والمظبوط لـ Gemini 2.5 Flash عبر v1alpha القياسي
        const geminiUrl = `https://generativelanguage.googleapis.com/v1alpha/models/gemini-2.5-flash:generateContent?key=${currentKey}`;
        
        // ربط الـ History القديم بالدور الحالي لضمان الربط المتسلسل والشات يكمل بعضه
        const contents = [...formattedHistory];
        const currentTurnParts: any[] = [];

        // ترتيب الأجزاء: الصورة أولاً ثم النص (ترتيب إلزامي لـ Gemini API للـ Multi-modal)
        if (image && image.startsWith("data:image")) {
          const mimeType = image.split(";")[0].split(":")[1];
          const base64Data = image.split(",")[1];
          
          currentTurnParts.push({
            inlineData: { mimeType, data: base64Data }
          });
        }

        // إضافة نص الرسالة الحالية للمستخدم
        currentTurnParts.push({ text: message || "حلل هذا المرفق الفاخر" });

        // دفع دور المستخدم الحالي في ذيل مصفوفة السياق المتكامل
        contents.push({
          role: "user",
          parts: currentTurnParts
        });

        // إرسال الطلب مع الـ System Instruction وحقن الـ History الكامل
        const geminiResponse = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            contents,
            systemInstruction: {
              parts: [{ text: systemInstruction }]
            }
          })
        });

        const geminiData = await geminiResponse.json();

        if (geminiData.candidates && geminiData.candidates[0]?.content?.parts[0]?.text) {
          replyText = geminiData.candidates[0].content.parts[0].text;
          successfulKeyIndex = currentIndex;
          break; // نجح الاستدعاء وتأمن السياق التتابعي! اخرج فوراً من الـ Loop
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

    // 5. حفظ رسالة المستخدم ورد البوت الحاليين داخل قاعدة البيانات لمزامنة الـ History للرسايل الجاية
    if (conversationId) {
      const supabaseMsgBypass: any = supabase.from("messages");
      await supabaseMsgBypass.insert([
        { conversation_id: conversationId, role: "user", text: message || "ارسل صورة" },
        { conversation_id: conversationId, role: "model", text: replyText }
      ]);
    }

    // 6. تدوير وتحديث الـ active_key_index في جدول الـ system_settings لو اتغير المفتاح
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
