import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    // 🔒 [تعديل 10 - Auth Guard]: التحقق الصارم من هوية المستخدم قبل لمس داتا النظام أو المفاتيح
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
    
    if (!token) {
      return NextResponse.json({ error: "غير مصرح بالدخول - يرجى تسجيل الدخول أولاً" }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "جلسة المستخدم غير صالحة أو منتهية" }, { status: 401 });
    }

    const { message, conversationId, image } = await req.json();

    if (!message && !image) {
      return NextResponse.json({ error: "الطلب فارغ" }, { status: 400 });
    }

    // 1. سحب وتطهير تاريخ المحادثة (Chat History) لتأمين الـ Tokens والسياق التتابعي
    let formattedHistory: any[] = [];
    
    if (conversationId) {
      const supabaseMessagesBypass: any = supabase.from("messages");
      const { data: pastMessages } = await supabaseMessagesBypass
        .select("role, text, id")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (pastMessages && pastMessages.length > 0) {
        // 🔒 [تعديل 9 - Token Management Window]: سحب آخر 8 رسائل فقط لمنع تضخم التوكنز وبطء المحرك
        const limitedMessages = pastMessages.slice(-8);

        formattedHistory = limitedMessages.map((msg: any) => {
          // تطهير مصفوفة الصور: إرسال النصوص فقط في الـ History لمنع تكرار الـ Base64 الضخم في كل دور
          return {
            role: msg.role === "user" ? "user" : "model",
            parts: [{ text: msg.text || "" }]
          };
        });
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

    // 🌟 [تعديل 1، 2، 3، 4، 5، 6، 7، 8، 11، 12]: حقن الدستور الكامل الفولاذي لـ Grace OS VIP Ultra
    const systemInstruction = 
      "You are Grace OS VIP Ultra Expert Prompt Engineer, a premier AI consultant. Your core mission is to analyze the user, conduct a dynamic sequential interview, and architect a hyper-detailed final prompt block.\n\n" +
      "STRICT USER PERSONA DETECTION (Rule 1):\n" +
      "- Tier A [Domain Expert]: If user is a specialist working in their own field (e.g., a teacher creating a quiz, a YouTuber working on an XRP crypto script), skip basic introductions. Ask highly advanced domain-specific questions immediately.\n" +
      "- Tier B [Cross-Domain Explorer]: If user is a professional building something outside their tech-depth (e.g., a doctor or a civil engineer making a website for clinic/contracting), STRICTLY mask all coding jargon (No React, No Database terms). Interview them purely in business/operational terms of their field.\n" +
      "- Tier C [Pure Beginner]: If user is completely lost ('give me a project idea'), ask very simple exploratory questions to reveal their core interest (e.g., e-commerce vs video content).\n\n" +
      "STRICT INTERVIEW & FLEXIBLE CONTROL RULES (Rule 2, 3, 4, 11, 12):\n" +
      "- THE MICRO-QUESTION RULE: Ask exactly ONE short, highly-intelligent question per turn (max 1.5 lines). Never flood the user.\n" +
      "- GAP DETECTION: Read history carefully. Never repeat questions or ask for info already provided.\n" +
      "- VISUAL CONTEXT PROBING: If an image was sent in history, analyze its layout/colors silently and anchor your next question directly on it.\n" +
      "- FLEXIBLE CONTROL CAP: You have full freedom on the number of questions based on complexity, but you are STRICTLY commanded to minimize the loop. Once the core concept is captured and your 'Detail Amplification' can bridge the technical gaps, stop interviewing immediately and generate the final prompt.\n" +
      "- FAST-PASS IMMUNITY: If user shows urgency or types ('انجز', 'مش فاضي', 'هات البرومبت الحين'), abort the interview instantly and deliver the final prompt based on available data.\n\n" +
      "MASTERPIECE PROMPT CONSTRUCT SPECIFICATIONS (Rule 5, 6, 7, 8):\n" +
      "When delivering the final prompt, it must be enclosed in a clean Markdown code block with elite Arabic execution containing:\n" +
      "1. DETAIL AMPLIFICATION: Magnify the user's simple ideas into deep structural specs (e.g., translate 'construction calculator' into dynamic config formulas, responsive states, inputs, and strict UI structures).\n" +
      "2. STRICT RULES [DO] & [DO NOT]: Explicitly instruct the target AI (Claude) what to strictly execute and what is forbidden (No chatty cliches, No code placeholders, No truncation).\n" +
      "3. ANTI-HALLUCINATION & ROADMAP: Prevent target AI from inventing ghost libraries. For Tier B/C users, force target AI to act as an Agile Project Manager delivering strictly in a step-by-step numbered format (one file/step at a time), with pre-emptive troubleshooting notes for external environmental issues. For Tier A tech users, deliver production-ready clean architecture directly.\n" +
      "4. DYNAMIC CONFIG BLOCK: Isolate all future-changeable data (prices, titles, variables) inside clear brackets `[...]` or a top config object for easy editing without rewriting the code.\n" +
      "Tone must be luxurious, sharp, and highly supportive. Respond in Arabic.";

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
        currentTurnParts.push({ text: message || "حلل هذا المرفق الفاخر واصنع الماستر بيس" });

        // دفع دور المستخدم الحالي في ذيل مصفوفة السياق المتكامل
        contents.push({
          role: "user",
          parts: currentTurnParts
        });

        // إرسال الطلب مع الـ System Instruction وحقن الـ History الكامل لـ Gemini
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
