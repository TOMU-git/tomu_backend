import { HttpException } from '@nestjs/common';
import { AIErrorCode } from '../constants/error-codes.enum';
import { AI_ERROR_MESSAGES } from '../constants/error-messages.constant';

/**
 * Base class for all AI module exceptions
 * -------------------------------------------------------
 * Best Practice: Single inheritance hierarchy for domain exceptions
 * 
 * Benefits:
 * - Consistent error response structure
 * - Centralized error configuration
 * - Easy to catch and handle in filters
 * - Type-safe error codes
 */
export abstract class AIException extends HttpException {
    public readonly errorCode: AIErrorCode;
    public readonly retryable: boolean;
    public readonly action: string;
    public readonly timestamp: string;
    public readonly details?: any; // Technical details for logging

    constructor(
        errorCode: AIErrorCode,
        details?: any,
    ) {
        const errorConfig = AI_ERROR_MESSAGES[errorCode];

        super(
            {
                message: 'error',
                errorCode: errorConfig.code,
                data: {
                    message: errorConfig.message,
                    retryable: errorConfig.retryable,
                    action: errorConfig.action,
                },
            },
            errorConfig.httpStatus,
        );

        this.errorCode = errorCode;
        this.retryable = errorConfig.retryable;
        this.action = errorConfig.action;
        this.timestamp = new Date().toISOString();
        this.details = details;

        // For proper instanceof checks
        Object.setPrototypeOf(this, new.target.prototype);
    }

    /**
     * Get error response for API
     */
    getErrorResponse() {
        return this.getResponse();
    }

    /**
     * Get details for logging
     */
    getLogDetails() {
        return {
            errorCode: this.errorCode,
            timestamp: this.timestamp,
            retryable: this.retryable,
            action: this.action,
            details: this.details,
            httpStatus: this.getStatus(),
        };
    }
}



