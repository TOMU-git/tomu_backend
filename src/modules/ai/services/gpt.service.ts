import { Injectable } from "@nestjs/common";
import axios from "axios";
import { RetryHelperService } from "./retry-helper.service";
import { TokenCounterService } from "./token-counter.service";

// Environment variables - o'qish va console logging
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const GPT_MODEL = process.env.GPT_MODEL || "gpt-4o";
const MAX_TOKENS = Number(process.env.MAX_TOKENS || 350); // Increased from 200 to 350 for Arabic with tashkeel
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
    constructor(
        private readonly retryHelper: RetryHelperService,
        private readonly tokenCounter: TokenCounterService
    ) { }

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

        // TIL QOIDALARI: Qisqa va tushunarli
        if (language === 'ar' || language === 'arabic') {
            systemParts.push("You are an Arabic language learning assistant for beginners.");
            systemParts.push("RULES:");
            systemParts.push("1. Respond ONLY in Modern Standard Arabic (الفصحى) with FULL diacritical marks (تشكيل) on every letter.");
            systemParts.push("2. Use ONLY vocabulary and grammar from lesson materials - never use general knowledge.");
            systemParts.push("3. Give short, clear answers that directly respond (never echo user's words).");
            systemParts.push("4. For yes/no questions (هَلْ), answer with نَعَمْ or لَا based on lesson content.");
            systemParts.push("5. Response MUST be logically correct and different from user's input.");
            systemParts.push("6. If user makes pronunciation errors (1-2 wrong letters), find similar sentence/word from lesson materials and ask 'هَلْ تَقْصِدُ ...؟' (Did you mean ...?) to help them.");
        } else {
            systemParts.push(`Siz til o'rgatuvchi yordamchisiz. Javob tilini: ${language}.`);
        }

        // Note: Using token-based truncation (same as generateWithUsage)
        const contextSummary = this.formatLessonMaterials(context);

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

            // Retry logic bilan OpenAI API call
            const res = await this.retryHelper.executeWithRetry(
                async () => {
                    return await axios.post(
                        "https://api.openai.com/v1/chat/completions",
                        {
                            model: GPT_MODEL,
                            messages,
                            max_tokens: MAX_TOKENS,
                            temperature: TEMPERATURE, // Aniq va tabiiy javoblar uchun balans
                        },
                        {
                            headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
                            timeout: 30000 // 30 seconds timeout
                        }
                    );
                },
                {
                    maxRetries: 3,
                    initialDelay: 1000,
                    maxDelay: 10000,
                    onRetry: (attempt, error) => {
                        console.log(`   🔄 Retrying GPT call (attempt ${attempt}/3)...`);
                    }
                }
            );

            const text = (res.data as any)?.choices?.[0]?.message?.content?.trim();
            return text || "";
        } catch (e: any) {
            console.log(`❌ GPT Error after retries: ${e.message}`);
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
            systemParts.push("RULES:");
            systemParts.push("1. Respond ONLY in Modern Standard Arabic (الفصحى) with FULL diacritical marks (تشكيل) on every letter.");
            systemParts.push("2. Use ONLY vocabulary and grammar from lesson materials - never use general knowledge.");
            systemParts.push("3. Give short, clear answers that directly respond (never echo user's words).");
            systemParts.push("4. For yes/no questions (هَلْ), answer with نَعَمْ or لَا based on lesson content.");
            systemParts.push("5. Response MUST be logically correct and different from user's input.");
            systemParts.push("6. If user makes pronunciation errors (1-2 wrong letters), find similar sentence/word from lesson materials and ask 'هَلْ تَقْصِدُ ...؟' (Did you mean ...?) to help them.");
        } else {
            systemParts.push(`Siz til o'rgatuvchi yordamchisiz. Javob tilini: ${language}.`);
        }

        // Format context as structured lesson materials (not raw JSON)
        // IMPROVED: Token-based truncation
        const contextSummary = this.formatLessonMaterials(context);

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

        // Pre-flight token validation
        const tokenValidation = this.tokenCounter.validateTokenLimit(
            messages,
            GPT_MODEL,
            MAX_TOKENS
        );
        if (tokenValidation.exceedsLimit) {
            console.warn(`⚠️  Token limit exceeded: ${tokenValidation.totalTokens} tokens (limit: ${tokenValidation.availableForContext + MAX_TOKENS})`);
            // Truncate context if needed (should rarely happen due to formatLessonMaterials)
        }

        try {
            console.log(`   🚀 Model: ${GPT_MODEL}`);

            // Retry logic bilan OpenAI API call
            const res = await this.retryHelper.executeWithRetry(
                async () => {
                    return await axios.post(
                        "https://api.openai.com/v1/chat/completions",
                        {
                            model: GPT_MODEL,
                            messages,
                            max_tokens: MAX_TOKENS,
                            temperature: TEMPERATURE,
                        },
                        {
                            headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
                            timeout: 30000 // 30 seconds timeout
                        }
                    );
                },
                {
                    maxRetries: 3,
                    initialDelay: 1000,
                    maxDelay: 10000,
                    onRetry: (attempt, error) => {
                        console.log(`   🔄 Retrying GPT call (attempt ${attempt}/3)...`);
                    }
                }
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
            console.log(`❌ GPT Error after retries: ${e.message}`);
            // Fallback response
            return {
                text: `Javob: ${correctedPrompt}`,
                usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
            };
        }
    }

    /**
     * Format lesson materials from context array into structured text
     * Only includes lesson text content, not metadata
     * IMPROVED: Token-based truncation instead of character-based
     */
    private formatLessonMaterials(context: any): string {
        if (!context || !Array.isArray(context)) {
            return "No lesson materials available.";
        }

        try {
            const materials: string[] = [];

            // Token-based budget calculation
            // System message: ~300 tokens, conversation: ~500 tokens, completion: 400 tokens, buffer: 100
            const systemMessageEstimate = 300;
            const conversationEstimate = 500;
            const completionTokens = MAX_TOKENS; // 350
            const buffer = 100;

            // Model limit (gpt-4o: 8192, fallback: 8000)
            const modelLimit = 8000;
            const maxContextTokens = modelLimit - systemMessageEstimate - conversationEstimate - completionTokens - buffer;

            let totalTokens = 0;

            for (const item of context) {
                // Extract lesson text from various possible field names
                const lessonText = item?.text || item?.content || item?.dialogue || "";
                if (!lessonText) continue;

                // Add lesson order if available for context
                const lessonInfo = item?.lessonOrder ? `Lesson ${item.lessonOrder}: ` : "";
                const formatted = `${lessonInfo}${lessonText}`;

                // Estimate tokens for this formatted lesson
                const lessonTokens = this.tokenCounter.estimateTokens(formatted);

                // Check if adding this lesson would exceed budget
                if (totalTokens + lessonTokens > maxContextTokens) {
                    // Try to add partial lesson if there's space
                    const remainingTokens = maxContextTokens - totalTokens;
                    if (remainingTokens > 50) { // At least 50 tokens worth of content
                        const remainingChars = Math.floor(remainingTokens * 3.5); // Approximation
                        if (remainingChars > 0) {
                            materials.push(lessonInfo + lessonText.slice(0, remainingChars) + "...");
                        }
                    }
                    break;
                }

                materials.push(formatted);
                totalTokens += lessonTokens;
            }

            const result = materials.length > 0
                ? materials.join("\n\n")
                : "No lesson materials found.";

            // Log token usage for monitoring
            console.log(`   📊 Context formatting: ${totalTokens} tokens used / ${maxContextTokens} available`);

            return result;
        } catch (e) {
            console.warn("⚠️  Error formatting lesson materials:", e);
            return "Error loading lesson materials.";
        }
    }
}

