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
/**
 * GPT usage ma'lumotlari
 */
export interface GPTUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}

/**
 * GPT response with usage
 */
export interface GPTResponse {
    text: string;
    usage?: GPTUsage;
}

@Injectable()
export class GPTService {
    /**
     * Kontekst asosida javob generatsiya qilish
     * @deprecated Use generateWithUsage() for cost tracking
     * @returns Faqat text (backward compatibility)
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
        // Hech qachon foydalanuvchi matnini aynan takrorlamang
        systemParts.push("Do not repeat the user's text, give a short and clear answer.");

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

    /**
     * Kontekst asosida javob generatsiya qilish (usage ma'lumotlari bilan)
     * @param params - Generate parametrlari
     * @returns Text va usage ma'lumotlari (cost tracking uchun)
     */
    async generateWithUsage(params: { prompt: string; context: any; language: string; strict: boolean; conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }> }): Promise<GPTResponse> {
        // Reuse existing generate logic but extract usage
        const { prompt, context, language, strict, conversationHistory = [] } = params;

        // Prompt correction (same as generate)
        let correctedPrompt = prompt;
        const originalPrompt = prompt;

        correctedPrompt = correctedPrompt.replace(/يَفَرِيد/g, 'يَا فَرِيد');
        correctedPrompt = correctedPrompt.replace(/يفريد/g, 'يا فريد');
        correctedPrompt = correctedPrompt.replace(/يَفَرِيد؟/g, 'يَا فَرِيد؟');
        correctedPrompt = correctedPrompt.replace(/وَوَلْ/g, 'وَهَلْ');
        correctedPrompt = correctedPrompt.replace(/ووَلْ/g, 'وَهَلْ');
        correctedPrompt = correctedPrompt.replace(/ووَل/g, 'وَهَلْ');
        correctedPrompt = correctedPrompt.replace(/وول/g, 'وَهَلْ');
        correctedPrompt = correctedPrompt.replace(/\s+م[ٌْ]/g, ' مَا');

        if (correctedPrompt !== originalPrompt) {
            console.log("  ✏️  Auto-corrected to:", correctedPrompt);
        }

        if (!OPENAI_API_KEY) {
            console.log('⚠️ OpenAI API key not found, using fallback');
            return {
                text: `Javob: ${correctedPrompt}`,
                usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
            };
        }

        // System parts (same as generate)
        const systemParts: string[] = [];
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

        systemParts.push("CONTENT RULES:");
        systemParts.push("1. You MUST ONLY use vocabulary and grammar from the lesson materials provided below.");
        systemParts.push("2. Answer questions based STRICTLY on the lesson content - do not use general knowledge.");
        systemParts.push("3. For yes/no questions (هَلْ), answer with نَعَمْ or لَا based on lesson content.");
        systemParts.push("4. Maintain conversation context - refer back to previous messages if relevant.");
        systemParts.push("5. Be helpful and encouraging to beginners.");
        systemParts.push("6. CRITICAL ANTI-ECHO RULE: NEVER repeat, echo, or rephrase the user's exact text back to them.");
        systemParts.push("7. CRITICAL: If the user asks \"مَا هَذَا؟\" (what is this?), DO NOT respond with the same question or just reorder their words.");
        systemParts.push("8. CRITICAL: Your response MUST be a NEW, DIFFERENT sentence that answers or responds to the user's question/statement.");
        systemParts.push("9. CRITICAL: Even if you add punctuation (،) or diacritics, NEVER use the exact same words in the same order as the user.");
        systemParts.push("10. Your response MUST be logically correct and directly answer the user's question or statement.");
        systemParts.push("11. If the user makes a statement, respond appropriately - do not just repeat their words.");
        systemParts.push("12. If the user asks a question, provide a clear, logical answer from the lesson materials.");
        systemParts.push("13. Give short, clear, and logically coherent answers based on lesson materials.");

        // Format context as structured lesson materials (not raw JSON)
        const contextSummary = formatLessonMaterials(context);

        const messages = [
            { role: "system", content: systemParts.join(" ") },
            { role: "system", content: `LESSON MATERIALS:\n${contextSummary}\n\nRemember: You MUST only use vocabulary and grammar from these materials.` },
        ];

        // Add conversation history before current prompt
        if (conversationHistory.length > 0) {
            // Limit to last 10 messages to avoid token overflow
            const recentHistory = conversationHistory.slice(-10);
            messages.push(...recentHistory);
        }

        // Current user prompt
        messages.push({ role: "user", content: correctedPrompt });

        try {
            console.log(`   🚀 Model: ${GPT_MODEL}`);
            const res = await axios.post(
                "https://api.openai.com/v1/chat/completions",
                {
                    model: GPT_MODEL,
                    messages,
                    max_tokens: MAX_TOKENS,
                    temperature: TEMPERATURE,
                },
                { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } }
            );

            const text = (res.data as any)?.choices?.[0]?.message?.content?.trim() || "";

            // Extract usage information
            const usage = (res.data as any)?.usage;
            const usageData: GPTUsage = usage ? {
                promptTokens: usage.prompt_tokens || 0,
                completionTokens: usage.completion_tokens || 0,
                totalTokens: usage.total_tokens || 0,
            } : { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

            console.log(`   📊 GPT Usage: ${usageData.totalTokens} tokens (prompt: ${usageData.promptTokens}, completion: ${usageData.completionTokens})`);

            return { text, usage: usageData };
        } catch (e: any) {
            console.log(`❌ GPT Error: ${e.message}`);
            return {
                text: `Javob: ${correctedPrompt}`,
                usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
            };
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

/**
 * Format lesson materials from context array into structured text
 * Only includes lesson text content, not metadata
 */
function formatLessonMaterials(context: any): string {
    if (!context || !Array.isArray(context)) {
        return "No lesson materials available.";
    }

    try {
        const materials: string[] = [];
        let totalLength = 0;
        const maxLength = CONTEXT_MAX_LENGTH - 500; // Buffer for system message

        for (const item of context) {
            if (totalLength >= maxLength) break;

            // Extract lesson text from various possible field names
            const lessonText = item?.text || item?.content || item?.dialogue || "";
            if (!lessonText) continue;

            // Add lesson order if available for context
            const lessonInfo = item?.lessonOrder ? `Lesson ${item.lessonOrder}: ` : "";
            const formatted = `${lessonInfo}${lessonText}`;

            const formattedLength = formatted.length + 2; // +2 for newline
            if (totalLength + formattedLength > maxLength) {
                // Truncate this lesson if needed
                const remaining = maxLength - totalLength - 3; // -3 for "..."
                if (remaining > 0) {
                    materials.push(lessonInfo + lessonText.slice(0, remaining) + "...");
                }
                break;
            }

            materials.push(formatted);
            totalLength += formattedLength;
        }

        return materials.length > 0
            ? materials.join("\n\n")
            : "No lesson materials found.";
    } catch (e) {
        console.warn("⚠️  Error formatting lesson materials:", e);
        return "Error loading lesson materials.";
    }
}

