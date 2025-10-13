import { BadRequestException } from "@nestjs/common";

/**
 * InvalidAudioException
 * -------------------------------------------------------
 * Maqsad: Audio fayl MIME/size/duration noto'g'ri bo'lsa tashlanadi.
 */
export class InvalidAudioException extends BadRequestException {
    constructor(message: string = "Audio fayl noto'g'ri") {
        super(message);
    }
}


