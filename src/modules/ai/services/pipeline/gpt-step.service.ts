import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GPTService, GPTResponse } from "../gpt.service";
import { PipelineStep, VoiceInput } from "./pipeline.types";
import { ArabicTextUtils } from "../../utils/arabic-text.util";
import { normalizeText, createWordSet } from "../../utils/text-normalization.util";
import { SIMILARITY_THRESHOLDS } from "../../constants/gpt-step.constants";
import { ConversationTopicExtractorService } from "./extractors/conversation-topic-extractor.service";
import { DialogueCorrectionService } from "./correctors/dialogue-correction.service";
import { ContextFilterService } from "./filters/context-filter.service";
import { MaterialMatchingService } from "./matchers/material-matching.service";
import { ResponseValidationService } from "./validators/response-validation.service";
import { FallbackResponseService } from "./builders/fallback-response.service";

/**
 * GPT Step: AI javob yaratish
 * 
 * Refactored: Modullarga ajratilgan, soddalashtirilgan versiya
 * 
 * Vazifalari:
 * - STT xatolarini tuzatish
 * - Materiallardan javob topish
 * - GPT orqali javob yaratish
 * - Materialda javob topilmasa fallback javob berish
 */
@Injectable()
export class GPTStep implements PipelineStep {
    private readonly accessGeneral: boolean; // Erkin rejim flag'i

    constructor(
        private readonly configService: ConfigService,
        private readonly gpt: GPTService,
        private readonly topicExtractor: ConversationTopicExtractorService,
        private readonly dialogueCorrection: DialogueCorrectionService,
        private readonly contextFilter: ContextFilterService,
        private readonly materialMatching: MaterialMatchingService,
        private readonly responseValidation: ResponseValidationService,
        private readonly fallbackResponse: FallbackResponseService,
    ) {
        // Environment variable'dan erkin rejim flag'ini o'qish
        // Default: false (materiallarga asoslangan rejim)
        this.accessGeneral = this.configService.get<string>("ACCESS_GENERAL") === "true";
    }

    async execute(input: VoiceInput & { validatedText: string; context: any; conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>; lastWatchedLessonOrder?: number; profile?: any }): Promise<VoiceInput> {
        const lastWatchedLessonOrder = input.lastWatchedLessonOrder || 0;
        const profile = (input as any).profile; // Profile'ni input'dan olish

        // Conversation topic'ni aniqlash
        const conversationTopic = this.topicExtractor.extractTopic(
            input.conversationHistory || [],
            input.context
        );

        // STT xatolarini tuzatish
        let userTextCorrected = this.dialogueCorrection.applyConversationAwareCorrection(
            input.validatedText || '',
            input.context,
            conversationTopic
        );

        userTextCorrected = this.dialogueCorrection.applyDialogueSentenceCorrection(
            userTextCorrected,
            input.context
        );

        const userText = userTextCorrected;
        const normalizedUser = normalizeText(userText);
        const userWords = createWordSet(userText);

        // Erkin rejim tekshiruvi
        // Agar ACCESS_GENERAL=true bo'lsa, material matching'ni o'tkazib yuboramiz
        if (this.accessGeneral) {
            // Erkin rejim: to'g'ridan-to'g'ri GPT'ga so'rov yuborish
            // Context'ni yubormaymiz - faqat user text va conversation history
            const response = await this.generateGPTResponse(
                userText,
                normalizedUser,
                userWords,
                [], // Bo'sh context - materiallarga etibor berilmaydi
                lastWatchedLessonOrder,
                { topic: null, keywords: [] }, // Conversation topic'ni ham o'tkazib yuboramiz
                input.conversationHistory || [],
                true // freeMode = true
            );

            // Translation - erkin rejimda faqat GPT javobini translate qilamiz
            if (!response.aiResponseUz && response.aiResponse && response.aiResponse.trim().length > 0) {
                try {
                    response.aiResponseUz = await this.fallbackResponse.translateGPTResponse(
                        response.aiResponse,
                        [], // Bo'sh context
                        lastWatchedLessonOrder
                    );
                } catch (e) {
                    // Translation xatosi bo'lsa, bo'sh qoldiramiz
                    response.aiResponseUz = '';
                }
            }

            const aiResponseLatin = ArabicTextUtils.transliterateArabic(response.aiResponse || "");
            console.log('GPT javobi (Erkin rejim):', response.aiResponse);
            console.log('GPT javobi (latin):', aiResponseLatin);

            // Usage ma'lumotlarini to'plash
            const usage = input.usage || {};
            if (response.gptUsage) {
                usage.gpt = {
                    promptTokens: response.gptUsage.promptTokens || 0,
                    completionTokens: response.gptUsage.completionTokens || 0,
                    totalTokens: response.gptUsage.totalTokens || 0,
                };
            }

            return {
                ...input,
                aiResponse: response.aiResponse,
                aiResponseUz: response.aiResponseUz || '',
                usage,
            } as VoiceInput & { aiResponse: string; aiResponseUz: string };
        }

        // Materiallarga asoslangan rejim (default)
        // Materiallardan javob topish
        const materialMatch = this.materialMatching.findMaterialResponse(
            userText,
            normalizedUser,
            userWords,
            input.context
        );

        // Console log: Material matching natijasi
        if (materialMatch.nextSentence) {
            console.log(`📚 Material match topildi (lessonOrder: ${materialMatch.lessonOrder})`);
            console.log(`   📝 Topilgan javob: "${materialMatch.nextSentence.substring(0, 60)}"`);
        } else if (materialMatch.bestMatchScore > 0) {
            console.log(`🔍 Material match: ${(materialMatch.bestMatchScore * 100).toFixed(0)}% o'xshashlik`);
        } else {
            console.log(`❌ Material match topilmadi, GPT'ga so'rov yuborilmoqda...`);
        }

        // Response yaratish
        const response = await this.buildResponse(
            materialMatch,
            userText,
            normalizedUser,
            userWords,
            input.context,
            lastWatchedLessonOrder,
            conversationTopic,
            input.conversationHistory || []
        );

        // Final translation check
        if (!response.aiResponseUz && response.aiResponse && response.aiResponse.trim().length > 0) {
            response.aiResponseUz = await this.fallbackResponse.translateGPTResponse(
                response.aiResponse,
                input.context,
                lastWatchedLessonOrder
            );
        }

        const aiResponseLatin = ArabicTextUtils.transliterateArabic(response.aiResponse || "");

        console.log('✅ GPT javobi:', response.aiResponse);
        console.log('✅ GPT javobi (latin):', aiResponseLatin);
        if (!response.aiResponseUz) {
            console.warn("   ⚠️  Uzbek translation is missing!");
        }

        // Usage ma'lumotlarini to'plash
        const usage = input.usage || {};
        if (response.gptUsage) {
            usage.gpt = {
                promptTokens: response.gptUsage.promptTokens || 0,
                completionTokens: response.gptUsage.completionTokens || 0,
                totalTokens: response.gptUsage.totalTokens || 0,
            };
        }

        return {
            ...input,
            aiResponse: response.aiResponse,
            aiResponseUz: response.aiResponseUz || '',
            usage,
        } as VoiceInput & { aiResponse: string; aiResponseUz: string };
    }

