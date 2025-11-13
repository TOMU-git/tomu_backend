import { AIException } from './ai-exception.base';
import { AIErrorCode } from '../constants/error-codes.enum';

/**
 * Obuna muddati tugagan xatosi
 * 
 * Foydalanuvchi obunasining muddati tugaganda tashlanadi
 */
export class SubscriptionExpiredException extends AIException {
    constructor(details?: {
        courseId?: number; // Kurs ID
        userId?: number; // Foydalanuvchi ID
        expiredAt?: Date; // Obuna tugagan sana
    }) {
        super(AIErrorCode.SUBSCRIPTION_EXPIRED, details);
    }
}



