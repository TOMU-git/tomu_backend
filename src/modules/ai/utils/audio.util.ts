import { AI_LIMITS } from "../constants/ai-constants";
import { InvalidAudioException } from "../exceptions";

/**
 * AudioUtils
 * -------------------------------------------------------
 * Maqsad: Audio MIME/size validatsiyasi.
 */
export class AudioUtils {
    static validateUpload(file?: Express.Multer.File) {
        if (!file) {
            throw new InvalidAudioException({
                reason: 'missing'
            });
        }

        const allowed = [
            "audio/mpeg",
            "audio/mp3",
            "audio/wav",
            "audio/webm",
            "audio/ogg",
            "audio/x-wav",
        ];

        if (!allowed.includes(file.mimetype)) {
            throw new InvalidAudioException({
                mimetype: file.mimetype,
                reason: 'invalid_mime'
            });
        }

        const maxBytes = AI_LIMITS.MAX_AUDIO_MB * 1024 * 1024;
        if (file.size > maxBytes) {
            throw new InvalidAudioException({
                size: file.size,
                maxSize: maxBytes,
                reason: 'too_large'
            });
        }
    }
}


