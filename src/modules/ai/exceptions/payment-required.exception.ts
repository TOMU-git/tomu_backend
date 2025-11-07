import { AIException } from './ai-exception.base';
import { AIErrorCode } from '../constants/error-codes.enum';

/**
 * PaymentRequiredException
 * -------------------------------------------------------
 * Thrown when user has not purchased the course
 */
export class PaymentRequiredException extends AIException {
    constructor(details?: {
        courseId?: number;
        userId?: number;
    }) {
        super(AIErrorCode.PAYMENT_REQUIRED, details);
    }
}



