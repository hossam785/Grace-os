import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const { message, conversationId, image } = await req.json();

    if (!message && !image) {
      return NextResponse.json({ error: "الطلب فارغ" }, { status: 400 });
    }

    // 1. سحب تاريخ المحادثة الكامل (Chat History) لتأمين الربط التراكمي 100%
    let formattedHistory: any[] = [];
    
    if (conversationId) {
      const supabaseMessagesBypass: any = supabase.from("messages");
      const { data: pastMessages } = await supabaseMessagesBypass
        .select("role, text")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true }); // ترتيب تصاعدي من الأقدم للأحدث لربط السياق

      if (pastMessages && pastMessages.length > 0) {
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

    // 🌟 3. حقن تعليمات السيرفر العليا (Prompt Engineer System Instructions)
    // ده اللي بيخلي البوت يسأل أسئلة ذكية وقليلة ويفهم عقلية المستخدم وخلفيته في المجال
    const systemInstruction = 
      "You are Grace OS VIP Elite Prompt Engineer. Your specialized core function is to craft perfect, advanced prompts for users. " +
      "CRITICAL BEHAVIOR: When a user asks for a prompt or an AI instruction, DO NOT just give it to them immediately. " +
      "Instead, you must analyze their request and reply by asking a maximum of 2 or 3 highly intelligent, short, and precise questions. " +
      "Your questions must aim to uncover: 1. Their exact goal, 2. Their level of experience in this specific field (beginner or expert), 3. Any hidden constraints. " +
      "Keep your tone extremely professional, sharp, luxurious, and supportive. " +
      "Always connect the current message with the full past chat history provided to ensure context consistency. Reply in Arabic.";

    // 4. الـ Loop الذكي لتجربة المفاتيح ومخاطبة جوجل مباشرة بـ Gemini 2.5
    while (fallbackCounter < 5) {
      const currentIndex = (startIndex + fallbackCounter) % 5;
      const currentKey = keysArray[currentIndex];

      if (!currentKey || currentKey.trim() === "") {
        fallbackCounter++;
        continue;
      }

      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1alpha/models/gemini-2.5-flash:generateContent?key=${currentKey}`;
        
        // ربط الـ History القديم بالدور الحالي لضمان الربط الكامل والشات يكمل بعضه
        const contents = [...formattedHistory];
        const currentTurnParts: any[] = [];

        // معالجة الصور إن وجدت (ترتيب إلزامي للموديل)
        if (image && image.startsWith("data:image")) {
          const mimeType = image.split(";")[0].split(":")[1];
          const base64Data = image.split(",")[1];
          
          currentTurnParts.push({
            inlineData: { mimeType, data: base64Data }
          });
        }

        // إضافة الرسالة الحالية للمستخدم
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
          break; // نجح الاستدعاء وتأمن السياق! اخرج فوراً
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
