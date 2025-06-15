import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import { ResData } from "./resData";
import { TransactionErrorException } from "src/modules/transactions/exception/transactionException";
import { Response } from "express";
import { PaymeDataEnum } from "src/common/enums/enum";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

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

    // ✅ NestJS HttpException (shu jumladan UnauthorizedException)
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === "object" && res !== null) {
        message = (res as any).message || exception.message;
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
