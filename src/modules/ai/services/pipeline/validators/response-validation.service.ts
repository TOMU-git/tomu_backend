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
import { isQuestion } from '../../../utils/question-detector.util';

@Injectable()
export class ResponseValidationService {
    constructor() { }

    /**
     * Material javobini validatsiya qilish
     * Echo detection o'chirilgan - material javoblar to'g'ridan-to'g'ri qabul qilinadi
     */
    validateMaterialResponse(
        response: string,
        userText: string,
        normalizedUser: string,
        userWords: Set<string>
    ): { isValid: boolean; reason?: string } {
        // Savolga savol bilan javob bermaslik qoidasi
        const userIsQuestion = isQuestion(userText);
        const responseIsQuestion = isQuestion(response);
        
        if (userIsQuestion && responseIsQuestion) {
            console.log('⚠️  Material javob: User savol berdi, lekin javob ham savol - rad etildi');
            return { isValid: false, reason: 'question_to_question' };
        }
        
        // Echo detection o'chirilgan - material javoblar har doim valid
        // Material javoblar materiallardan kelgani uchun, ular har doim to'g'ri
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

        // 3. Savolga savol bilan javob bermaslik qoidasi
        const userIsQuestion = isQuestion(userText);
        const responseIsQuestion = isQuestion(response);
        
        if (userIsQuestion && responseIsQuestion) {
            console.log('⚠️  GPT javob: User savol berdi, lekin javob ham savol - rad etildi');
            return { isValid: false, reason: 'question_to_question' };
        }

        // 4. Echo detection - eng muhim
        const isEcho = this.detectEcho(response, userText, normalizedUser, userWords);
        if (isEcho) {
            return { isValid: false, reason: 'echo' };
        }

        // Qolgan validatsiyalar o'chirilgan - juda murakkab edi
        return { isValid: true };
    }

    /**
     * Echo detection
     * Yaxshilangan: Material javoblarini noto'g'ri echo deb topmasligi uchun
     */
    private detectEcho(response: string, originalUserText: string, normalizedUser: string, userWords: Set<string>): boolean {
        if (!response || !originalUserText) return false;

        const stripDiacritics = (t: string) => t.replace(/[\u064B-\u065F\u0670\u0640]/g, '').replace(/[،,]/g, '').trim();
        const normalize = (t: string) => ArabicTextUtils.normalizeArabic(stripDiacritics(t));
        const normalizedResponse = normalize(response);
        const normalizedUserCleaned = normalize(originalUserText);

        // Response uzunligi user gapidan ancha katta bo'lsa, echo emas (material javob bo'lishi mumkin)
        const lengthRatio = normalizedResponse.length / (normalizedUserCleaned.length || 1);
        if (lengthRatio > 1.5) {
            // Response user gapidan 1.5x katta bo'lsa, echo emas
            return false;
        }

        // 1. To'liq takrorlash
        if (normalizedResponse === normalizedUserCleaned) {
            return true;
        }

        // 2. Response'da qo'shimcha ma'lumot borligini tekshirish
        // Material javoblarida odatda qo'shimcha ma'lumot bo'ladi
        const responseWords = new Set(normalizedResponse.split(/\s+/).filter(Boolean));
        const userWordArray = Array.from(userWords);

        // Response'da user gapida bo'lmagan so'zlar borligini tekshirish
        const newWordsInResponse = Array.from(responseWords).filter(word => !userWords.has(word));
        const hasNewContent = newWordsInResponse.length > 0 && newWordsInResponse.some(w => w.length > 2);

        // MUHIM: Agar response'da user gapida bo'lmagan mazmunli so'zlar bo'lsa, echo emas
        // Masalan: User "مَا هَذَا يَا فَرِيد؟" deb so'rasa, javob "هَذَا بُرْتُقَالٌ" bo'lishi mumkin
        // "بُرْتُقَالٌ" - bu user gapida yo'q, demak echo emas
        if (hasNewContent) {
            return false; // Qo'shimcha ma'lumot bor, echo emas
        }

        // 3. User gapidagi barcha so'zlar response'da bo'lsa va response'da qo'shimcha so'zlar yo'q bo'lsa
        // Bu echo bo'lishi mumkin
        const allUserWordsInResponse = userWordArray.every(word => responseWords.has(word));
        const responseHasOnlyUserWords = Array.from(responseWords).every(word => userWords.has(word));

        if (allUserWordsInResponse && responseHasOnlyUserWords) {
            // User gapidagi barcha so'zlar response'da va response'da faqat user gapidagi so'zlar bor
            // Lekin uzunlik farqi katta bo'lsa, echo emas (masalan, so'zlar qayta tartibda)
            const lengthDiff = Math.abs(normalizedResponse.length - normalizedUserCleaned.length);
            if (lengthDiff < 5 && responseWords.size <= userWords.size) {
                return true; // Echo
            }
        }

        // 4. Yuqori o'xshashlik (lekin qo'shimcha ma'lumot yo'q bo'lsa)
        if (responseWords.size > 0 && userWords.size > 0) {
            let commonWords = 0;
            for (const word of userWords) {
                if (responseWords.has(word)) commonWords++;
            }
            const similarity = commonWords / userWords.size;

            // Echo bo'lishi uchun: yuqori o'xshashlik VA response'da faqat user gapidagi so'zlar VA uzunlik farqi kichik
            if (similarity > SIMILARITY_THRESHOLDS.ECHO_SIMILARITY &&
                responseHasOnlyUserWords &&
                responseWords.size <= userWords.size * SIMILARITY_THRESHOLDS.ECHO_LENGTH_RATIO) {
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

        // 5. User gapini to'liq o'z ichiga olish (lekin qo'shimcha ma'lumot yo'q bo'lsa)
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
            // Agar qo'shimcha ma'lumot bo'lsa yoki uzunlik farqi katta bo'lsa, echo emas
            if (!hasHelpPattern && !hasNewContent && lengthRatio <= SIMILARITY_THRESHOLDS.ECHO_LENGTH_RATIO_STRICT) {
                return true;
            }
        }

        // 6. So'zlarni qayta tartib bilan qo'yish (faqat uzunlik farqi kichik bo'lsa)
        const responseWordArray = Array.from(responseWords);

        if (userWordArray.length > 0 && responseWordArray.length > 0) {
            const allResponseWordsInUser = responseWordArray.every(word => userWords.has(word));
            const allUserWordsInResponse = userWordArray.every(word => responseWords.has(word));

            // Barcha so'zlar mos va uzunlik farqi kichik bo'lsa, echo
            if (allResponseWordsInUser && allUserWordsInResponse &&
                responseWords.size === userWords.size) {
                const lengthDiff = Math.abs(normalizedResponse.length - normalizedUserCleaned.length);
                if (lengthDiff < 10) {
                    return true;
                }
            }
        }

        return false;
    }

}

