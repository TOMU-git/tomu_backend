import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { RetryHelperService } from "./retry-helper.service";
import { TokenCounterService } from "./token-counter.service";
import { GPTPromptBuilderService } from "./gpt-prompt-builder.service";

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

/**
 * OpenAI API response structure
 */
interface OpenAIChoice {
    message: {
        content: string | null;
        refusal?: string | null; // GPT-4o refusal mechanism
    };
    finish_reason?: string; // stop, length, content_filter, etc.
}

interface OpenAIUsage {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
}

interface OpenAIResponse {
    choices: OpenAIChoice[];
    usage?: OpenAIUsage;
}

interface AxiosOpenAIResponse {
    data: OpenAIResponse;
}

@Injectable()
export class GPTService {
    private readonly logger = new Logger(GPTService.name);

    // Configuration from environment variables (via ConfigService)
    private readonly openaiApiKey: string;
    private readonly gptModel: string;
    private readonly maxTokens: number;
    private readonly temperature: number;
    private readonly strictNoEcho: boolean;
    private readonly contextMaxLength: number;

    // API Configuration Constants
    private readonly DEFAULT_TIMEOUT_MS = 30000; // 30 seconds
    private readonly DEFAULT_MAX_RETRIES = 3;
    private readonly DEFAULT_INITIAL_DELAY_MS = 1000; // 1 second
    private readonly DEFAULT_MAX_DELAY_MS = 10000; // 10 seconds

    // Token Management Constants
    private readonly MAX_CONVERSATION_HISTORY_MESSAGES = 10;
    private readonly MIN_TOKEN_THRESHOLD = 50; // Minimum tokens for partial content
    private readonly CHARS_PER_TOKEN_ESTIMATE = 3.5; // Approximation for Arabic text

    // Token Budget Estimates (for formatLessonMaterials)
    private readonly SYSTEM_MESSAGE_TOKEN_ESTIMATE = 300;
    private readonly CONVERSATION_TOKEN_ESTIMATE = 500;
    private readonly TOKEN_BUFFER = 100;
    private readonly MODEL_LIMIT_FALLBACK = 128000; // gpt-4o: 128K context window

    constructor(
        private readonly configService: ConfigService,
        private readonly retryHelper: RetryHelperService,
        private readonly tokenCounter: TokenCounterService,
        private readonly promptBuilder: GPTPromptBuilderService
    ) {
        // Load configuration from ConfigService
        this.openaiApiKey = this.configService.get<string>("OPENAI_API_KEY") || "";
        this.gptModel = this.configService.get<string>("GPT_MODEL") || "gpt-4o"; // ✅ Default: gpt-4o (mavjud model)
        this.maxTokens = Number(this.configService.get<string>("MAX_TOKENS") || 350);
        this.temperature = Number(this.configService.get<string>("TEMPERATURE") || 0);
        this.strictNoEcho = this.configService.get<string>("STRICT_NO_ECHO") === "1";
        this.contextMaxLength = Number(this.configService.get<string>("CONTEXT_MAX_LENGTH") || 8000);

        // Log configuration on service initialization
        if (!this.openaiApiKey) {
            this.logger.warn("⚠️  WARNING: OPENAI_API_KEY not found in .env");
        } else {
            this.logger.log("✅ OPENAI_API_KEY loaded");
        }
        this.logger.log(`📋 GPT Configuration loaded: MODEL=${this.gptModel}, MAX_TOKENS=${this.maxTokens}, TEMPERATURE=${this.temperature}, STRICT_NO_ECHO=${this.strictNoEcho}, CONTEXT_MAX_LENGTH=${this.contextMaxLength}`);
    }

