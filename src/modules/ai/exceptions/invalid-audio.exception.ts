import { AIException } from './ai-exception.base';
import { AIErrorCode } from '../constants/error-codes.enum';

/**
 * Noto'g'ri audio fayl xatosi
 * 
 * Audio fayl noto'g'ri format, hajm yoki MIME type bo'lganda tashlanadi
 */
export class InvalidAudioException extends AIException {
    constructor(details?: {
        mimetype?: string; // Audio MIME type
        size?: number; // Fayl hajmi (bayt)
        maxSize?: number; // Maksimal ruxsat etilgan hajm
        reason?: 'invalid_mime' | 'too_large' | 'missing' | 'empty'; // Xato sababi
    }) {
        super(AIErrorCode.INVALID_AUDIO, details);
    }
}


