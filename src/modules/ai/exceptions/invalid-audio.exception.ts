import { AIException } from './ai-exception.base';
import { AIErrorCode } from '../constants/error-codes.enum';

/**
 * InvalidAudioException
 * -------------------------------------------------------
 * Thrown when audio file is invalid (MIME, size, format)
 */
export class InvalidAudioException extends AIException {
    constructor(details?: {
        mimetype?: string;
        size?: number;
        maxSize?: number;
        reason?: 'invalid_mime' | 'too_large' | 'missing' | 'empty';
    }) {
        super(AIErrorCode.INVALID_AUDIO, details);
    }
}


