/**
 * Phonetic STT Correction Service
 * -------------------------------------------------------
 * Maqsad: Phonetic STT xatolarini tuzatish (faqat bitta harf farqi va xavfsiz holatlarda)
 */

import { Injectable } from '@nestjs/common';
import { normalizeText } from '../../../utils/text-normalization.util';
import { PHONETIC_CORRECTION } from '../../../constants/gpt-step.constants';

@Injectable()
export class PhoneticCorrectionService {
    /**
     * Keng tarqalgan Arabic STT xatolari - phonetic o'xshashliklar
     */
    private readonly STT_PHONETIC_ERRORS: ReadonlyMap<string, readonly string[]> = new Map([
        ['ح', ['ه']],      // ح → ه
        ['ه', ['ح']],      // ه → ح (reverse)
        ['ذ', ['ظ', 'ز']], // ذ → ظ, ز
        ['ظ', ['ذ', 'ز']], // ظ → ذ, ز (reverse)
        ['ز', ['ذ', 'ظ']], // ز → ذ, ظ (reverse)
        ['ق', ['ك']],      // ق → ك
        ['ك', ['ق']],      // ك → ق (reverse)
        ['ص', ['س']],      // ص → س
        ['س', ['ص']],      // س → ص (reverse)
        ['ض', ['د']],      // ض → د
        ['د', ['ض']],      // د → ض (reverse)
        ['ط', ['ت']],      // ط → ت
        ['ت', ['ط']],      // ت → ط (reverse)
    ]);

    /**
     * Phonetic STT error correction
     * Faqat bestMatch materialdan topilgan bo'lsa ishlatiladi (xavfsizlik uchun)
     * Faqat bitta harf farqi bo'lsa va phonetic map'da bor bo'lsa
     */
    applyPhoneticSTTCorrection(userText: string, bestMatch: string): string | null {
        if (!userText || !bestMatch) {
            return null;
        }

        const normalizedUser = normalizeText(userText);
        const normalizedMatch = normalizeText(bestMatch);

        // Agar to'liq mos kelmasa, word-by-word correction qilamiz
        if (normalizedUser === normalizedMatch) {
            return bestMatch; // Allaqachon mos
        }

        const userWords = normalizedUser.split(/\s+/).filter(Boolean);
        const matchWords = normalizedMatch.split(/\s+/).filter(Boolean);

        // So'zlar soni farq qilsa, phonetic correction qilmaymiz (xavfsizlik)
        if (userWords.length !== matchWords.length) {
            return null;
        }

        // Har bir so'zni phonetic correction bilan solishtirish
        let phoneticErrorsFound = 0;
        let totalWordDifferences = 0;

        for (let i = 0; i < userWords.length; i++) {
            const userWord = userWords[i];
            const matchWord = matchWords[i];

            if (!userWord || !matchWord) {
                continue;
            }

            // Exact match
            if (userWord === matchWord) {
                continue;
            }

            totalWordDifferences++;

            // Phonetic correction tekshiruvi - faqat bitta harf farqi bo'lsa
            const isPhoneticError = this.isPhoneticSTTError(userWord, matchWord);
            if (isPhoneticError) {
                phoneticErrorsFound++;
            }
        }

        // Agar barcha so'z farqlari phonetic error bo'lsa va kamida 1 ta phonetic error topilgan bo'lsa
        if (
            totalWordDifferences > 0 &&
            phoneticErrorsFound === totalWordDifferences &&
            (phoneticErrorsFound >= PHONETIC_CORRECTION.MIN_WORDS_FOR_CORRECTION ||
                (phoneticErrorsFound === 1 && userWords.length <= 3))
        ) {
            return bestMatch;
        }

        return null; // Phonetic correction tasdiqlanmadi
    }

    /**
     * So'zlar o'rtasidagi farq phonetic STT error ekanligini tekshiradi
     * Faqat bitta harf farqi bo'lsa va phonetic map'da bor bo'lsa
     */
    private isPhoneticSTTError(userWord: string, correctWord: string): boolean {
        if (userWord.length !== correctWord.length) {
            return false; // Uzunlik farq qilsa, phonetic error emas
        }

        // Bitta harf farqini topish
        let diffCount = 0;
        let diffIndex = -1;

        for (let i = 0; i < userWord.length; i++) {
            if (userWord[i] !== correctWord[i]) {
                diffCount++;
                if (diffCount > 1) {
                    return false; // 1+ harf farqi - phonetic error emas
                }
                diffIndex = i;
            }
        }

        if (diffCount !== 1 || diffIndex === -1) {
            return false; // Faqat bitta harf farqi bo'lishi kerak
        }

        const wrongChar = userWord[diffIndex];
        const correctChar = correctWord[diffIndex];

        // Phonetic map'da borligini tekshirish (forward direction)
        const phoneticAlternatives = this.STT_PHONETIC_ERRORS.get(wrongChar);
        if (phoneticAlternatives && phoneticAlternatives.includes(correctChar)) {
            return true; // Phonetic error topildi
        }

        // Reverse tekshiruv (correctChar → wrongChar direction)
        const reverseAlternatives = this.STT_PHONETIC_ERRORS.get(correctChar);
        if (reverseAlternatives && reverseAlternatives.includes(wrongChar)) {
            return true; // Phonetic error topildi (reverse)
        }

        return false; // Phonetic error emas
    }
}

