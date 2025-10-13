import { Injectable } from "@nestjs/common";

/**
 * TranslationService
 * -------------------------------------------------------
 * Maqsad: Tarjima va til aniqlash yordamchisi.
 */
@Injectable()
export class TranslationService {
    // TODO: haqiqiy tarjima provayderini ulash
    async translateToUzbek(text: string): Promise<string> {
        // Hozircha stub: matnni qaytaradi
        return text;
    }
}