    /**
     * Kontekst asosida javob generatsiya qilish
     * @deprecated Use generateWithUsage() for cost tracking
     * @returns Faqat text (backward compatibility)
     */
    async generate(params: { prompt: string; context: any; language: string; strict: boolean; }): Promise<string> {
        // Input validation
        if (!params?.prompt || typeof params.prompt !== 'string' || params.prompt.trim().length === 0) {
            throw new BadRequestException('Prompt must be a non-empty string');
        }
        if (!params?.language || typeof params.language !== 'string') {
            throw new BadRequestException('Language must be a non-empty string');
        }

        // Fix common Whisper transcription errors for Arabic
        const prompt = this.correctPrompt(params.prompt);

        const { context, language, strict } = params;
        if (!this.openaiApiKey) {
            this.logger.warn('⚠️ OpenAI API key not found, using fallback');
            return `Javob: ${prompt}`;
        }

        // Build system prompt
        const systemPrompt = this.promptBuilder.buildBasicSystemPrompt(language);

        // Format context as structured lesson materials
        const contextSummary = this.formatLessonMaterials(context);

        // Build messages array
        const messages = this.promptBuilder.buildMessages({
            systemPrompt,
            contextSummary,
            prompt,
            language,
            useComprehensiveExamples: false,
        });

        try {
            const res = await this.callOpenAI(messages);
            const text = res.data?.choices?.[0]?.message?.content?.trim() || "";
            return text;
        } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : 'Unknown error';
            const errorStack = e instanceof Error ? e.stack : undefined;
            this.logger.error(`❌ GPT Error after retries: ${errorMessage}`, errorStack);

            // Log response data if available (for debugging API errors)
            if (e && typeof e === 'object' && 'response' in e) {
                const axiosError = e as any;
                if (axiosError.response?.data) {
                    this.logger.error(`❌ GPT API Response Data:`, JSON.stringify(axiosError.response.data, null, 2));
                }
                if (axiosError.response?.status) {
                    this.logger.error(`❌ GPT API Response Status: ${axiosError.response.status}`);
                }
            }

            return `Javob: ${prompt}`; // fallback
        }
    }

    /**
     * Kontekst asosida javob generatsiya qilish (usage ma'lumotlari bilan)
     * @param params - Generate parametrlari
     * @returns Text va usage ma'lumotlari (cost tracking uchun)
     */
    async generateWithUsage(params: { prompt: string; context: any; language: string; strict: boolean; conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>; conversationTopic?: { topic: string | null; keywords: string[] }; freeMode?: boolean; conversationEntities?: string }): Promise<GPTResponse> {
        // Input validation
        if (!params?.prompt || typeof params.prompt !== 'string' || params.prompt.trim().length === 0) {
            throw new BadRequestException('Prompt must be a non-empty string');
        }
        if (!params?.language || typeof params.language !== 'string') {
            throw new BadRequestException('Language must be a non-empty string');
        }
        if (params.conversationHistory !== undefined && !Array.isArray(params.conversationHistory)) {
            throw new BadRequestException('ConversationHistory must be an array if provided');
        }

        // Reuse existing generate logic but extract usage
        const { prompt, context, language, strict, conversationHistory = [], conversationTopic, freeMode = false, conversationEntities } = params;

        // Prompt correction (same as generate)
        const correctedPrompt = this.correctPrompt(prompt);

        if (!this.openaiApiKey) {
            this.logger.warn('⚠️ OpenAI API key not found, using fallback');
            return {
                text: `Javob: ${correctedPrompt}`,
                usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
            };
        }

        // Erkin rejim tekshiruvi
        let systemPrompt: string;
        let contextSummary: string;
        let useComprehensiveExamples: boolean;

        if (freeMode) {
            // Erkin rejim: materiallarga havola qilmaydigan system prompt
            systemPrompt = this.promptBuilder.buildFreeModeSystemPrompt(language);
            contextSummary = ""; // Bo'sh context
            useComprehensiveExamples = false; // Oddiy misollar
        } else {
            // Materiallarga asoslangan rejim
            const conversationNames = this.extractNamesFromConversation(conversationHistory);
            systemPrompt = this.promptBuilder.buildComprehensiveSystemPrompt(language, {
                conversationNames,
                conversationTopic,
            });
            contextSummary = this.formatLessonMaterials(context);
            useComprehensiveExamples = true;
        }

        // Build messages array
        const messages = this.promptBuilder.buildMessages({
            systemPrompt,
            contextSummary,
            prompt: correctedPrompt,
            language,
            conversationHistory,
            useComprehensiveExamples,
            maxHistoryMessages: this.MAX_CONVERSATION_HISTORY_MESSAGES,
            conversationEntities, // Entity tracking uchun
        });

        // Pre-flight token validation
        const tokenValidation = this.tokenCounter.validateTokenLimit(
            messages,
            this.gptModel,
            this.maxTokens
        );
        if (tokenValidation.exceedsLimit) {
            this.logger.warn(`⚠️  Token limit exceeded: ${tokenValidation.totalTokens} tokens (limit: ${tokenValidation.availableForContext + this.maxTokens})`);
            // Truncate context if needed (should rarely happen due to formatLessonMaterials)
        }

        try {
            const res = await this.callOpenAI(messages);

            // Debug: GPT response'ni to'liq log qilish
            const firstChoice = res.data?.choices?.[0];
            // this.logger.debug(`🔍 GPT Response structure:`, JSON.stringify({
            //     hasChoices: !!res.data?.choices,
            //     choicesLength: res.data?.choices?.length,
            //     firstChoice: firstChoice ? {
            //         hasMessage: !!firstChoice.message,
            //         hasContent: !!firstChoice.message?.content,
            //         contentType: typeof firstChoice.message?.content,
            //         contentLength: firstChoice.message?.content?.length || 0,
            //         contentPreview: firstChoice.message?.content?.substring(0, 100) || '',
            //         finishReason: firstChoice.finish_reason || 'unknown',
            //         refusal: firstChoice.message?.refusal || null, // ✅ Refusal tekshiruvi
            //     } : null
            // }, null, 2));

            // Refusal tekshiruvi - agar GPT javob berishni rad etgan bo'lsa
            if (firstChoice?.message?.refusal) {
                this.logger.error(`❌ GPT Refusal: ${firstChoice.message.refusal}`);
                throw new Error(`GPT refused to respond: ${firstChoice.message.refusal}`);
            }

            const text = firstChoice?.message?.content?.trim() || "";

            // Extract usage information
            const usage = res.data?.usage;
            const usageData: GPTUsage = usage ? {
                promptTokens: usage.prompt_tokens || 0,
                completionTokens: usage.completion_tokens || 0,
                totalTokens: usage.total_tokens || 0,
            } : { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

            // this.logger.debug(`📊 GPT Usage: ${usageData.totalTokens} tokens (prompt: ${usageData.promptTokens}, completion: ${usageData.completionTokens})`);
            // this.logger.debug(`📝 GPT Text result: "${text}" (length: ${text.length})`);

            return { text, usage: usageData };
        } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : 'Unknown error';
            const errorStack = e instanceof Error ? e.stack : undefined;
            this.logger.error(`❌ GPT Error after retries: ${errorMessage}`, errorStack);

            // Log response data if available (for debugging API errors)
            if (e && typeof e === 'object' && 'response' in e) {
                const axiosError = e as any;
                if (axiosError.response?.data) {
                    this.logger.error(`❌ GPT API Response Data:`, JSON.stringify(axiosError.response.data, null, 2));
                }
                if (axiosError.response?.status) {
                    this.logger.error(`❌ GPT API Response Status: ${axiosError.response.status}`);
                }
            }

            // Fallback response
            return {
                text: `Javob: ${correctedPrompt}`,
                usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
            };
        }
    }

    /**
     * Execute OpenAI API call with retry logic
     * 
     * @param messages - Array of messages to send to GPT
     * @returns Axios response from OpenAI API
     */
    private async callOpenAI(messages: Array<{ role: string; content: string }>): Promise<AxiosOpenAIResponse> {
        this.logger.debug(`🚀 Calling GPT API with model: ${this.gptModel}`);

        // Debug: Request parametrlarini log qilish
        this.logger.debug(`📤 GPT Request: ${messages.length} messages, max_tokens: ${this.maxTokens}, temperature: ${this.temperature}`);
        // this.logger.debug(`📝 Messages preview:`, JSON.stringify(
        //     messages.map(m => ({ role: m.role, contentLength: m.content.length, preview: m.content.substring(0, 100) })),
        //     null,
        //     2
        // ));

        return await this.retryHelper.executeWithRetry(
            async () => {
                return await axios.post(
                    "https://api.openai.com/v1/chat/completions",
                    {
                        model: this.gptModel,
                        messages,
                        max_completion_tokens: this.maxTokens,
                        temperature: this.temperature,
                    },
                    {
                        headers: { Authorization: `Bearer ${this.openaiApiKey}` },
                        timeout: this.DEFAULT_TIMEOUT_MS
                    }
                );
            },
            {
                maxRetries: this.DEFAULT_MAX_RETRIES,
                initialDelay: this.DEFAULT_INITIAL_DELAY_MS,
                maxDelay: this.DEFAULT_MAX_DELAY_MS,
                onRetry: (attempt, error) => {
                    this.logger.warn(`🔄 Retrying GPT call (attempt ${attempt}/${this.DEFAULT_MAX_RETRIES})... Error: ${error?.message || 'Unknown error'}`);
                }
            }
        );
    }

    /**
     * Fix common Whisper transcription errors for Arabic
     * Corrects common mistakes in Arabic text transcription
     * 
     * @param prompt - Original prompt text
     * @returns Corrected prompt text
     */
    private correctPrompt(prompt: string): string {
        const originalPrompt = prompt;
        let corrected = prompt;

        // YO'QOLGAN HARFLARNI QAYTARISH:
        // "يفريد" → "يا فريد" (missing ي harfi)
        corrected = corrected.replace(/يَفَرِيد/g, 'يَا فَرِيد');
        corrected = corrected.replace(/يفريد/g, 'يا فريد');
        corrected = corrected.replace(/يَفَرِيد؟/g, 'يَا فَرِيد؟');

        // "ول" → "هل" (question particle xatosi)
        corrected = corrected.replace(/وَوَلْ/g, 'وَهَلْ');
        corrected = corrected.replace(/ووَلْ/g, 'وَهَلْ');
        corrected = corrected.replace(/ووَل/g, 'وَهَلْ');
        corrected = corrected.replace(/وول/g, 'وَهَلْ');

        // "مْ" → "مَا" (question word xatosi)
        corrected = corrected.replace(/\s+م[ٌْ]/g, ' مَا');

        // if (corrected !== originalPrompt) {
        //     this.logger.debug(`✏️  Auto-corrected prompt: "${originalPrompt}" → "${corrected}"`);
        // }

        return corrected;
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
            const systemMessageEstimate = this.SYSTEM_MESSAGE_TOKEN_ESTIMATE;
            const conversationEstimate = this.CONVERSATION_TOKEN_ESTIMATE;
            const completionTokens = this.maxTokens;
            const buffer = this.TOKEN_BUFFER;

            // Model limit (gpt-5: 8192, fallback: 8000)
            const modelLimit = this.MODEL_LIMIT_FALLBACK;
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
                    if (remainingTokens > this.MIN_TOKEN_THRESHOLD) {
                        const remainingChars = Math.floor(remainingTokens * this.CHARS_PER_TOKEN_ESTIMATE);
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
            // this.logger.debug(`📊 Context formatting: ${totalTokens} tokens used / ${maxContextTokens} available`);

            return result;
        } catch (e) {
            this.logger.warn("⚠️  Error formatting lesson materials:", e);
            return "Error loading lesson materials.";
        }
    }
}

