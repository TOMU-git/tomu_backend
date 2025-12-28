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

    /**
     * Audio file duration'ni aniqlash (approximate)
     * File size va bitrate'dan duration'ni hisoblash
     * @param filePath - Audio file path
     * @param fileSize - File size (bytes)
     * @returns Duration in seconds (approximate)
     */
    static async getAudioDuration(filePath: string, fileSize?: number): Promise<number> {
        try {
            const fs = require('fs').promises;

            // File size'ni olish (agar berilmagan bo'lsa)
            if (!fileSize) {
                const stats = await fs.stat(filePath);
                fileSize = stats.size;
            }

            // MP3 uchun approximate formula:
            // Duration (seconds) = File Size (bytes) / (Bitrate (kbps) * 1000 / 8)
            // Average bitrate: 128 kbps (OpenAI TTS default)
            const averageBitrate = 128; // kbps
            const duration = fileSize / (averageBitrate * 1000 / 8);

            return Math.round(duration * 10) / 10; // 1 decimal place
        } catch (error: any) {
            console.error(`[AudioUtils] Error getting audio duration: ${error.message}`);
            return 0; // Xato bo'lsa 0 qaytarish
        }
    }
}


