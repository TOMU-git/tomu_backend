import { AIException } from './ai-exception.base';
import { AIErrorCode } from '../constants/error-codes.enum';

/**
 * To'lov talab qilinadi xatosi
 * 
 * Foydalanuvchi kursni sotib olmaganida tashlanadi
 */
export class PaymentRequiredException extends AIException {
    constructor(details?: {
        courseId?: number; // Kurs ID
        userId?: number; // Foydalanuvchi ID
    }) {
        super(AIErrorCode.PAYMENT_REQUIRED, details);
    }
}