    /**
     * Response yaratish - asosiy logika
     */
    private async buildResponse(
        materialMatch: any,
        userText: string,
        normalizedUser: string,
        userWords: Set<string>,
        context: any[],
        lastWatchedLessonOrder: number,
        conversationTopic: any,
        conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
    ): Promise<{ aiResponse: string; aiResponseUz: string; gptUsage?: GPTResponse['usage'] }> {
        // 1) Materialdan topilgan javob
        if (materialMatch.nextSentence) {
            if (materialMatch.nextSentence === 'DIALOGUE_END') {
                return this.fallbackResponse.createDialogueEndResponse();
            }

            if (materialMatch.lessonOrder !== null && materialMatch.lessonOrder > lastWatchedLessonOrder) {
                return this.fallbackResponse.createFutureLessonResponse();
            }

            // Material javobini validatsiya qilish
            const validation = this.responseValidation.validateMaterialResponse(
                materialMatch.nextSentence,
                userText,
                normalizedUser,
                userWords
            );

            if (!validation.isValid) {
                console.log(`⚠️  Material javob validatsiyadan o'tmadi (sabab: ${validation.reason || 'unknown'})`);
                return this.fallbackResponse.createNotUnderstoodResponse();
            }

            // Valid material response
            return await this.fallbackResponse.createMaterialResponse(
                materialMatch.nextSentence,
                materialMatch.translationUz,
                context,
                lastWatchedLessonOrder
            );
        }

        // 2) Yaqin match (50%+)
        if (materialMatch.bestMatchScore >= SIMILARITY_THRESHOLDS.SENTENCE_SIMILARITY_HIGH &&
            materialMatch.bestMatchNextSentence &&
            materialMatch.bestMatchNextSentence.length > 1) {
            
            if (materialMatch.bestMatchLessonOrder !== null && materialMatch.bestMatchLessonOrder > lastWatchedLessonOrder) {
                return this.fallbackResponse.createFutureLessonResponse();
            }

            // Help response yaratish
            const helpValidation = this.responseValidation.validateMaterialResponse(
                materialMatch.bestMatchNextSentence,
                userText,
                normalizedUser,
                userWords
            );

            if (helpValidation.isValid) {
                return await this.fallbackResponse.createCloseMatchHelpResponse(
                    materialMatch.bestMatchNextSentence,
                    materialMatch.bestMatchNextSentenceTranslationUz,
                    context,
                    lastWatchedLessonOrder
                );
            }
        }

        // 3) O'rtacha match (30-50%)
        if (materialMatch.bestMatchScore >= SIMILARITY_THRESHOLDS.SENTENCE_SIMILARITY_MODERATE &&
            materialMatch.bestMatchScore < SIMILARITY_THRESHOLDS.SENTENCE_SIMILARITY_HIGH &&
            materialMatch.bestMatchSentence &&
            materialMatch.bestMatchSentence.length > 1) {
            
            if (materialMatch.bestMatchLessonOrder !== null && materialMatch.bestMatchLessonOrder > lastWatchedLessonOrder) {
                return this.fallbackResponse.createFutureLessonResponse();
            }

            return await this.fallbackResponse.createCloseMatchHelpResponse(
                materialMatch.bestMatchSentence,
                materialMatch.bestMatchSentenceTranslationUz,
                context,
                lastWatchedLessonOrder
            );
        }

        // 4) GPT ga so'rov
        return await this.generateGPTResponse(
            userText,
            normalizedUser,
            userWords,
            context,
            lastWatchedLessonOrder,
            conversationTopic,
            conversationHistory,
            false // freeMode = false (materiallarga asoslangan rejim)
        );
    }

