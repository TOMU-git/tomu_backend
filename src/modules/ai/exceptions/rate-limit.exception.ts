import { AIException } from './ai-exception.base';
import { AIErrorCode } from '../constants/error-codes.enum';

/**
 * Rate limit oshib ketdi xatosi
 * 
 * API so'rovlar tezligi limiti oshib ketganda tashlanadi (429 Too Many Requests)
 */
export class RateLimitException extends AIException {
    constructor(details?: {
        service?: string; // Qaysi servis
        retryAfter?: number; // Qayta urinishdan oldin kutish vaqti (soniya)
        limit?: number; // Limit miqdori
        remaining?: number; // Qolgan so'rovlar soni
    }) {
        super(AIErrorCode.RATE_LIMIT_EXCEEDED, details);
    }
}



