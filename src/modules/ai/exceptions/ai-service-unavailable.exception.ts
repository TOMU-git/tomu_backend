import { AIException } from './ai-exception.base';
import { AIErrorCode } from '../constants/error-codes.enum';

/**
 * AI servisi mavjud emas xatosi
 * 
 * Tashqi AI servislar (OpenAI) ishlamayotganda tashlanadi
 */
export class AIServiceUnavailableException extends AIException {
    constructor(details?: {
        service?: 'whisper' | 'gpt' | 'tts' | 'openai'; // Qaysi servis xatolik berdi
        originalError?: string; // Asl xato xabari
        statusCode?: number; // HTTP status kodi
    }) {
        super(AIErrorCode.AI_SERVICE_ERROR, details);
    }
}



