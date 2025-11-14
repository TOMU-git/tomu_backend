/**
 * Response Validation Service
 * -------------------------------------------------------
 * Maqsad: GPT va material javoblarini validatsiya qilish
 */

import { Injectable } from '@nestjs/common';
import { normalizeText, createWordSet } from '../../../utils/text-normalization.util';
import { SIMILARITY_THRESHOLDS } from '../../../constants/gpt-step.constants';
import { ArabicTextUtils } from '../../../utils/arabic-text.util';
import { AI_FALLBACK_MESSAGES } from '../../../constants/error-messages';
import { ConversationTopicExtractorService, ConversationTopic } from '../extractors/conversation-topic-extractor.service';

@Injectable()
export class ResponseValidationService {
    constructor() {}

    /**
     * Material javobini validatsiya qilish
     * Soddalashtirilgan - faqat echo detection
     */
    validateMaterialResponse(
        response: string,
        userText: string,
        normalizedUser: string,
        userWords: Set<string>
    ): { isValid: boolean; reason?: string } {
        // Faqat echo detection - eng muhim validatsiya
        const isEcho = this.detectEcho(response, userText, normalizedUser, userWords);
        if (isEcho) {
            return { isValid: false, reason: 'echo' };
        }

        return { isValid: true };
    }

    /**
     * GPT javobini validatsiya qilish
     * Soddalashtirilgan - faqat eng muhim validatsiyalar
     */
    validateGPTResponse(
        response: string,
        userText: string,
        normalizedUser: string,
        userWords: Set<string>,
        context: any[],
        lastWatchedLessonOrder: number,
        conversationTopic: ConversationTopic
    ): { isValid: boolean; reason?: string } {
        // 1. Too short check
        if (!response || response.trim().length < 5) {
            return { isValid: false, reason: 'too_short' };
        }

        // 2. Unsure check
        const unsure = response.includes('لَسْتُ مُتَأَكِّدًا') ||
            response.toLowerCase().includes('not sure') ||
            response.toLowerCase().includes('لا أعرف');

        if (unsure) {
            return { isValid: false, reason: 'unsure' };
        }

        // 3. Echo detection - eng muhim
        const isEcho = this.detectEcho(response, userText, normalizedUser, userWords);
        if (isEcho) {
            return { isValid: false, reason: 'echo' };
        }

        // Qolgan validatsiyalar o'chirilgan - juda murakkab edi
        return { isValid: true };
    }

    /**
     * Echo detection
     */
    private detectEcho(response: string, originalUserText: string, normalizedUser: string, userWords: Set<string>): boolean {
        if (!response || !originalUserText) return false;

        const stripDiacritics = (t: string) => t.replace(/[\u064B-\u065F\u0670\u0640]/g, '').replace(/[،,]/g, '').trim();
        const normalize = (t: string) => ArabicTextUtils.normalizeArabic(stripDiacritics(t));
        const normalizedResponse = normalize(response);
        const normalizedUserCleaned = normalize(originalUserText);

        // 1. To'liq takrorlash
        if (normalizedResponse === normalizedUserCleaned) {
            return true;
        }

        // 2. Yuqori o'xshashlik
        const responseWords = new Set(normalizedResponse.split(/\s+/).filter(Boolean));
        if (responseWords.size > 0 && userWords.size > 0) {
            let commonWords = 0;
            for (const word of userWords) {
                if (responseWords.has(word)) commonWords++;
            }
            const similarity = commonWords / userWords.size;
            if (similarity > SIMILARITY_THRESHOLDS.ECHO_SIMILARITY && responseWords.size <= userWords.size * SIMILARITY_THRESHOLDS.ECHO_LENGTH_RATIO) {
                const helpPattern = normalize(AI_FALLBACK_MESSAGES.CLOSE_MATCH_HELP?.arabic || '');
                const helpPatterns = [
                    normalize('هل تقصد'),
                    normalize('هَلْ تَقْصِدُ'),
                    normalize('أتقصد'),
                    normalize('shunday'),
                ];
                const hasHelpPattern = helpPatterns.some(pattern =>
                    normalizedResponse.includes(pattern) && pattern.length > 0
                );
                if (!hasHelpPattern && helpPattern.length === 0) {
                    return true;
                }
            }
        }

        // 3. User gapini to'liq o'z ichiga olish
        const userTextLower = normalizedUserCleaned.toLowerCase();
        const responseLower = normalizedResponse.toLowerCase();

        if (userTextLower.length > 5 && responseLower.includes(userTextLower)) {
            const helpPatterns = [
                normalize('هل تقصد'),
                normalize('هَلْ تَقْصِدُ'),
                normalize('أتقصد'),
                normalize('shunday'),
            ];
            const hasHelpPattern = helpPatterns.some(pattern =>
                normalizedResponse.includes(pattern) && pattern.length > 0
            );
            const lengthRatio = responseLower.length / userTextLower.length;
            if (!hasHelpPattern && lengthRatio <= SIMILARITY_THRESHOLDS.ECHO_LENGTH_RATIO_STRICT) {
                return true;
            }
        }

        // 4. So'zlarni qayta tartib bilan qo'yish
        const responseWordArray = Array.from(responseWords);
        const userWordArray = Array.from(userWords);

        if (userWordArray.length > 0 && responseWordArray.length > 0) {
            const allResponseWordsInUser = responseWordArray.every(word => userWords.has(word));
            const allUserWordsInResponse = userWordArray.every(word => responseWords.has(word));

            if (allResponseWordsInUser && allUserWordsInResponse && responseWords.size === userWords.size) {
                const lengthDiff = Math.abs(normalizedResponse.length - normalizedUserCleaned.length);
                if (lengthDiff < 10) {
                    return true;
                }
            }
        }

        return false;
    }

}

