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

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  res: Response;
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: any, host: ArgumentsHost): void {
    console.log("Exception :", exception);

    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    const responseBody = new ResData(
      "",
      HttpStatus.INTERNAL_SERVER_ERROR,
      null,
      exception,
    );
    if (exception instanceof HttpException) {
      console.log("exception :", exception);
      responseBody.statusCode = exception.getStatus();

      const response = exception.getResponse() as Error;

      if (typeof response === "string") {
        responseBody.message = response;
      } else {
        responseBody.message = response?.message.toString();
      }
    } else {
      console.log(3);
      responseBody.message = exception.message;
    }

    httpAdapter.reply(ctx.getResponse(), responseBody, responseBody.statusCode);
  }
}
