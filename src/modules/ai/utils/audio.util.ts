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
     * Audio file duration'ni aniqlash (MP3 metadata orqali)
     * MP3 metadata'dan aniq duration'ni o'qish, xato bo'lsa approximate formula ishlatish
     * @param filePath - Audio file path
     * @param fileSize - File size (bytes) - fallback uchun
     * @returns Duration in seconds (aniq yoki approximate)
     */
    static async getAudioDuration(filePath: string, fileSize?: number): Promise<number> {
        try {
            const fs = require('fs').promises;

            // Faylni buffer sifatida o'qish
            const fileBuffer = await fs.readFile(filePath);

            // MP3 metadata'ni parse qilish
            const { parseBuffer } = require('music-metadata');
            const metadata = await parseBuffer(fileBuffer, { mimeType: 'audio/mpeg' });

            if (metadata.format.duration) {
                // Aniq duration (millisekund aniqlikda)
                const duration = Math.round(metadata.format.duration * 10) / 10; // 1 decimal
                console.log(`[AudioUtils] ✅ Accurate duration from metadata: ${duration}s`);
                return duration;
            }

            // Fallback: eski formula (agar metadata'da duration bo'lmasa)
            console.warn(`[AudioUtils] ⚠️  No duration in metadata, using approximate formula`);
            return this.getApproximateDuration(fileBuffer.length);

        } catch (error: any) {
            console.error(`[AudioUtils] ❌ Error reading audio metadata: ${error.message}`);

            // Fallback: eski formula
            if (fileSize) {
                return this.getApproximateDuration(fileSize);
            }

            // Agar file size ham bo'lmasa, fayldan o'qishga harakat qilish
            try {
                const fs = require('fs').promises;
                const stats = await fs.stat(filePath);
                return this.getApproximateDuration(stats.size);
            } catch (statError: any) {
                console.error(`[AudioUtils] ❌ Error getting file stats: ${statError.message}`);
                return 0; // Xato bo'lsa 0 qaytarish
            }
        }
    }

    /**
     * Approximate duration hisoblash (fallback)
     * File size va average bitrate'dan duration'ni hisoblash
     * @param fileSize - File size (bytes)
     * @returns Duration in seconds (approximate)
     */
    private static getApproximateDuration(fileSize: number): number {
        // MP3 uchun approximate formula:
        // Duration (seconds) = File Size (bytes) / (Bitrate (kbps) * 1000 / 8)
        // Average bitrate: 128 kbps (OpenAI TTS default)
        const averageBitrate = 128; // kbps
        const duration = fileSize / (averageBitrate * 1000 / 8);

        console.log(`[AudioUtils] 📊 Approximate duration (${fileSize} bytes): ${Math.round(duration * 10) / 10}s`);
        return Math.round(duration * 10) / 10; // 1 decimal place
    }
}


