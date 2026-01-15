/**
 * Fallback Response Service
 * -------------------------------------------------------
 * Maqsad: Turli fallback holatlar uchun javob yaratish
 */

import { Injectable } from '@nestjs/common';
import { AI_FALLBACK_MESSAGES } from '../../../constants/error-messages';
import { SIMILARITY_THRESHOLDS } from '../../../constants/gpt-step.constants';
import { TranslationService } from '../../translation.service';
import { TranslationLookupService } from '../extractors/translation-lookup.service';
import { quickEnrichMaterialResponse } from '../../../utils/diacritics-enrichment.util';
import { GPTService } from '../../gpt.service';
import { getFallbackAudioUrl } from '../../../utils/fallback-audio.util';

export interface FallbackResponseResult {
    aiResponse: string;
    aiResponseUz: string;
    gptUsage: { promptTokens: number; completionTokens: number; totalTokens: number };
    audioUrl?: string | null; // ✅ Tayyor audio URL (ixtiyoriy)
}

@Injectable()
export class FallbackResponseService {
    constructor(
        private readonly translation: TranslationService,
        private readonly translationLookup: TranslationLookupService,
        private readonly gpt: GPTService,
    ) { }

    /**
     * Dialogue end fallback
     */
    createDialogueEndResponse(): FallbackResponseResult {
        return {
            aiResponse: AI_FALLBACK_MESSAGES.DIALOGUE_END_CONFIRMATION.arabic,
            aiResponseUz: AI_FALLBACK_MESSAGES.DIALOGUE_END_CONFIRMATION.uzbek,
            gptUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        };
    }

    /**
     * Future lesson fallback
     * ✅ TAYYOR AUDIO bilan (agar mavjud bo'lsa)
     */
    createFutureLessonResponse(): FallbackResponseResult {
        const audioUrl = getFallbackAudioUrl('FUTURE_LESSON_RESPONSE');
        return {
            aiResponse: AI_FALLBACK_MESSAGES.FUTURE_LESSON_RESPONSE.arabic,
            aiResponseUz: AI_FALLBACK_MESSAGES.FUTURE_LESSON_RESPONSE.uzbek,
            gptUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
            audioUrl, // ✅ Tayyor audio (null bo'lishi mumkin)
        };
    }

    /**
     * Not understood fallback
     * ✅ TAYYOR AUDIO bilan
     */
    createNotUnderstoodResponse(): FallbackResponseResult {
        const audioUrl = getFallbackAudioUrl('NOT_UNDERSTOOD');
        return {
            aiResponse: AI_FALLBACK_MESSAGES.NOT_UNDERSTOOD.arabic,
            aiResponseUz: AI_FALLBACK_MESSAGES.NOT_UNDERSTOOD.uzbek,
            gptUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
            audioUrl, // ✅ Tayyor audio
        };
    }

    /**
     * No material response fallback
     * ✅ TAYYOR AUDIO bilan
     * ⚠️  User text tarjimasi OLIB TASHLANDI - faqat standart xabar
     */
    async createNoMaterialResponse(userText: string): Promise<FallbackResponseResult> {
        const audioUrl = getFallbackAudioUrl('NO_MATERIAL_RESPONSE');
        // ❌ User text tarjimasini qo'shmaslik - random harflar bo'lishi mumkin
        return {
            aiResponse: AI_FALLBACK_MESSAGES.NO_MATERIAL_RESPONSE.arabic,
            aiResponseUz: AI_FALLBACK_MESSAGES.NO_MATERIAL_RESPONSE.uzbek, // Faqat standart xabar
            gptUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
            audioUrl, // ✅ Tayyor audio
        };
    }

    /**
     * Close match help response
     * ✅ OPTIMIZED: Diacritics enrichment qo'shildi
     */
    async createCloseMatchHelpResponse(
        matchedSentence: string,
        translationUz: string | null,
        context: any[],
        lastWatchedLessonOrder: number
    ): Promise<FallbackResponseResult> {
        // Enrich matched sentence with diacritics
        // DISABLED: Diacritics enrichment is disabled - using original text
        // const enrichedSentence = quickEnrichMaterialResponse(matchedSentence);
        const enrichedSentence = matchedSentence; // Using original without enrichment
        const helpResponse = AI_FALLBACK_MESSAGES.CLOSE_MATCH_HELP.arabic + enrichedSentence;

        let aiResponseUz: string;
        if (translationUz) {
            aiResponseUz = AI_FALLBACK_MESSAGES.CLOSE_MATCH_HELP.uzbek + translationUz;
        } else {
            try {
                const materialTranslationUz = this.translationLookup.findTranslationUzInMaterials(
                    matchedSentence,
                    context,
                    lastWatchedLessonOrder
                );
                if (materialTranslationUz) {
                    aiResponseUz = AI_FALLBACK_MESSAGES.CLOSE_MATCH_HELP.uzbek + materialTranslationUz;
                } else {
                    const translatedSentence = await this.translation.translateToUzbek(matchedSentence);
                    aiResponseUz = AI_FALLBACK_MESSAGES.CLOSE_MATCH_HELP.uzbek + translatedSentence;
                }
            } catch (e) {
                aiResponseUz = AI_FALLBACK_MESSAGES.CLOSE_MATCH_HELP.uzbek + matchedSentence;
            }
        }

        return {
            aiResponse: helpResponse,
            aiResponseUz,
            gptUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        };
    }

