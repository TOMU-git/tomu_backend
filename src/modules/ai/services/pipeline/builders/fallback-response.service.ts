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

export interface FallbackResponseResult {
    aiResponse: string;
    aiResponseUz: string;
    gptUsage: { promptTokens: number; completionTokens: number; totalTokens: number };
}

@Injectable()
export class FallbackResponseService {
    constructor(
        private readonly translation: TranslationService,
        private readonly translationLookup: TranslationLookupService,
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
     */
    createFutureLessonResponse(): FallbackResponseResult {
        return {
            aiResponse: AI_FALLBACK_MESSAGES.FUTURE_LESSON_RESPONSE.arabic,
            aiResponseUz: AI_FALLBACK_MESSAGES.FUTURE_LESSON_RESPONSE.uzbek,
            gptUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        };
    }

    /**
     * Not understood fallback
     */
    createNotUnderstoodResponse(): FallbackResponseResult {
        return {
            aiResponse: AI_FALLBACK_MESSAGES.NOT_UNDERSTOOD.arabic,
            aiResponseUz: AI_FALLBACK_MESSAGES.NOT_UNDERSTOOD.uzbek,
            gptUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        };
    }

    /**
     * No material response fallback
     */
    async createNoMaterialResponse(userText: string): Promise<FallbackResponseResult> {
        try {
            const userTextUz = await this.translation.translateToUzbek(userText);
            return {
                aiResponse: AI_FALLBACK_MESSAGES.NO_MATERIAL_RESPONSE.arabic,
                aiResponseUz: `${AI_FALLBACK_MESSAGES.NO_MATERIAL_RESPONSE.uzbek} (${userTextUz})`,
                gptUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
            };
        } catch (e) {
            return {
                aiResponse: AI_FALLBACK_MESSAGES.NO_MATERIAL_RESPONSE.arabic,
                aiResponseUz: AI_FALLBACK_MESSAGES.NO_MATERIAL_RESPONSE.uzbek,
                gptUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
            };
        }
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
        const enrichedSentence = quickEnrichMaterialResponse(matchedSentence);
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
        // ⚡ STEP 1: Material javobini diacritics bilan boyitish (fast!)
        const startTime = Date.now();
        const enrichedResponse = quickEnrichMaterialResponse(materialResponse);
        const enrichmentTime = Date.now() - startTime;
        
        console.log(`⚡ Material enrichment: ${enrichmentTime}ms (original: "${materialResponse.substring(0, 30)}..." → enriched: "${enrichedResponse.substring(0, 30)}...")`);

        // STEP 2: Translation lookup
        let aiResponseUz: string;
        if (translationUz) {
            aiResponseUz = translationUz;
        } else {
            try {
                const materialTranslationUz = this.translationLookup.findTranslationUzInMaterials(
                    materialResponse, // Use original for translation lookup
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
            aiResponse: enrichedResponse, // ✅ Return enriched version
            aiResponseUz,
            gptUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        };
    }

    /**
     * GPT response'ni translate qilish
     */
    async translateGPTResponse(
        gptResponse: string,
        context: any[],
        lastWatchedLessonOrder: number
    ): Promise<string> {
        if (!gptResponse || gptResponse.trim().length === 0) {
            return '';
        }

        const materialTranslationUz = this.translationLookup.findTranslationUzInMaterials(
            gptResponse,
            context,
            lastWatchedLessonOrder
        );

        if (materialTranslationUz) {
            return materialTranslationUz;
        }

        try {
            return await this.translation.translateToUzbek(gptResponse);
        } catch (e) {
            return '';
        }
    }
}