    /**
     * GPT response yaratish va validatsiya qilish
     */
    private async generateGPTResponse(
        userText: string,
        normalizedUser: string,
        userWords: Set<string>,
        context: any[],
        lastWatchedLessonOrder: number,
        conversationTopic: any,
        conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
        freeMode: boolean = false
    ): Promise<{ aiResponse: string; aiResponseUz: string; gptUsage?: GPTResponse['usage'] }> {
        // Erkin rejimda context filter'ni o'tkazib yuboramiz
        const filteredContext = freeMode ? [] : this.contextFilter.filterContextByLessonOrder(context, lastWatchedLessonOrder);
        // Erkin rejimda prompt'ni o'zgartirmaymiz
        const enhancedPrompt = freeMode ? userText : this.enhancePromptWithConversationContext(userText, conversationTopic);

        const gptResult = await this.gpt.generateWithUsage({
            prompt: enhancedPrompt,
            context: filteredContext,
            language: 'ar',
            strict: false,
            conversationHistory: conversationHistory,
            conversationTopic: conversationTopic,
            freeMode: freeMode, // Erkin rejim flag'ini uzatish
        });

        const aiResponse = gptResult.text;
        const gptUsage = gptResult.usage;

        // GPT javobini validatsiya qilish
        const validation = this.responseValidation.validateGPTResponse(
            aiResponse,
            userText,
            normalizedUser,
            userWords,
            context,
            lastWatchedLessonOrder,
            conversationTopic
        );

        if (!validation.isValid) {
            console.log(`⚠️  GPT javob validatsiyadan o'tmadi (sabab: ${validation.reason || 'unknown'})`);
            if (validation.reason === 'echo') {
                return this.fallbackResponse.createNotUnderstoodResponse();
            } else if (validation.reason === 'invalid_vocabulary') {
                return await this.fallbackResponse.createNoMaterialResponse(userText);
            } else {
                return await this.fallbackResponse.createNoMaterialResponse(userText);
            }
        }

        // Valid GPT response
        const aiResponseUz = await this.fallbackResponse.translateGPTResponse(
            aiResponse,
            context,
            lastWatchedLessonOrder
        );

        return {
            aiResponse,
            aiResponseUz,
            gptUsage,
        };
    }

    /**
     * GPT prompt'ni conversation context bilan yaxshilash
     */
    private enhancePromptWithConversationContext(
        userText: string,
        conversationTopic: { topic: string | null; keywords: string[] }
    ): string {
        if (!conversationTopic.topic) {
            return userText;
        }

        const topicContexts: { [key: string]: string } = {
            'profession': ' [CONTEXT: User is asking about professions/kasb, not objects/things]',
            'object': ' [CONTEXT: User is asking about objects/things/narsa, not professions]',
            'place': ' [CONTEXT: User is asking about location/place/joy]'
        };

        const contextHint = topicContexts[conversationTopic.topic] || '';
        if (conversationTopic.keywords.length > 0) {
            return `${userText}${contextHint} [Keywords from conversation: ${conversationTopic.keywords.slice(0, 3).join(', ')}]`;
        }

        return userText + contextHint;
    }
}
