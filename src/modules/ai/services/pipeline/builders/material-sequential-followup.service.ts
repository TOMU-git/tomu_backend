import { Injectable } from "@nestjs/common";
import { isQuestion } from "../../../utils/question-detector.util";
import { FollowUpQuestion } from "./material-followup.service";

/**
 * Material Sequential Follow-up Service
 * 
 * Material'dan ketma-ketlikni tekshirish va savol topish.
 * Agar material javobdan keyin ketma-ket savol bo'lsa, uni birinchi ustuvorlik bilan qaytarish.
 * 
 * Maqsad: Material dialogue ketma-ketligini saqlash
 * Misol: "Ma haza?" → "Haza burtukol" → "Hal huva laziz?" (ketma-ketlik)
 */
@Injectable()
export class MaterialSequentialFollowUpService {
    /**
     * Material'dan ketma-ketlikni tekshirish
     * Agar material javobdan keyin ketma-ket savol bo'lsa, uni qaytarish
     * 
     * @param materialMatch - Material match natijasi
     * @returns Follow-up savol yoki null
     */
    findSequentialFollowUp(materialMatch: {
        nextSentence: string;
        nextNextSentence: string | null;
        nextNextTranslationUz: string | null;
        lessonOrder: number | null;
    }): FollowUpQuestion | null {
        // Agar keyingi gap mavjud bo'lsa va u savol bo'lsa
        if (
            materialMatch.nextNextSentence &&
            isQuestion(materialMatch.nextNextSentence)
        ) {
            console.log(
                `[MaterialSequential] Ketma-ket savol topildi: "${materialMatch.nextNextSentence.substring(0, 50)}"`,
            );
            return {
                question: materialMatch.nextNextSentence,
                questionUz: materialMatch.nextNextTranslationUz || undefined,
                source: "material",
                confidence: 0.95, // Eng yuqori confidence (birinchi ustuvorlik)
            };
        }

        return null;
    }
}

