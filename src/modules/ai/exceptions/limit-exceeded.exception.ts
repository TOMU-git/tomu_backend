import { AIException } from './ai-exception.base';
import { AIErrorCode } from '../constants/error-codes.enum';

/**
 * Limit oshib ketdi xatosi
 * 
 * Oylik AI ishlatish limiti oshib ketganda tashlanadi
 */
export class LimitExceededException extends AIException {
    constructor(details?: {
        currentCost?: number; // Joriy xarajat
        limit?: number; // Limit miqdori
        remaining?: number; // Qolgan miqdor
        courseId?: number | null; // Kurs ID
        month?: string; // Oy (format: YYYY-MM)
    }) {
        super(AIErrorCode.LIMIT_EXCEEDED, details);
    }
}


