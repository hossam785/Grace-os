import sys
import io
import os
import json
from google import genai
from google.genai import types

# ضبط ترميز الإخراج ليدعم العربي بالملي
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

SYSTEM_PROMPT = """
أنت لست نموذج ذكاء اصطناعي، ولا تذكر أبداً كلمات مثل "أنا نموذج لغوي"، "ذكاء اصطناعي"، "أنا بوت"، "جوجل"، أو "توليد". 
أنت مهندس برمجيات سينيور ومحلل أنظمة بشري محترف جداً، وتعمل كـ شريك تقني ومستشار مباشر للمستخدم.

طريقة تعاملك وردودك يجب أن تكون بشرية وطبيعية تماماً كالآتي:
1. سياسة "سؤال واحد ذكي في كل مرة": اطرح سؤالاً واحداً فقط يكون ذكياً لتستخرج السياق، بحد أقصى سؤالين في المحادثة كلها.
2. اقرأ تاريخ المحادثة الممرر لك جيداً، واعرف ما هي الأسئلة التي طرحتها أنت سابقاً وما هي إجابات المستخدم عليها، وابنِ خطوتك القادمة بناءً على الإجابات السابقة مباشرة.
3. بمجرد حصولك على تفاصيل التفاصيل، صغ البرومبت النهائي الفائق بأعلى جودة ممكنة.
"""

def ask_gemini(api_key, current_message, history_str, image_path=None):
    try:
        client = genai.Client(api_key=api_key)
        
        # 🌟 بناء الـ Contents List بالاعتماد على الـ History القديم
        contents = []
        
        try:
            past_messages = json.loads(history_str)
            for msg in past_messages:
                # تحويل أدوار Supabase إلى أدوار تفهمها مكتبة جوجل (user / model)
                role = "user" if msg.get("role") == "user" else "model"
                contents.append(
                    types.Content(
                        role=role,
                        parts=[types.Part.from_text(text=msg.get("text", ""))]
                    )
                )
        except Exception as e:
            # لو الـ History ممسوح أو فيه مشكلة ابدأ من جديد
            pass

        # إضافة الرسالة الحالية والصورة (لو موجودة) في قاع الـ Contents
        current_parts = [types.Part.from_text(text=current_message)]
        
        if image_path and os.path.exists(image_path):
            uploaded_file = client.files.upload(file=image_path)
            current_parts.append(uploaded_file)
            
        contents.append(
            types.Content(
                role="user",
                parts=current_parts
            )
        )
            
        # إرسال المحادثة بالكامل (التاريخ + الرسالة الجديدة)
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                temperature=0.73,
                max_output_tokens=2500
            )
        )
        print(response.text)
        
        if image_path and os.path.exists(image_path):
            try: client.files.delete(name=uploaded_file.name)
            except: pass
                
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    # استلام الـ Arguments من Next.js
    if len(sys.argv) > 3:
        api_key = sys.argv[1]
        current_message = sys.argv[2]
        history_str = sys.argv[3]
        image_path = sys.argv[4] if len(sys.argv) > 4 and sys.argv[4] != "null" else None
        
        ask_gemini(api_key, current_message, history_str, image_path)