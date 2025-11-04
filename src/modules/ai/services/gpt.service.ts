import { Injectable } from "@nestjs/common";
import axios from "axios";
import { RetryHelperService } from "./retry-helper.service";
import { TokenCounterService } from "./token-counter.service";

// Environment variables - o'qish va console logging
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const GPT_MODEL = process.env.GPT_MODEL || "gpt-4o";
const MAX_TOKENS = Number(process.env.MAX_TOKENS || 350); // Increased from 200 to 350 for Arabic with tashkeel
const TEMPERATURE = Number(process.env.TEMPERATURE || 0); // Deterministik response uchun 0
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
    async generateWithUsage(params: { prompt: string; context: any; language: string; strict: boolean; conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>; conversationTopic?: { topic: string | null; keywords: string[] } }): Promise<GPTResponse> {
        // Reuse existing generate logic but extract usage
        const { prompt, context, language, strict, conversationHistory = [], conversationTopic } = params;

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

        // Extract names from conversation history for context
        const conversationNames = this.extractNamesFromConversation(conversationHistory);

        // System parts - SIMPLE AND CLEAR
        const systemParts: string[] = [];
        if (language === 'ar' || language === 'arabic') {
            systemParts.push("You are an Arabic language learning assistant for beginners.");
            systemParts.push("");
            systemParts.push("CRITICAL RULE - Subject Matching:");
            systemParts.push("- If user asks about an OBJECT (الدفتر, الكتاب, القلم), answer about THAT OBJECT");
            systemParts.push("- If user asks about a PERSON (أنت, أنا, هو), answer about THAT PERSON");
            systemParts.push("- NEVER mix: object question → object answer, person question → person answer");
            systemParts.push("");
            systemParts.push("CRITICAL RULE - Conversation Context:");
            if (conversationNames.length > 0) {
                systemParts.push(`- REMEMBER: In this conversation, the user's name is: ${conversationNames.join(', ')}`);
                systemParts.push(`- ALWAYS use this name when addressing the user (يَا ${conversationNames[0]}...)`);
                systemParts.push(`- NEVER ask for the name again if you already know it from conversation history`);
            }
            systemParts.push("- Pay attention to conversation history - if a name was mentioned before, remember it!");

            // Conversation topic/mavzu haqida context
            if (conversationTopic && conversationTopic.topic) {
                const topicMap: Record<string, string> = {
                    'profession': 'kasb haqida',
                    'object': 'narsa haqida',
                    'place': 'joy haqida'
                };
                const topicName = topicMap[conversationTopic.topic] || conversationTopic.topic;
                systemParts.push(`- Current conversation topic: ${topicName} (${conversationTopic.keywords.slice(0, 3).join(', ')})`);
                systemParts.push("- Respond naturally based on the conversation flow and current topic");
                systemParts.push("- If the topic changes, adapt your responses accordingly");
            }

            systemParts.push("- Maintain natural conversation flow - like a human would talk");
            systemParts.push("- Build upon previous messages in the conversation");
            systemParts.push("- If user changes topic, smoothly transition to the new topic");
            systemParts.push("");
            systemParts.push("Other rules:");
            systemParts.push("1. Respond in Modern Standard Arabic with full diacritical marks (تشكيل).");
            systemParts.push("2. Use ONLY vocabulary from the lesson materials provided.");
            systemParts.push("3. Give short, clear answers (never echo user's words).");
            systemParts.push("4. For yes/no questions (هَلْ), answer with نَعَمْ or لَا.");
        } else {
            systemParts.push(`Siz til o'rgatuvchi yordamchisiz. Javob tilini: ${language}.`);
        }

        // Format context as structured lesson materials (not raw JSON)
        // IMPROVED: Token-based truncation
        const contextSummary = this.formatLessonMaterials(context);

        const messages: Array<{ role: string; content: string }> = [
            { role: "system", content: systemParts.join("\n") },
            { role: "system", content: `Lesson materials:\n${contextSummary}` },
        ];

        // Add few-shot examples for subject matching (SIMPLE AND CLEAR)
        if (language === 'ar' || language === 'arabic') {
            messages.push(
                // Example 1: Object location
                { role: "user", content: "أَيْنَ الدَّفْتَرُ؟" },
                { role: "assistant", content: "الدَّفْتَرُ عَلَى الْمَكْتَبِ." },

                // Example 2: Person location
                { role: "user", content: "أَيْنَ أَنْتَ؟" },
                { role: "assistant", content: "أَنَا فِي الْمَسْجِدِ." },

                // Example 3: What is this
                { role: "user", content: "مَا هَذَا؟" },
                { role: "assistant", content: "هَذَا كِتَابٌ." },

                // Example 4: Conversation context - remembering names
                { role: "user", content: "اِسْمِي سَعِيدٌ." },
                { role: "assistant", content: "مَرْحَبًا يَا سَعِيدُ!" },
                { role: "user", content: "مَا هَذَا؟" },
                { role: "assistant", content: "هَذَا كِتَابٌ، يَا سَعِيدُ." }, // Name remembered from previous message

                // Example 5: Natural conversation flow - topic continuation
                { role: "user", content: "مَا هَذَا؟" },
                { role: "assistant", content: "هَذَا بُرْتُقَالٌ." },
                { role: "user", content: "هَلْ هُوَ لَذِيذٌ؟" },
                { role: "assistant", content: "نَعَمْ، هُوَ لَذِيذٌ جِدًّا." }, // Continuing about the same object (orange)

                // Example 6: Topic transition - natural flow
                { role: "user", content: "أَيْنَ الدَّفْتَرُ؟" },
                { role: "assistant", content: "الدَّفْتَرُ عَلَى الْمَكْتَبِ." },
                { role: "user", content: "وَالْكِتَابُ؟" },
                { role: "assistant", content: "الْكِتَابُ أَيْضًا عَلَى الْمَكْتَبِ." }, // Continuing conversation about location

                // Anti-pattern warning
                { role: "system", content: "REMEMBER: If user asks 'أَيْنَ الدَّفْتَرُ؟' (where is notebook?), answer about the NOTEBOOK, NOT about yourself!" },

                // Conversation context reminder
                { role: "system", content: "IMPORTANT: Pay attention to conversation history and maintain natural flow. Build upon previous messages, remember names and topics discussed, and smoothly adapt when topics change." }
            );
        }

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
     * Conversation history'dan ismlarni extract qilish
     * Ismlar quyidagi pattern'lardan topiladi:
     * - "يَا سَعِيدُ" (addressing user)
     * - "اِسْمِي سَعِيدٌ" (user introducing themselves)
     * - "أَنَا سَعِيدٌ" (user stating their name)
     * 
     * @param conversationHistory - Conversation history array
     * @returns Array of unique names found in conversation
     */
    private extractNamesFromConversation(conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>): string[] {
        const names = new Set<string>();

        if (!conversationHistory || conversationHistory.length === 0) {
            return [];
        }

        // Arabic name patterns
        const namePatterns = [
            /يَا\s+(\w+)[\u064B-\u065F\u0670]?/g, // يَا سَعِيدُ
            /اِسْمِي\s+(\w+)[\u064B-\u065F\u0670]?/g, // اِسْمِي سَعِيدٌ
            /أَنَا\s+(\w+)[\u064B-\u065F\u0670]?/g, // أَنَا سَعِيدٌ
            /اسْمِي\s+(\w+)[\u064B-\u065F\u0670]?/g, // اسْمِي سَعِيدٌ (without hamza)
            /انا\s+(\w+)[\u064B-\u065F\u0670]?/g, // انا سَعِيدٌ (without hamza)
        ];

        // Common Arabic names in lessons (to filter out false positives)
        const knownNames = new Set([
            'سَعِيد', 'فَرِيد', 'أَحْمَد', 'مُحَمَّد', 'كَرِيم', 'عَلِي',
            'حَسَن', 'حُسَيْن', 'عُثْمَان', 'خَالِد', 'عُمَر', 'عُبَيْد',
            'سعد', 'فريد', 'أحمد', 'محمد', 'كريم', 'علي' // Without diacritics
        ]);

        // Iterate through conversation history (most recent first)
        for (let i = conversationHistory.length - 1; i >= 0; i--) {
            const msg = conversationHistory[i];
            const text = msg.content || '';

            if (!text || text.trim().length === 0) {
                continue;
            }

            // Remove diacritics for pattern matching
            const textWithoutDiacritics = text.replace(/[\u064B-\u065F\u0670]/g, '');

            // Try each pattern
            for (const pattern of namePatterns) {
                const matches = textWithoutDiacritics.matchAll(pattern);
                for (const match of matches) {
                    if (match[1]) {
                        const name = match[1].trim();

                        // Filter out common words that might match (like articles, prepositions)
                        const commonWords = new Set(['الله', 'ال', 'هذا', 'هذه', 'ذلك', 'ذلك', 'هؤلاء', 'هناك']);

                        if (
                            name.length >= 2 &&
                            name.length <= 10 && // Reasonable name length
                            !commonWords.has(name) &&
                            (knownNames.has(name) || knownNames.has(name.replace(/[^a-z\u0600-\u06FF]/gi, '')))
                        ) {
                            names.add(name);
                        }
                    }
                }
            }
        }

        // Return unique names, prioritizing more recent ones
        return Array.from(names);
    }

    /**
     * Extract vocabulary from context with semantic categories
     * Categories: object, place, person, quality, action, particle, demonstrative, question
     * Falls back to POS-based categorization if category field is not present
     */
    private extractVocabularyList(context: any, lastWatchedLessonOrder?: number): string[] {
        if (!context || !Array.isArray(context)) {
            return [];
        }

        const vocabularyWords: string[] = [];
        const seenWords = new Set<string>();

        for (const lesson of context) {
            // Skip future lessons if lastWatchedLessonOrder provided
            if (lastWatchedLessonOrder && lesson.lessonOrder > lastWatchedLessonOrder) {
                continue;
            }

            if (lesson.vocabulary && Array.isArray(lesson.vocabulary)) {
                for (const vocab of lesson.vocabulary) {
                    const word = vocab.word || vocab.normalized;
                    if (word && !seenWords.has(word)) {
                        vocabularyWords.push(word);
                        seenWords.add(word);
                    }
                }
            }
        }

        return vocabularyWords;
    }

    /**
     * Build few-shot examples to teach GPT logical response patterns
     * These examples demonstrate:
     * 1. Subject matching (object question → object answer)
     * 2. Question type matching (where → location, what → object, who → person)
     * 3. Proper diacritical marks
     */
    private buildFewShotExamples(): Array<{ role: string; content: string }> {
        const examples: Array<{ role: string; content: string }> = [];

        // EXAMPLE 1: Object location (WHERE + OBJECT)
        examples.push(
            { role: "user", content: "أَيْنَ الدَّفْتَرُ؟" }, // Where is the notebook?
            { role: "assistant", content: "الدَّفْتَرُ فِي الْمَدْرَسَةِ." } // The notebook is in the school
        );

        // EXAMPLE 2: Object location (WHERE + OBJECT)
        examples.push(
            { role: "user", content: "أَيْنَ الْكِتَابُ؟" }, // Where is the book?
            { role: "assistant", content: "الْكِتَابُ عَلَى الطَّاوِلَةِ." } // The book is on the table
        );

        // EXAMPLE 3: Person location (WHERE + PERSON)
        examples.push(
            { role: "user", content: "أَيْنَ أَنْتَ؟" }, // Where are you?
            { role: "assistant", content: "أَنَا فِي الْمَسْجِدِ." } // I am in the mosque
        );

        // EXAMPLE 4: Person identity (WHO)
        examples.push(
            { role: "user", content: "مَنْ أَنْتَ؟" }, // Who are you?
            { role: "assistant", content: "أَنَا طَالِبٌ." } // I am a student
        );

        // EXAMPLE 5: Object identification (WHAT)
        examples.push(
            { role: "user", content: "مَا هَذَا؟" }, // What is this?
            { role: "assistant", content: "هَذَا كِتَابٌ." } // This is a book
        );

        // EXAMPLE 6: Yes/No question
        examples.push(
            { role: "user", content: "هَلْ هُوَ لَذِيذٌ؟" }, // Is it delicious?
            { role: "assistant", content: "نَعَمْ، هُوَ لَذِيذٌ جِدًّا." } // Yes, it is very delicious
        );

        // CRITICAL ANTI-PATTERNS (what NOT to do)
        examples.push({
            role: "system",
            content: "❌ FORBIDDEN PATTERN: User asks 'أَيْنَ الدَّفْتَرُ؟' (where is notebook?) → DO NOT answer 'أَنَا فِي الْمَسْجِدِ' (I am in mosque). This is WRONG because subject mismatch (notebook vs. I)."
        });

        examples.push({
            role: "system",
            content: "✅ CORRECT PATTERN: User asks 'أَيْنَ الدَّفْتَرُ؟' (where is notebook?) → Answer 'الدَّفْتَرُ فِي الْمَدْرَسَةِ' (notebook is in school). This is RIGHT because subject matches (notebook → notebook)."
        });

        return examples;
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

