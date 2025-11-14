/**
 * Name Validation Service
 * -------------------------------------------------------
 * Maqsad: User va response ismlarining mosligini tekshirish
 */

import { Injectable } from '@nestjs/common';
import { normalizeText } from '../../../utils/text-normalization.util';
import { NAME_VALIDATION } from '../../../constants/gpt-step.constants';

@Injectable()
export class NameValidationService {
    /**
     * Ism mosligini tekshirish
     * Agar user so'rovida ism bor va javobda ham ism bor bo'lsa, ular mos kelishi kerak
     */
    validateNameConsistency(userText: string, response: string): boolean {
        if (!userText || !response) return true; // Ma'lumot yetarli bo'lmasa, pass

        const normalizedUser = normalizeText(userText);
        const normalizedResponse = normalizeText(response);

        // User so'rovidagi ismni topish
        const userNameMatch = normalizedUser.match(NAME_VALIDATION.NAME_PATTERN);
        if (!userNameMatch) return true; // User so'rovida ism yo'q - pass

        const userNameInQuery = userNameMatch[1];

        // Javobdagi ismlarni topish
        const responseNameMatches = normalizedResponse.match(NAME_VALIDATION.NAME_PATTERN);
        if (!responseNameMatches || responseNameMatches.length === 0) {
            // Javobda ism yo'q - bu mantiqiy bo'lishi mumkin
            return true;
        }

        // Javobdagi har bir ismni tekshirish
        for (const nameMatch of responseNameMatches) {
            const responseNameMatch = nameMatch.match(NAME_VALIDATION.NAME_PATTERN);
            if (!responseNameMatch) continue;

            const responseName = responseNameMatch[1];

            // Agar javobdagi ism user so'rovidagi ism bilan mos kelmasa
            if (responseName !== userNameInQuery) {
                // Ba'zi umumiy ismlar mantiqiy bo'lishi mumkin (dialogue'da turli ismlar)
                // Lekin aniq mos kelmasa, rad qilamiz
                return false;
            }
        }

        return true; // Ismlar mos keladi yoki javobda ism yo'q
    }

    /**
     * Matndan ismni extract qilish
     */
    extractName(text: string): string | null {
        if (!text) return null;
        const normalized = normalizeText(text);
        const match = normalized.match(NAME_VALIDATION.NAME_PATTERN);
        return match ? match[1] : null;
    }
}

