import { AIException } from './ai-exception.base';
import { AIErrorCode } from '../constants/error-codes.enum';

/**
 * AIServiceUnavailableException
 * -------------------------------------------------------
 * Thrown when external AI services (OpenAI) are unavailable
 */
export class AIServiceUnavailableException extends AIException {
    constructor(details?: {
        service?: 'whisper' | 'gpt' | 'tts' | 'openai';
        originalError?: string;
        statusCode?: number;
    }) {
        super(AIErrorCode.AI_SERVICE_ERROR, details);
    }
}



