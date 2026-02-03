import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { HttpAdapterHost, ModuleRef } from "@nestjs/core";
import { ResData } from "./resData";
import { TransactionErrorException } from "src/modules/transactions/exception/transactionException";
import { Response, Request } from "express";
import { PaymeDataEnum } from "src/common/enums/enum";
import { LimitExceededException } from "src/modules/ai/exceptions/limit-exceeded.exception";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly moduleRef?: ModuleRef,
  ) { }

  async catch(exception: unknown, host: ArgumentsHost): Promise<void> {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { user?: { id: number }; body?: any }>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Internal server error";
    let error: Error | null = null;

    // ✅ TransactionErrorException (Payme uchun maxsus)
    if (exception instanceof TransactionErrorException) {
      response.status(HttpStatus.OK).json({
        error: {
          code: exception.transactionErrorCode,
          message: exception.transactionErrorMessage,
          data: exception.transactionData as PaymeDataEnum,
        },
        id: exception.transactionId,
      });
      return; // ✅ bu yerda faqat return; qilish mumkin, lekin qiymat qaytarmaymiz
    }

    // ✅ AIException - AI module exception'larini o'z formatida qaytarish
    // AIException'ni property'lar orqali aniqlash (circular dependency oldini olish uchun)
    const exceptionAny = exception as any;
    if (
      exception instanceof HttpException &&
      exceptionAny.errorCode &&
      typeof exceptionAny.getResponse === 'function'
    ) {
      const exceptionResponse = exceptionAny.getResponse();
      // AIException response'ida errorCode bo'lishi kerak
      if (exceptionResponse && exceptionResponse.statusCode && exceptionResponse.message) {
        // LimitExceededException va /ai/chat/voice endpoint uchun message'larni qo'shish
        if (exception instanceof LimitExceededException && request.url?.includes('/ai/chat/voice') && this.moduleRef) {
          try {
            let chatService: any;
            try {
              chatService = this.moduleRef.get('AIChatService', { strict: false });
            } catch {
              // Agar token orqali topilmasa, class orqali urinib ko'rish
              const { AIChatService } = await import('src/modules/ai/services/ai-chat.service');
              chatService = this.moduleRef.get(AIChatService, { strict: false });
            }
            
            const sessionId = request.body?.sessionId;
            const userId = request.user?.id;
            
            if (chatService && sessionId && userId) {
              const messages = await chatService.getMessages(sessionId, userId);
              const limitedMessages = messages.slice(0, 25).map((m: any) => ({
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
              
              response.status(exceptionResponse.statusCode).json({
                message: exceptionResponse.message,
                statusCode: exceptionResponse.statusCode,
                data: limitedMessages,
              });
              return;
            }
          } catch (error: any) {
            // Message'larni olishda xatolik bo'lsa, oddiy response qaytarish
            console.warn(`Failed to get messages for error response: ${error?.message || 'Unknown error'}`);
          }
        }
        
        // Bu AIException - o'z formatida qaytarish (faqat message, statusCode, data: [])
        response.status(exceptionResponse.statusCode).json({
          message: exceptionResponse.message,
          statusCode: exceptionResponse.statusCode,
          data: [],
        });
        return;
      }
    }

    // ✅ NestJS HttpException (shu jumladan UnauthorizedException)
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === "object" && res !== null) {
        const resAny = res as any;
        message = resAny.message || exception.message;
        // Agar response'da data va statusCode bo'lsa, to'g'ridan-to'g'ri qaytarish (LimitExceededException uchun)
        if (resAny.statusCode && resAny.data !== undefined) {
          response.status(status).json({
            message: resAny.message,
            statusCode: resAny.statusCode,
            data: resAny.data,
          });
          return;
        }
      } else {
        message = res as string;
      }
      error = exception;
    }
    // ✅ JWT xatolari: token yaroqsiz yoki muddati tugagan
    else if (
      exception instanceof Error &&
      (
        exception.name === "TokenExpiredError" ||
        exception.name === "JsonWebTokenError" ||
        exception.name === "NotBeforeError"
      )
    ) {
      status = HttpStatus.UNAUTHORIZED;
      message = exception.message;
      error = exception;
    }
    // 🔁 Boshqa barcha xatolar (default 500)
    else if (exception instanceof Error) {
      message = exception.message;
      error = exception;
    }

    const responseBody = new ResData(
      message,
      status,
      null,
      error,
    );

    httpAdapter.reply(response, responseBody, status);
  }
}
