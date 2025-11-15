import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    Logger,
    HttpException,
    Inject,
} from '@nestjs/common';
import { Response } from 'express';
import { AIException } from '../exceptions/ai-exception.base';
import { AIErrorCode } from '../constants/error-codes.enum';
import { AI_ERROR_MESSAGES } from '../constants/error-messages.constant';
import { AIChatService } from '../services/ai-chat.service';
import { LimitExceededException } from '../exceptions/limit-exceeded.exception';

/**
 * AI moduli uchun global exception filter
 * 
 * Vazifalari:
 * - AI modulidagi barcha exceptionlarni tutish
 * - Standartlashtirilgan xato javobiga o'zgartirish
 * - Monitoring va debugging uchun xatolarni log qilish
 * - Noma'lum xatolarni mos xato kodlariga map qilish
 */
@Catch()
export class AIExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(AIExceptionFilter.name);

    constructor(
        @Inject(AIChatService)
        private readonly chatService: AIChatService,
    ) {}

    async catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest();

        // Xatolarni log qilish
        this.logError(exception, request);

        // AIException ni boshqarish (bizning domain exceptionlarimiz)
        if (exception instanceof AIException) {
            const exceptionResponse = exception.getResponse() as any;
            
            // LimitExceededException va /ai/chat/voice endpoint uchun message'larni qo'shish
            if (exception instanceof LimitExceededException && request.url?.includes('/ai/chat/voice')) {
                try {
                    const sessionId = request.body?.sessionId;
                    const userId = request.user?.id;
                    
                    if (sessionId && userId) {
                        const messages = await this.chatService.getMessages(sessionId, userId);
                        const limitedMessages = messages.slice(0, 25).map(m => ({
                            id: m.id,
                            sessionId: m.sessionId,
                            senderType: m.senderType,
                            originalText: m.originalText || undefined,
                            aiResponseText: m.aiResponseText || undefined,
                            aiResponseUzbek: m.aiResponseUzbek || undefined,
                            audioUrl: m.audioUrl || undefined,
                            isWithinLimit: m.isWithinLimit ?? true,
                            createdAt: m.createdAt,
                        }));
                        
                        return response.status(exception.getStatus()).json({
                            message: exceptionResponse.message,
                            statusCode: exceptionResponse.statusCode,
                            data: limitedMessages,
                        });
                    }
                } catch (error) {
                    // Message'larni olishda xatolik bo'lsa, oddiy response qaytarish
                    this.logger.warn(`Failed to get messages for error response: ${error.message}`);
                }
            }
            
            return response
                .status(exception.getStatus())
                .json(exceptionResponse);
        }

        // NestJS exceptionlarini boshqarish
        if (exception instanceof HttpException) {
            return this.handleHttpException(exception, response);
        }

        // Noma'lum xatolarni boshqarish (catch-all)
        return this.handleUnknownError(exception, response);
    }

    /**
     * HTTP exceptionlarni boshqarish (BadRequestException, ForbiddenException, va h.k.)
     */
    private handleHttpException(exception: HttpException, response: Response) {
        const status = exception.getStatus();
        const exceptionResponse = exception.getResponse() as any;
        const errorMessage = exceptionResponse?.message || 'Unknown error';

        // HTTP exceptionlarni status va xabar asosida AIErrorCode ga map qilish
        let errorCode = AIErrorCode.SERVER_ERROR;

        // Xabar tarkibini tekshirish (maxsus xatolarni aniqlash)
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

        // Status asosida map qilish (fallback)
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
            data: [],
        });
    }

    /**
     * Noma'lum xatolarni boshqarish (kutilmagan xatolar uchun fallback)
     */
    private handleUnknownError(exception: unknown, response: Response) {
        const error = exception as any;

        // Tarmoq xatolari (axios, node:http)
        const networkErrorCodes = ['ENOTFOUND', 'ETIMEDOUT', 'ECONNREFUSED', 'ECONNRESET', 'EHOSTUNREACH'];
        if (networkErrorCodes.includes(error.code)) {
            const errorConfig = AI_ERROR_MESSAGES[AIErrorCode.NETWORK_ERROR];
            return response.status(errorConfig.httpStatus).json({
                message: errorConfig.message,
                statusCode: errorConfig.httpStatus,
                data: [],
            });
        }

        // OpenAI API xatolari (axios response bilan)
        if (error.response?.status === 429) {
            const errorConfig = AI_ERROR_MESSAGES[AIErrorCode.RATE_LIMIT_EXCEEDED];
            return response.status(errorConfig.httpStatus).json({
                message: errorConfig.message,
                statusCode: errorConfig.httpStatus,
                data: [],
            });
        }

        // 5xx server xatolari
        if (error.response?.status >= 500 && error.response?.status < 600) {
            const errorConfig = AI_ERROR_MESSAGES[AIErrorCode.AI_SERVICE_ERROR];
            return response.status(errorConfig.httpStatus).json({
                message: errorConfig.message,
                statusCode: errorConfig.httpStatus,
                data: [],
            });
        }

        // Default: Server xatosi
        const errorConfig = AI_ERROR_MESSAGES[AIErrorCode.SERVER_ERROR];
        return response.status(errorConfig.httpStatus).json({
            message: errorConfig.message,
            statusCode: errorConfig.httpStatus,
            data: [],
        });
    }

    /**
     * Xatolarni log qilish (debugging va monitoring uchun)
     */
    private logError(exception: unknown, request: any) {
        const error = exception as any;

        // Log kontekstini yaratish
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

        // Xatolik darajasiga qarab log qilish
        if (exception instanceof AIException) {
            // Domain exceptionlar - warn level (kutilgan biznes xatolari)
            this.logger.warn(
                `AI Exception: ${error.errorCode} - ${error.message}`,
                JSON.stringify(logContext, null, 2)
            );
        } else if (error?.status >= 400 && error?.status < 500) {
            // Client xatolari - warn level
            this.logger.warn(
                `Client Error: ${error.status} - ${error.message}`,
                JSON.stringify(logContext, null, 2)
            );
        } else {
            // Server xatolari va noma'lum xatolar - error level (tekshirish kerak)
            this.logger.error(
                `Unhandled Exception: ${error?.message || 'Unknown error'}`,
                JSON.stringify({
                    ...logContext,
                    stack: error?.stack?.split('\n').slice(0, 5).join('\n'), // Stack trace ning birinchi 5 qatori
                }, null, 2)
            );
        }
    }
}



