import { AIException } from './ai-exception.base';
import { AIErrorCode } from '../constants/error-codes.enum';

/**
 * Audio tani olindi xatosi
 * 
 * Whisper audio ni matnga aylantira olmagan yoki bo'sh matn qaytarganda tashlanadi
 */
export class AudioNotRecognizedException extends AIException {
    constructor(details?: {
        transcription?: string; // Transkripsiya natijasi (bo'sh bo'lishi mumkin)
        duration?: number; // Audio davomiyligi (soniya)
        audioSize?: number; // Audio fayl hajmi (bayt)
    }) {
        super(AIErrorCode.AUDIO_NOT_RECOGNIZED, details);
    }
}



