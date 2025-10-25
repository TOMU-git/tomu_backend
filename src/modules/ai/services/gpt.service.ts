import { Injectable } from "@nestjs/common";
import axios from "axios";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const GPT_MODEL = process.env.GPT_MODEL || "gpt-4o-mini";
const MAX_TOKENS = Number(process.env.MAX_TOKENS || 120);
const TEMPERATURE = Number(process.env.TEMPERATURE || 0.45);
const STRICT_NO_ECHO = process.env.STRICT_NO_ECHO === "1";

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
        console.log('🤖 ===== GPT GENERATION STARTED =====');
        console.log(`📝 User Prompt: "${params.prompt}"`);
        console.log(`🌐 Response Language: ${params.language}`);
        console.log(`🔒 Strict Mode: ${params.strict ? 'ON' : 'OFF'}`);

        const { prompt, context, language, strict } = params;
        if (!OPENAI_API_KEY) {
            console.log('⚠️ OpenAI API key not found, using fallback');
            return `Javob: ${prompt}`;
        }

        const systemParts: string[] = [];

        // TIL QOIDALARI: Qattiq til instruksiyasi
        if (language === 'ar' || language === 'arabic') {
            systemParts.push("You are an Arabic language learning assistant.");
            systemParts.push("CRITICAL: You MUST respond ONLY in Arabic language (العربية).");
            systemParts.push("NEVER respond in Uzbek, English, or any other language.");
            systemParts.push("All responses must use Arabic script and Arabic grammar.");
        } else {
            systemParts.push(`Siz til o'rgatuvchi yordamchisiz. Javob tilini: ${language}.`);
        }

        // QATTIY QOIDALAR: Faqat bizning materiallarimizdan foydalanish
        systemParts.push("IMPORTANT: Use ONLY the lesson materials provided below.");
        systemParts.push("Do not use words or information from outside the materials.");
        systemParts.push("If the answer is not in the materials, say 'لم يتم ذكر هذا في الدرس' (This was not mentioned in the lesson).");

        if (strict) systemParts.push("STRICT MODE: Use only materials up to the user's current lesson.");
        if (STRICT_NO_ECHO) systemParts.push("Do not repeat the user's text, give a short and clear answer.");

        const contextSummary = safeClampContext(context);
        console.log(`📚 Context Summary Length: ${contextSummary.length} chars`);

        const messages = [
            { role: "system", content: systemParts.join(" ") },
            { role: "system", content: `Kontekst: ${contextSummary}` },
            { role: "user", content: prompt },
        ];

        try {
            console.log(`🔐 Using OpenAI (key present: ${OPENAI_API_KEY ? 'YES' : 'NO'})`);
            console.log(`🚀 Sending request to OpenAI GPT (${GPT_MODEL})...`);
            const res = await axios.post(
                "https://api.openai.com/v1/chat/completions",
                {
                    model: GPT_MODEL,
                    messages,
                    max_tokens: MAX_TOKENS,
                    temperature: 0.1, // Qattiq deterministik javoblar uchun
                },
                { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } }
            );
            const text = (res.data as any)?.choices?.[0]?.message?.content?.trim();
            console.log(`✅ GPT Response: "${text}"`);
            console.log('🤖 ===== GPT GENERATION COMPLETED =====\n');
            return text || "";
        } catch (e: any) {
            console.log(`❌ GPT Error: ${e.message}`);
            console.log('🤖 ===== GPT GENERATION COMPLETED (FALLBACK) =====\n');
            return `Javob: ${prompt}`; // fallback
        }
    }
}

function safeClampContext(ctx: any): string {
    try {
        const json = JSON.stringify(ctx);
        return json.length > 4000 ? json.slice(0, 3800) + "..." : json;
    } catch {
        return "";
    }
}

