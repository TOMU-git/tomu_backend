import { AIException } from './ai-exception.base';
import { AIErrorCode } from '../constants/error-codes.enum';

/**
 * AudioNotRecognizedException
 * -------------------------------------------------------
 * Thrown when Whisper fails to transcribe audio or returns empty text
 */
export class AudioNotRecognizedException extends AIException {
    constructor(details?: {
        transcription?: string;
        duration?: number;
        audioSize?: number;
    }) {
        super(AIErrorCode.AUDIO_NOT_RECOGNIZED, details);
    }
}