    /**
     * Material response (to'g'ridan-to'g'ri materialdan)
     * ✅ OPTIMIZED: Diacritics enrichment qo'shildi (GPT'siz, 10-50ms ichida)
     */
    async createMaterialResponse(
        materialResponse: string,
        translationUz: string | null,
        context: any[],
        lastWatchedLessonOrder: number
    ): Promise<FallbackResponseResult> {
        // ⚡ OPTIMIZATION: Parallel processing - translation lookup va enrichment
        // Bu operatsiyalar bir-biriga bog'liq emas, shuning uchun parallel qilamiz
        const enrichedResponse = materialResponse; // Using original without enrichment

        // STEP 2: Translation lookup (parallel with other operations if needed)
        let aiResponseUz: string;
        if (translationUz) {
            aiResponseUz = translationUz;
        } else {
            try {
                // Material'dan translation qidirish va agar topilmasa translate qilish
                // Bu ketma-ket bo'lishi kerak, chunki birinchi material'dan qidirish kerak
                const materialTranslationUz = this.translationLookup.findTranslationUzInMaterials(
                    materialResponse,
                    context,
                    lastWatchedLessonOrder
                );
                if (materialTranslationUz) {
                    aiResponseUz = materialTranslationUz;
                } else {
                    aiResponseUz = await this.translation.translateToUzbek(materialResponse);
                }
            } catch (e) {
                aiResponseUz = '';
            }
        }

        return {
            aiResponse: enrichedResponse,
            aiResponseUz,
            gptUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        };
    }

    /**
     * GPT response'ni translate qilish
     * ✅ TO'G'IRLANGAN: Tarjima xatosi holatida retry va warning
     */
    async translateGPTResponse(
        gptResponse: string,
        context: any[],
        lastWatchedLessonOrder: number
    ): Promise<string> {
        if (!gptResponse || gptResponse.trim().length === 0) {
            console.warn('⚠️  [Translation] Bo\'sh GPT response, tarjima qilinmaydi');
            return '';
        }

        // STEP 1: Material'dan tarjima qidirish (tez va aniq)
        const materialTranslationUz = this.translationLookup.findTranslationUzInMaterials(
            gptResponse,
            context,
            lastWatchedLessonOrder
        );

        if (materialTranslationUz) {
            console.log('✅ [Translation] Material\'dan topildi');
            return materialTranslationUz;
        }

        // STEP 2: Translation service orqali tarjima qilish (fallback)
        try {
            const translated = await this.translation.translateToUzbek(gptResponse);
            if (translated && translated.trim().length > 0) {
                console.log('✅ [Translation] Translation service orqali tarjima qilindi');
                return translated;
            } else {
                console.warn('⚠️  [Translation] Translation service bo\'sh string qaytardi');
                return '';
            }
        } catch (e) {
            console.error(`❌ [Translation] Tarjima xatosi: ${e.message}`);
            // Xato holatida ham bo'sh string qaytarish (lekin warning log qilinadi)
            return '';
        }
    }

    /**
     * Material javobga qo'shimcha follow-up savol qo'shish (GPT orqali)
     * Bu metod material javobni GPT'ga yuboradi va u qo'shimcha savol qo'shadi
     */
    async addFollowUpQuestion(
        materialResponse: string,
        context: any[],
        lastWatchedLessonOrder: number,
        conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
    ): Promise<string> {
        try {
            // Conversation history'ga material javobni qo'shamiz
            const updatedHistory = [
                ...conversationHistory,
                { role: 'assistant' as const, content: materialResponse }
            ];

            // GPT'ga so'rov: follow-up savol berish
            const prompt = 'Ask a follow-up question to continue the conversation naturally (just the question, nothing else)';

            const gptResult = await this.gpt.generateWithUsage({
                prompt: prompt,
                context: context,
                language: 'ar',
                strict: false,
                conversationHistory: updatedHistory,
                freeMode: false,
            });

            const followUpQuestion = gptResult.text?.trim() || '';

            // Agar GPT savol bergan bo'lsa, material javob + savol qaytarish
            if (followUpQuestion && followUpQuestion.length > 0) {
                return `${materialResponse} ${followUpQuestion}`;
            }

            // Agar GPT javob bermasa, asl material javobni qaytarish
            return materialResponse;
        } catch (error) {
            console.error(`[FallbackResponse] Error adding follow-up question: ${error.message}`);
            // Xato bo'lsa, asl material javobni qaytarish
            return materialResponse;
        }
    }
}

