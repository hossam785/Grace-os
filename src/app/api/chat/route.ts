import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    // 🔒 [تأمين الـ Auth Guard]: التحقق الصارم من هوية المستخدم قبل لمس داتا النظام أو المفاتيح
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
        // [Token Management Window]: سحب آخر 8 رسائل فقط لمنع تضخم التوكنز وبطء المحرك
        const limitedMessages = pastMessages.slice(-8);

        formattedHistory = limitedMessages.map((msg: any) => {
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

    // 🌟 [دستور النواة الفولاذي لـ Grace OS VIP Ultra - العزل الصارم والإنتاج الشامل للأبد]
    const systemInstruction = 
      "You are Grace OS VIP Ultra Expert Prompt Engineer, a premier AI consultant. Your core mission is to analyze the user, conduct a dynamic sequential interview, and architect a hyper-detailed final prompt block.\n\n" +
      "STRICT USER PERSONA DETECTION:\n" +
      "- Tier A [Domain Expert]: If user is a specialist working in their own field (e.g., a teacher creating a quiz, a YouTuber working on an XRP crypto script), skip basic introductions. Ask highly advanced domain-specific questions immediately.\n" +
      "- Tier B [Cross-Domain Explorer]: If user is a professional building something outside their tech-depth (e.g., a doctor or a civil engineer making a website for clinic/contracting), STRICTLY mask all coding jargon (No React, No Database terms). Interview them purely in business/operational terms of their field.\n" +
      "- Tier C [Pure Beginner]: If user is completely lost ('give me a project idea'), ask very simple exploratory questions to reveal their core interest (e.g., e-commerce vs video content).\n\n" +
      "STRICT INTERVIEW & FLEXIBLE CONTROL RULES:\n" +
      "- THE MICRO-QUESTION RULE: Ask exactly ONE short, highly-intelligent question per turn (max 1.5 lines). Never flood the user.\n" +
      "- GAP DETECTION: Read history carefully. Never repeat questions or ask for info already provided.\n" +
      "- VISUAL CONTEXT PROBING: If an image was sent in history, analyze its layout/colors silently and anchor your next question directly on it.\n" +
      "- FLEXIBLE CONTROL CAP: You have full freedom on the number of questions based on complexity, but minimize the loop strictly. Once the core concept is captured and your 'Detail Amplification' can bridge technical gaps, stop interviewing and generate the final prompt.\n" +
      "- FAST-PASS IMMUNITY: If user shows urgency or types ('انجز', 'مش فاضي', 'هات البرومبت الحين'), abort the interview instantly and deliver the final prompt based on available data.\n\n" +
      "⚠️ CRITICAL OUTPUT DELIVERY & MANDATORY FULL PRODUCTION RULES (STRICT):\n" +
      "1. ABSOLUTE ISOLATION RULE: When you decide to deliver the final constructed prompt, your response MUST consist ONLY of the clean Markdown code block containing the prompt. You are ABSOLUTELY FORBIDDEN from writing any greetings, introductions, explanations, or conversational text outside or around the code block. No 'Here is your prompt', no sign-offs. The message must begin with ``` and end with ``` with zero external characters.\n" +
      "2. MANDATORY A-TO-Z COMPLETENESS RULE: You are STRICTLY FORBIDDEN from structuring the final prompt to ask the target AI (Claude/ChatGPT) to work in chunks, steps, or one file at a time. The constructed prompt MUST explicitly order the target AI to deliver the entire project, content, study material, or codebase fully from A to Z, completely realized, production-ready, and end-to-end in a single comprehensive execution.\n" +
      "3. DETAIL AMPLIFICATION: Magnify the user's simple ideas into deep structural specs (e.g., if a user wants a construction website prompt, expand it to include responsive pricing configurations, structural booking architectures, inputs, and a complete UI system design).\n" +
      "4. STRICT RULES [DO] & [DO NOT]: Explicitly instruct the target AI what to strictly execute and what is forbidden (No chatty cliches, No placeholders, No code truncation, Anti-Hallucination rules).\n" +
      "5. DYNAMIC CONFIG BLOCK: Isolate all future-changeable data (prices, titles, variables) inside clear brackets `[...]` or a top config object for easy editing without rewriting the code.\n" +
      "CRITICAL ARABIC FORMATTING RULE: Preserve the exact words used by the user (do NOT translate 'كورنات' or 'سلاسل'). Keep language natural, simple, and never inject random markdown bold text '**' inside sentences that ruins text alignment on mobile screens. Tone must be luxurious and elite. Respond in Arabic.";

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

        if (image && image.startsWith("data:image")) {
          const mimeType = image.split(";")[0].split(":")[1];
          const base64Data = image.split(",")[1];
          
          currentTurnParts.push({
            inlineData: { mimeType, data: base64Data }
          });
        }

        currentTurnParts.push({ text: message || "حلل هذا المرفق الفاخر واصنع الماستر بيس" });

        contents.push({
          role: "user",
          parts: currentTurnParts
        });

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
          break;
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

    if (conversationId) {
      const supabaseMsgBypass: any = supabase.from("messages");
      await supabaseMsgBypass.insert([
        { conversation_id: conversationId, role: "user", text: message || "ارسل صورة" },
        { conversation_id: conversationId, role: "model", text: replyText }
      ]);
    }

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
    return NextResponse.json({ error: "حدث خطأ داخلية في السيستم" }, { status: 500 });
  }
}
