import { AIException } from './ai-exception.base';
import { AIErrorCode } from '../constants/error-codes.enum';

/**
 * InvalidSessionException
 * -------------------------------------------------------
 * Thrown when session is not found or user does not have access
 * Replaces: SessionForbiddenException
 */
export class InvalidSessionException extends AIException {
    constructor(details?: {
        sessionId?: number;
        userId?: number;
        reason?: 'not_found' | 'forbidden' | 'invalid';
    }) {
        super(AIErrorCode.INVALID_SESSION, details);
    }
}



