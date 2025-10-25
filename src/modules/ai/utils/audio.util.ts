import { AI_LIMITS } from "../constants/ai-constants";
import { InvalidAudioException } from "../exceptions/invalid-audio.exception";

/**
 * AudioUtils
 * -------------------------------------------------------
 * Maqsad: Audio MIME/size validatsiyasi.
 */
export class AudioUtils {
    static validateUpload(file?: Express.Multer.File) {
        if (!file) throw new InvalidAudioException("Audio fayl topilmadi");
        const allowed = [
            "audio/mpeg",
            "audio/mp3",
            "audio/wav",
            "audio/webm",
            "audio/ogg",
            "audio/x-wav",
        ];
        if (!allowed.includes(file.mimetype)) {
            throw new InvalidAudioException("Audio MIME turi qo'llab-quvvatlanmaydi");
        }
        const maxBytes = AI_LIMITS.MAX_AUDIO_MB * 1024 * 1024;
        if (file.size > maxBytes) {
            throw new InvalidAudioException("Audio hajmi juda katta");
        }
    }
}


