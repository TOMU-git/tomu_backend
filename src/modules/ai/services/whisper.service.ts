import { Injectable } from "@nestjs/common";

/**
 * WhisperService
 * -------------------------------------------------------
 * Maqsad: Audio -> Text konvertatsiya (STT).
 */
@Injectable()
export class WhisperService {
    // TODO: haqiqiy Whisper/STT provayderini ulash
    async speechToText(params: { audio: Buffer }): Promise<string> {
        // Hozircha stub
        return "salom, qanday yordam beray?";
    }
}

