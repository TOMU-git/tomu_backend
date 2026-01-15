import { FALLBACK_AUDIO_PATHS } from '../constants/error-messages';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Fallback Audio Utility
 * Tayyor audio file'larni olish va validation qilish
 */

export function getFallbackAudioUrl(fallbackType: string): string | null {
    const audioPath = FALLBACK_AUDIO_PATHS[fallbackType];

    if (!audioPath) {
        return null;
    }

    try {
        // Path: /public/audio/... → public/audio/...
        const relativePath = audioPath.startsWith('/') ? audioPath.substring(1) : audioPath;
        const fullPath = path.resolve(process.cwd(), relativePath);

        if (fs.existsSync(fullPath)) {
            console.log(`[FallbackAudio] ✅ File found: ${fullPath}`);
            return audioPath; // Public URL qaytarish
        } else {
            console.warn(`[FallbackAudio] ❌ File not found: ${fullPath}`);
            return null;
        }
    } catch (error) {
        console.error(`[FallbackAudio] Error: ${error.message}`);
        return null;
    }
}