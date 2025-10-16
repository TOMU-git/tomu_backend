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
        const { prompt, context, language, strict } = params;
        if (!OPENAI_API_KEY) return `Javob: ${prompt}`;

        const systemParts: string[] = [];
        systemParts.push(`Siz til o'rgatuvchi yordamchisiz. Javob tilini: ${language}.`);

        // QATTIY QOIDALAR: Faqat bizning materiallarimizdan foydalanish
        systemParts.push("MUHIM: Faqat quyida berilgan dars materiallaridan foydalaning.");
        systemParts.push("Boshqa so'zlar yoki ma'lumotlardan foydalanmang.");
        systemParts.push("Agar materialda javob yo'q bo'lsa, 'Bu haqda darsda gapirilmagan' deb ayting.");

        if (strict) systemParts.push("STRICT MODE: Faqat foydalanuvchi kelgan darsigacha bo'lgan materiallardan foydalaning.");
        if (STRICT_NO_ECHO) systemParts.push("Foydalanuvchi matnini qaytarmang, qisqa va aniq javob bering.");

        const contextSummary = safeClampContext(context);

        const messages = [
            { role: "system", content: systemParts.join(" ") },
            { role: "system", content: `Kontekst: ${contextSummary}` },
            { role: "user", content: prompt },
        ];

        try {
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
            return text || "";
        } catch (e: any) {
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

