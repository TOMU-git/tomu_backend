import { AIException } from './ai-exception.base';
import { AIErrorCode } from '../constants/error-codes.enum';

/**
 * RateLimitException
 * -------------------------------------------------------
 * Thrown when API rate limit is exceeded (429 Too Many Requests)
 */
export class RateLimitException extends AIException {
    constructor(details?: {
        service?: string;
        retryAfter?: number; // seconds
        limit?: number;
        remaining?: number;
    }) {
        super(AIErrorCode.RATE_LIMIT_EXCEEDED, details);
    }
}



