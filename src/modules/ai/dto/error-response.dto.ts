import { ApiProperty } from '@nestjs/swagger';
import { AIErrorCode } from '../constants/error-codes.enum';

/**
 * AI Error Response DTO
 * -------------------------------------------------------
 * Standardized error response structure for AI module
 */
export class AIErrorResponseDto {
    @ApiProperty({
        example: 'Oylik limitingiz tugagan.',
        description: 'User-friendly error message in Uzbek'
    })
    message: string;

    @ApiProperty({
        example: 402,
        description: 'HTTP status code'
    })
    statusCode: number;

    @ApiProperty({
        type: 'object',
        properties: {
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
        retryable: boolean;
        action: string;
    };
}



