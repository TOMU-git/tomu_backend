import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GPTService, GPTResponse } from "../gpt.service";
import { TTSService } from "../tts.service";
import { PipelineStep, VoiceInput } from "./pipeline.types";
import { ArabicTextUtils } from "../../utils/arabic-text.util";
import { normalizeText, createWordSet, isYesNoResponse } from "../../utils/text-normalization.util";
import { SIMILARITY_THRESHOLDS } from "../../constants/gpt-step.constants";
import { findPrecomputedResponse } from "../../constants/precomputed-responses";
import { ConversationTopicExtractorService } from "./extractors/conversation-topic-extractor.service";
import { ConversationEntityExtractorService } from "./extractors/conversation-entity-extractor.service";
import { DialogueCorrectionService } from "./correctors/dialogue-correction.service";
import { ContextFilterService } from "./filters/context-filter.service";
import { MaterialMatchingService } from "./matchers/material-matching.service";
import { ResponseValidationService } from "./validators/response-validation.service";
import { FallbackResponseService } from "./builders/fallback-response.service";
import { HybridFollowUpService } from "./builders/hybrid-followup.service";
import { ResponseCacheService } from "../response-cache.service";
import { addPauseBetweenTexts, stripSSML } from "../../utils/ssml.util";

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
    private readonly enableUserEngagement: boolean; // User engagement flag'i

    constructor(
        private readonly configService: ConfigService,
        private readonly gpt: GPTService,
        private readonly tts: TTSService, // SSML qo'llab-quvvatlashni tekshirish uchun
        private readonly topicExtractor: ConversationTopicExtractorService,
        private readonly entityExtractor: ConversationEntityExtractorService,
        private readonly dialogueCorrection: DialogueCorrectionService,
        private readonly contextFilter: ContextFilterService,
        private readonly materialMatching: MaterialMatchingService,
        private readonly responseValidation: ResponseValidationService,
        private readonly fallbackResponse: FallbackResponseService,
        private readonly hybridFollowUp: HybridFollowUpService,
        private readonly responseCache: ResponseCacheService,
    ) {
        // Environment variable'dan erkin rejim flag'ini o'qish
        // Default: false (materiallarga asoslangan rejim)
        this.accessGeneral = this.configService.get<string>("ACCESS_GENERAL") === "true";
        // Environment variable'dan engagement flag'ini o'qish
        // Default: true (engagement yoqilgan)
        this.enableUserEngagement = this.configService.get<string>("ENABLE_USER_ENGAGEMENT", "true") === "true";
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

        // ⚡ OPTIMIZATION: Cache tekshiruvi - 5s → 5ms
        const courseId = input.courseId ? Number(input.courseId) : undefined;
        const cached = await this.responseCache.get(userText, courseId, lastWatchedLessonOrder);
        if (cached) {
            console.log(`⚡ Cache HIT: Response topildi (5s → 5ms, source: ${cached.source})`);
            return {
                ...input,
                aiResponse: cached.aiResponse,
                aiResponseUz: cached.aiResponseUz,
                usage: input.usage || {},
            } as VoiceInput & { aiResponse: string; aiResponseUz: string };
        }

        // Erkin rejim tekshiruvi
        // Agar ACCESS_GENERAL=true bo'lsa, material matching'ni o'tkazib yuboramiz
        if (this.accessGeneral) {
            // Erkin rejim: to'g'ridan-to'g'ri GPT'ga so'rov yuborish
            // Materiallarni yubormaymiz, lekin conversation history yuboramiz (GPT uchun context)
            const response = await this.generateGPTResponse(
                userText,
                normalizedUser,
                userWords,
                [], // Bo'sh context - materiallarga etibor berilmaydi
                lastWatchedLessonOrder,
                { topic: null, keywords: [] }, // Conversation topic'ni ham o'tkazib yuboramiz
                input.conversationHistory || [], // ✅ Conversation history yuboriladi
                true // freeMode = true
            );

            console.log(`💬 Erkin rejim: ${(input.conversationHistory || []).length} ta xabar history'dan foydalanildi`);

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
        // ⚡ OPTIMIZATION 1: Precomputed responses - eng ko'p ishlatiladigan phraselar
        // 5s GPT call → 5ms memory lookup
        const precomputed = findPrecomputedResponse(userText, lastWatchedLessonOrder);
        if (precomputed) {
            console.log(`⚡ Precomputed response topildi (5s → 5ms)`);

            // Cache'ga saqlash (keyingi safar uchun)
            await this.responseCache.set(
                userText,
                {
                    aiResponse: precomputed.aiResponseText,
                    aiResponseUz: precomputed.aiResponseUzbek,
                    source: 'precomputed',
                },
                courseId,
                lastWatchedLessonOrder
            );

            return {
                ...input,
                aiResponse: precomputed.aiResponseText,
                aiResponseUz: precomputed.aiResponseUzbek,
                usage: input.usage || {},
            } as VoiceInput & { aiResponse: string; aiResponseUz: string };
        }

        // Ha/yo'q javoblarini tekshirish - agar ha/yo'q javob bo'lsa, material matchingdan o'tkazib yuboramiz
        const isYesNo = isYesNoResponse(userText);
        if (isYesNo) {
            console.log(`✅ Ha/yo'q javob aniqlandi, material matchingdan o'tkazib yuborilmoqda...`);
            // Ha/yo'q javoblar uchun to'g'ridan-to'g'ri GPT'ga so'rov yuborish
            const response = await this.generateGPTResponse(
                userText,
                normalizedUser,
                userWords,
                input.context,
                lastWatchedLessonOrder,
                conversationTopic,
                input.conversationHistory || [],
                false // freeMode = false (material context bilan)
            );

            const aiResponseLatin = ArabicTextUtils.transliterateArabic(response.aiResponse || "");
            console.log('GPT javobi (Ha/yo\'q javob):', response.aiResponse);
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
                audioUrl: response.audioUrl, // ✅ Tayyor audio (agar mavjud bo'lsa)
                usage,
            } as VoiceInput & { aiResponse: string; aiResponseUz: string; audioUrl?: string | null };
        }

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

        // ⚡ Cache'ga saqlash (keyingi safar uchun)
        await this.responseCache.set(
            userText,
            {
                aiResponse: response.aiResponse,
                aiResponseUz: response.aiResponseUz || '',
                gptUsage: response.gptUsage,
                source: response.gptUsage ? 'gpt' : 'material',
            },
            courseId,
            lastWatchedLessonOrder
        );

        return {
            ...input,
            aiResponse: response.aiResponse,
            aiResponseUz: response.aiResponseUz || '',
            audioUrl: response.audioUrl, // ✅ Tayyor audio (agar mavjud bo'lsa)
            usage,
        } as VoiceInput & { aiResponse: string; aiResponseUz: string; audioUrl?: string | null };
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
    ): Promise<{ aiResponse: string; aiResponseUz: string; gptUsage?: GPTResponse['usage']; audioUrl?: string | null }> {
        // 1) Materialdan topilgan javob
        if (materialMatch.nextSentence) {
            if (materialMatch.nextSentence === 'DIALOGUE_END') {
                const fallback = this.fallbackResponse.createDialogueEndResponse();
                return {
                    aiResponse: fallback.aiResponse,
                    aiResponseUz: fallback.aiResponseUz,
                    audioUrl: fallback.audioUrl, // ✅ Tayyor audio
                    gptUsage: fallback.gptUsage,
                };
            }

            if (materialMatch.lessonOrder !== null && materialMatch.lessonOrder > lastWatchedLessonOrder) {
                const fallback = this.fallbackResponse.createFutureLessonResponse();
                return {
                    aiResponse: fallback.aiResponse,
                    aiResponseUz: fallback.aiResponseUz,
                    audioUrl: fallback.audioUrl, // ✅ Tayyor audio
                    gptUsage: fallback.gptUsage,
                };
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

                // Agar "question_to_question" sabab bo'lsa, GPT'dan javob so'rash
                if (validation.reason === 'question_to_question') {
                    console.log('🔄 Material javob savolga savol bilan javob berdi, GPT\'dan javob so\'ralmoqda...');
                    // GPT'dan javob so'rash (material matching o'tkazib yuboriladi)
                    return await this.generateGPTResponse(
                        userText,
                        normalizedUser,
                        userWords,
                        context,
                        lastWatchedLessonOrder,
                        conversationTopic,
                        conversationHistory,
                        false // freeMode = false (material context bilan)
                    );
                }

                // Boshqa sabablar uchun "materialda yo'q" deb javob berish
                // (user grammatik to'g'ri gapirgan bo'lishi mumkin)
                const fallback = await this.fallbackResponse.createNoMaterialResponse(userText);
                return {
                    aiResponse: fallback.aiResponse,
                    aiResponseUz: fallback.aiResponseUz,
                    audioUrl: fallback.audioUrl, // ✅ Tayyor audio
                    gptUsage: fallback.gptUsage,
                };
            }

            // Valid material response
            const materialResponseResult = await this.fallbackResponse.createMaterialResponse(
                materialMatch.nextSentence,
                materialMatch.translationUz,
                context,
                lastWatchedLessonOrder
            );

            // Material javobga follow-up savol qo'shish (faqat engagement yoqilgan bo'lsa)
            // Hybrid yondashuv: birinchi materialdan, topilmasa AI o'zi (qat'iy qoidalar bilan)
            if (this.enableUserEngagement) {
                try {
                    // ⚠️ RULE: Agar material response o'zi savol bo'lsa, follow-up qo'shmaslik
                    // Sabab: Bitta response'da 2 ta savol bo'lmasligi kerak
                    const { isQuestion } = await import('../../utils/question-detector.util');
                    const materialIsQuestion = isQuestion(materialResponseResult.aiResponse);

                    if (materialIsQuestion) {
                        console.log('ℹ️  Material javob o\'zi savol, follow-up qo\'shilmaydi (1 response = 1 savol)');
                    } else {
                        console.log('🔄 Material javobga follow-up savol qo\'shilmoqda (Hybrid)...');

                        // Material match ma'lumotlarini o'tkazish (sequential follow-up uchun)
                        const followUpResult = await this.hybridFollowUp.generateFollowUp(
                            materialResponseResult.aiResponse,
                            conversationHistory,
                            context,
                            lastWatchedLessonOrder,
                            {
                                nextNextSentence: materialMatch.nextNextSentence || null,
                                nextNextTranslationUz: materialMatch.nextNextTranslationUz || null,
                                lessonOrder: materialMatch.lessonOrder,
                            }
                        );

                        // Agar follow-up topilsa
                        if (followUpResult && followUpResult.question) {
                            console.log(`✅ Follow-up savol qo'shildi (${followUpResult.method}, confidence: ${followUpResult.confidence})`);

                            // ⏸️  SSML BREAK: Javob va savol orasiga pauza qo'shish
                            // Faqat Google TTS uchun SSML formatida, OpenAI uchun oddiy text
                            const useSSML = this.tts.supportsSSML();
                            const pauseDuration = '1.5s'; // 1.5 soniya pauza

                            // Follow-up savol ekanligini tekshirish (savol ohangi uchun)
                            const { isQuestion } = await import('../../utils/question-detector.util');
                            const isFollowUpQuestion = isQuestion(followUpResult.question);

                            const enrichedResponse = addPauseBetweenTexts(
                                materialResponseResult.aiResponse,
                                followUpResult.question,
                                pauseDuration,
                                useSSML,
                                isFollowUpQuestion
                            );

                            // Translation uchun SSML kerak emas
                            const enrichedTranslation = `${materialResponseResult.aiResponseUz} ${followUpResult.questionUz}`;

                            // Log: SSML ishlatilganligini ko'rsatish
                            if (useSSML) {
                                console.log(`⏸️  SSML break qo'shildi: ${pauseDuration} pauza`);
                                if (isFollowUpQuestion) {
                                    console.log(`🎵 Savol ohangi qo'shildi (question intonation)`);
                                }
                                // Database saqlash uchun SSML'siz versiya (ai-chat-message-factory.service.ts da olib tashlanadi)
                                console.log(`📝 Clean text (DB): ${stripSSML(enrichedResponse)}`);
                            }

                            // ✅ SSML bilan qaytarish - TTS uchun kerak (pauza ishlashi uchun)
                            // SSML teglar bazaga saqlashda ai-chat-message-factory.service.ts da olib tashlanadi
                            return {
                                aiResponse: enrichedResponse,
                                aiResponseUz: enrichedTranslation,
                                gptUsage: materialResponseResult.gptUsage,
                            };
                        } else {
                            console.log('ℹ️  Follow-up topilmadi - asl material javob qaytariladi');
                        }
                    }
                } catch (error) {
                    console.error(`⚠️  Follow-up savol qo'shishda xato: ${error.message}`);
                }
            }

            // Agar xato bo'lsa yoki GPT javob bermasa, asl material javobni qaytarish
            return materialResponseResult;
        }

        // 2) Yaqin match (50%+)
        if (materialMatch.bestMatchScore >= SIMILARITY_THRESHOLDS.SENTENCE_SIMILARITY_HIGH &&
            materialMatch.bestMatchNextSentence &&
            materialMatch.bestMatchNextSentence.length > 1) {

            if (materialMatch.bestMatchLessonOrder !== null && materialMatch.bestMatchLessonOrder > lastWatchedLessonOrder) {
                const fallback = this.fallbackResponse.createFutureLessonResponse();
                return {
                    aiResponse: fallback.aiResponse,
                    aiResponseUz: fallback.aiResponseUz,
                    audioUrl: fallback.audioUrl, // ✅ Tayyor audio
                    gptUsage: fallback.gptUsage,
                };
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
                const fallback = this.fallbackResponse.createFutureLessonResponse();
                return {
                    aiResponse: fallback.aiResponse,
                    aiResponseUz: fallback.aiResponseUz,
                    audioUrl: fallback.audioUrl, // ✅ Tayyor audio
                    gptUsage: fallback.gptUsage,
                };
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
    ): Promise<{ aiResponse: string; aiResponseUz: string; gptUsage?: GPTResponse['usage']; audioUrl?: string | null }> {
        // Entity extraction - suhbatdan obyektlar va mavzularni ajratish
        const conversationContext = this.entityExtractor.extractEntities(conversationHistory);
        const conversationEntitiesStr = this.entityExtractor.formatEntitiesForGPT(conversationContext, this.enableUserEngagement);

        // Debug log
        if (conversationEntitiesStr && conversationEntitiesStr.length > 0) {
            console.log(`🔍 Conversation entities topildi:\n${conversationEntitiesStr}`);
        }

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
            conversationEntities: conversationEntitiesStr, // Entity tracking uchun
        });

        const aiResponse = gptResult.text;
        const gptUsage = gptResult.usage;

        // GPT javobini validatsiya qilish
        // Erkin rejimda material-based validation'ni o'tkazib yuboramiz
        const validation = freeMode
            ? { isValid: true } // Erkin rejimda validation'ni o'tkazib yuboramiz
            : this.responseValidation.validateGPTResponse(
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

            // Agar "question_to_question" sabab bo'lsa, retry yoki fallback
            if (validation.reason === 'question_to_question') {
                console.log('🔄 GPT javob savolga savol bilan javob berdi, fallback javob qaytarilmoqda...');
                // Fallback javob - "materialda yo'q" deb javob berish
                // (user grammatik to'g'ri gapirgan bo'lishi mumkin)
                const fallback = await this.fallbackResponse.createNoMaterialResponse(userText);
                return {
                    aiResponse: fallback.aiResponse,
                    aiResponseUz: fallback.aiResponseUz,
                    audioUrl: fallback.audioUrl, // ✅ Tayyor audio
                    gptUsage: fallback.gptUsage,
                };
            }

            // Boshqa sabablar uchun "materialda yo'q" deb javob berish
            // (user grammatik to'g'ri gapirgan bo'lishi mumkin)
            const fallback = await this.fallbackResponse.createNoMaterialResponse(userText);
            return {
                aiResponse: fallback.aiResponse,
                aiResponseUz: fallback.aiResponseUz,
                audioUrl: fallback.audioUrl, // ✅ Tayyor audio
                gptUsage: fallback.gptUsage,
            };
        }

        // Valid GPT response
        // Erkin rejimda context'ni o'tkazib yuboramiz
        const aiResponseUz = await this.fallbackResponse.translateGPTResponse(
            aiResponse,
            freeMode ? [] : context,
            freeMode ? 0 : lastWatchedLessonOrder
        );

        return {
            aiResponse,
            aiResponseUz,
            gptUsage,
            audioUrl: undefined, // GPT response - tayyor audio yo'q, TTS ishlatiladi
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
