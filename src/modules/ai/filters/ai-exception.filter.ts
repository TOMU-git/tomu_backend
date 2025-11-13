import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    Logger,
    HttpException,
} from '@nestjs/common';
import { Response } from 'express';
import { AIException } from '../exceptions/ai-exception.base';
import { AIErrorCode } from '../constants/error-codes.enum';
import { AI_ERROR_MESSAGES } from '../constants/error-messages.constant';

/**
 * Global Exception Filter for AI Module
 * -------------------------------------------------------
 * Best Practice: Centralized error handling and logging
 * 
 * Responsibilities:
 * - Catch all exceptions in AI module
 * - Transform to standardized error response
 * - Log errors for monitoring and debugging
 * - Map unknown errors to appropriate error codes
 */
@Catch()
export class AIExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(AIExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest();

        // Log error for debugging and monitoring
        this.logError(exception, request);

        // Handle AIException (our domain exceptions)
        if (exception instanceof AIException) {
            return response
                .status(exception.getStatus())
                .json(exception.getResponse());
        }

        // Handle known NestJS exceptions
        if (exception instanceof HttpException) {
            return this.handleHttpException(exception, response);
        }

        // Handle unknown errors (catch-all)
        return this.handleUnknownError(exception, response);
    }

    /**
     * Handle HTTP exceptions (BadRequestException, ForbiddenException, etc.)
     */
    private handleHttpException(exception: HttpException, response: Response) {
        const status = exception.getStatus();
        const exceptionResponse = exception.getResponse() as any;
        const errorMessage = exceptionResponse?.message || 'Unknown error';

        // Map common HTTP exceptions to AIErrorCode based on status and message
        let errorCode = AIErrorCode.SERVER_ERROR;

        // Check message content for specific errors
        if (typeof errorMessage === 'string') {
            if (errorMessage.includes('sotib olinmagan') || errorMessage.includes('purchase')) {
                errorCode = AIErrorCode.PAYMENT_REQUIRED;
            } else if (errorMessage.includes('muddati tugagan') || errorMessage.includes('expired')) {
                errorCode = AIErrorCode.SUBSCRIPTION_EXPIRED;
            } else if (errorMessage.includes('sessiya') || errorMessage.includes('session')) {
                errorCode = AIErrorCode.INVALID_SESSION;
            } else if (errorMessage.includes('audio') || errorMessage.includes('Audio')) {
                errorCode = AIErrorCode.INVALID_AUDIO;
            }
        }

        // Fallback to status-based mapping
        if (errorCode === AIErrorCode.SERVER_ERROR) {
            if (status === 400) errorCode = AIErrorCode.INVALID_AUDIO;
            else if (status === 402) errorCode = AIErrorCode.PAYMENT_REQUIRED;
            else if (status === 403) errorCode = AIErrorCode.INVALID_SESSION;
            else if (status === 429) errorCode = AIErrorCode.RATE_LIMIT_EXCEEDED;
            else if (status === 503) errorCode = AIErrorCode.AI_SERVICE_ERROR;
        }

        const errorConfig = AI_ERROR_MESSAGES[errorCode];

        return response.status(status).json({
            message: errorConfig.message,
            statusCode: errorConfig.httpStatus,
            data: null,
        });
    }

    /**
     * Handle unknown errors (fallback for unexpected errors)
     */
    private handleUnknownError(exception: unknown, response: Response) {
        const error = exception as any;

        // Network errors (axios, node:http)
        const networkErrorCodes = ['ENOTFOUND', 'ETIMEDOUT', 'ECONNREFUSED', 'ECONNRESET', 'EHOSTUNREACH'];
        if (networkErrorCodes.includes(error.code)) {
            const errorConfig = AI_ERROR_MESSAGES[AIErrorCode.NETWORK_ERROR];
            return response.status(errorConfig.httpStatus).json({
                message: errorConfig.message,
                statusCode: errorConfig.httpStatus,
                data: null,
            });
        }

        // OpenAI API errors (axios response with OpenAI error)
        if (error.response?.status === 429) {
            const errorConfig = AI_ERROR_MESSAGES[AIErrorCode.RATE_LIMIT_EXCEEDED];
            return response.status(errorConfig.httpStatus).json({
                message: errorConfig.message,
                statusCode: errorConfig.httpStatus,
                data: null,
            });
        }

        if (error.response?.status >= 500 && error.response?.status < 600) {
            const errorConfig = AI_ERROR_MESSAGES[AIErrorCode.AI_SERVICE_ERROR];
            return response.status(errorConfig.httpStatus).json({
                message: errorConfig.message,
                statusCode: errorConfig.httpStatus,
                data: null,
            });
        }

        // Default: Server error
        const errorConfig = AI_ERROR_MESSAGES[AIErrorCode.SERVER_ERROR];
        return response.status(errorConfig.httpStatus).json({
            message: errorConfig.message,
            statusCode: errorConfig.httpStatus,
            data: null,
        });
    }

    /**
     * Log error for debugging and monitoring
     */
    private logError(exception: unknown, request: any) {
        const error = exception as any;

        // Build log context
        const logContext = {
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
            userId: request.user?.id,
            sessionId: request.body?.sessionId || request.query?.sessionId,
            errorType: exception?.constructor?.name,
            message: error?.message,
            errorCode: error?.errorCode,
            httpStatus: error?.status || error?.response?.status,
        };

        // Log based on severity
        if (exception instanceof AIException) {
            // Domain exceptions - warn level (expected business errors)
            this.logger.warn(
                `AI Exception: ${error.errorCode} - ${error.message}`,
                JSON.stringify(logContext, null, 2)
            );
        } else if (error?.status >= 400 && error?.status < 500) {
            // Client errors - warn level
            this.logger.warn(
                `Client Error: ${error.status} - ${error.message}`,
                JSON.stringify(logContext, null, 2)
            );
        } else {
            // Server errors and unknown errors - error level (needs investigation)
            this.logger.error(
                `Unhandled Exception: ${error?.message || 'Unknown error'}`,
                JSON.stringify({
                    ...logContext,
                    stack: error?.stack?.split('\n').slice(0, 5).join('\n'), // First 5 lines of stack
                }, null, 2)
            );
        }
    }
}



