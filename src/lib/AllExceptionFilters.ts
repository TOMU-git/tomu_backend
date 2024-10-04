import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { ResData } from './resData';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: any, host: ArgumentsHost): void {
    // In certain situations `httpAdapter` might not be availabl
    const { httpAdapter } = this.httpAdapterHost;

    const ctx = host.switchToHttp();
    const responseBody = new ResData(
      '',
      HttpStatus.INTERNAL_SERVER_ERROR,
      null,
      exception,
    );

    if (exception instanceof HttpException) {
      const response = exception.getResponse();

      if (typeof response === 'string') {
        responseBody.message = response;
        responseBody.statusCode = exception.getStatus();
      } else {
        // console.log("response", response.message);
      }
    } else {
      responseBody.message = exception.message;
    }

    httpAdapter.reply(ctx.getResponse(), responseBody, responseBody.statusCode);
  }
}
