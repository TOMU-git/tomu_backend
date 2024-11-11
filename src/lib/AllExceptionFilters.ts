import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Res,
} from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import { ResData } from "./resData";
import { TransactionErrorException } from "src/modules/transactions/exception/transactionException";
import { Response } from "express";
import { PaymeDataEnum } from "src/common/enums/enum";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  res: Response;
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: any, host: ArgumentsHost): void | Response {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const response1 = ctx.getResponse<Response>();

    const responseBody = new ResData(
      "",
      HttpStatus.INTERNAL_SERVER_ERROR,
      null,
      exception,
    );
    if (exception instanceof HttpException) {
      if (exception instanceof TransactionErrorException) {
        return response1.status(HttpStatus.OK).json({
          error: {
            code: exception.transactionErrorCode,
            message: exception.transactionErrorMessage,
            data: exception.transactionData as PaymeDataEnum,
          },
          id: exception.transactionId,
        });
      }

      responseBody.statusCode = exception.getStatus();

      const response = exception.getResponse() as Error;

      if (typeof response === "string") {
        responseBody.message = response;
      } else {
        responseBody.message = response?.message.toString();
      }
    } else {
      responseBody.message = exception.message;
    }

    httpAdapter.reply(ctx.getResponse(), responseBody, responseBody.statusCode);
  }
}
