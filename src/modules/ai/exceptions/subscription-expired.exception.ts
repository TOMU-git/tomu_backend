import { AIException } from './ai-exception.base';
import { AIErrorCode } from '../constants/error-codes.enum';

/**
 * SubscriptionExpiredException
 * -------------------------------------------------------
 * Thrown when user's subscription has expired
 */
export class SubscriptionExpiredException extends AIException {
    constructor(details?: {
        courseId?: number;
        userId?: number;
        expiredAt?: Date;
    }) {
        super(AIErrorCode.SUBSCRIPTION_EXPIRED, details);
    }
}



