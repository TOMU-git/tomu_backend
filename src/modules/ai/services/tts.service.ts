import { Injectable } from "@nestjs/common";

/**
 * TTSService
 * -------------------------------------------------------
 * Maqsad: Matndan audio yaratish (adapter).
 */
@Injectable()
export class TTSService {
    // TODO: haqiqiy TTS provayderini ulash

    async textToSpeech(params: { text: string; language: string; }): Promise<string> {
        // Hozircha stub URL qaytaramiz
        return "/audio/placeholder.mp3";
    }
}

