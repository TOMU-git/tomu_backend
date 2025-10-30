import { Injectable } from "@nestjs/common";
import axios from "axios";

// Environment variables - o'qish va console logging
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const GPT_MODEL = process.env.GPT_MODEL || "gpt-4o";
const MAX_TOKENS = Number(process.env.MAX_TOKENS || 200);
const TEMPERATURE = Number(process.env.TEMPERATURE || 0.3);
const STRICT_NO_ECHO = process.env.STRICT_NO_ECHO === "1";
const CONTEXT_MAX_LENGTH = Number(process.env.CONTEXT_MAX_LENGTH || 8000);

// Console logda env value'larini tekshirish
if (!OPENAI_API_KEY) {
    console.log("⚠️  WARNING: OPENAI_API_KEY not found in .env");
} else {
    console.log("✅ OPENAI_API_KEY loaded");
}

console.log("📋 GPT Configuration loaded:");
console.log(`   GPT_MODEL: ${GPT_MODEL}`);
console.log(`   MAX_TOKENS: ${MAX_TOKENS}`);
console.log(`   TEMPERATURE: ${TEMPERATURE}`);
console.log(`   STRICT_NO_ECHO: ${STRICT_NO_ECHO}`);
console.log(`   CONTEXT_MAX_LENGTH: ${CONTEXT_MAX_LENGTH}`);

/**
 * GPTService
 * -------------------------------------------------------
 * Maqsad: GPT API bilan integratsiya adapteri.
 *  - Kontekstli javob generatsiya qilish
 *  - Strict/general rejim bayroqlari
 */
@Injectable()
export class GPTService {
    /**
     * Kontekst asosida javob generatsiya qilish
     */
    async generate(params: { prompt: string; context: any; language: string; strict: boolean; }): Promise<string> {
        // Fix common Whisper transcription errors for Arabic
        let prompt = params.prompt;
        const originalPrompt = prompt;

        // YO'QOLGAN HARFLARNI QAYTARISH:
        // "يفريد" → "يا فريد" (missing ي harfi)
        prompt = prompt.replace(/يَفَرِيد/g, 'يَا فَرِيد');
        prompt = prompt.replace(/يفريد/g, 'يا فريد');
        prompt = prompt.replace(/يَفَرِيد؟/g, 'يَا فَرِيد؟');

        // "ول" → "هل" (question particle xatosi)
        prompt = prompt.replace(/وَوَلْ/g, 'وَهَلْ');
        prompt = prompt.replace(/ووَلْ/g, 'وَهَلْ');
        prompt = prompt.replace(/ووَل/g, 'وَهَلْ');
        prompt = prompt.replace(/وول/g, 'وَهَلْ');

        // "مْ" → "مَا" (question word xatosi)
        prompt = prompt.replace(/\s+م[ٌْ]/g, ' مَا');

        if (prompt !== originalPrompt) {
            console.log("  ✏️  Auto-corrected to:", prompt);
        }

        const { context, language, strict } = params;
        if (!OPENAI_API_KEY) {
            console.log('⚠️ OpenAI API key not found, using fallback');
            return `Javob: ${prompt}`;
        }

        const systemParts: string[] = [];

        // TIL QOIDALARI: Qattiq til instruksiyasi
        if (language === 'ar' || language === 'arabic') {
            systemParts.push("You are an Arabic language learning assistant for beginners.");
            systemParts.push("CRITICAL LANGUAGE RULES:");
            systemParts.push("1. You MUST respond ONLY in Modern Standard Arabic (الفصحى).");
            systemParts.push("2. ALWAYS include full diacritical marks (تشكيل): fatha (َ), kasra (ِ), damma (ُ), sukun (ْ), tanwin.");
            systemParts.push("3. Write FULLY VOCALIZED text - every letter must have proper tashkeel for correct pronunciation.");
            systemParts.push("4. Use simple, clear sentence structures suitable for beginners.");
            systemParts.push("5. NEVER use dialect, slang, or colloquial Arabic.");
            systemParts.push("6. NEVER respond in Uzbek, English, or any other language.");
            systemParts.push("Example format: 'مَا هَٰذَا؟' not 'ما هذا؟' and 'هَٰذَا بَيْتٌ' not 'هذا بيت'");
        } else {
            systemParts.push(`Siz til o'rgatuvchi yordamchisiz. Javob tilini: ${language}.`);
        }

        // QATTIY QOIDALAR: Faqat bizning materiallarimizdan foydalanish
        systemParts.push("CONTENT RULES:");
        systemParts.push("1. Use vocabulary and grammar from the lesson materials provided below.");
        systemParts.push("2. Answer questions about items/concepts mentioned in the lessons.");
        systemParts.push("3. For yes/no questions (هَلْ), answer with نَعَمْ or لَا based on lesson content.");
        systemParts.push("4. Be helpful and encouraging to beginners.");

        // STRICT MODE O'CHIRILDI - Barcha materiallardan qidiradi
        if (STRICT_NO_ECHO) systemParts.push("Do not repeat the user's text, give a short and clear answer.");

        const contextSummary = safeClampContext(context);

        const messages = [
            { role: "system", content: systemParts.join(" ") },
            { role: "system", content: `Lesson materials context:\n${contextSummary}` },
            // Few-shot example to guide the model
            { role: "user", content: "مَا هَٰذَا؟" },
            { role: "assistant", content: "هَٰذَا بُرْتُقَالٌ." },
            { role: "user", content: "هَلْ هُوَ لَذِيذٌ؟" },
            { role: "assistant", content: "نَعَمْ، هَٰذَا الْبُرْتُقَالُ لَذِيذٌ جِدًّا." },
            // Actual user query
            { role: "user", content: prompt },
        ];

        try {
            console.log(`   🚀 Model: ${GPT_MODEL}`);
            const res = await axios.post(
                "https://api.openai.com/v1/chat/completions",
                {
                    model: GPT_MODEL,
                    messages,
                    max_tokens: MAX_TOKENS,
                    temperature: TEMPERATURE, // Aniq va tabiiy javoblar uchun balans
                },
                { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } }
            );
            const text = (res.data as any)?.choices?.[0]?.message?.content?.trim();
            return text || "";
        } catch (e: any) {
            console.log(`❌ GPT Error: ${e.message}`);
            return `Javob: ${prompt}`; // fallback
        }
    }
}

function safeClampContext(ctx: any): string {
    try {
        const json = JSON.stringify(ctx);
        const maxLength = CONTEXT_MAX_LENGTH - 200; // 200 char buffer
        return json.length > CONTEXT_MAX_LENGTH ? json.slice(0, maxLength) + "..." : json;
    } catch {
        return "";
    }
}

