import { ApiProperty } from '@nestjs/swagger';
import { AIErrorCode } from '../constants/error-codes.enum';

/**
 * AI Error Response DTO
 * -------------------------------------------------------
 * Standardized error response structure for AI module
 */
export class AIErrorResponseDto {
    @ApiProperty({
        example: 'error',
        description: 'Response status indicator'
    })
    message: 'error';

    @ApiProperty({
        enum: AIErrorCode,
        example: AIErrorCode.LIMIT_EXCEEDED,
        description: 'Unique error code for programmatic handling'
    })
    errorCode: AIErrorCode;

    @ApiProperty({
        type: 'object',
        properties: {
            message: {
                type: 'string',
                example: 'Oylik limitingiz tugagan ($2). Yangi oyni kuting yoki qayta to\'lov qiling.',
                description: 'User-friendly error message in Uzbek'
            },
            retryable: {
                type: 'boolean',
                example: false,
                description: 'Whether the request can be retried'
            },
            action: {
                type: 'string',
                example: 'wait_or_pay',
                description: 'Suggested action for the user'
            },
        },
    })
    data: {
        message: string;
        retryable: boolean;
        action: string;
    };
}



