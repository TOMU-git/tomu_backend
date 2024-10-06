import { HttpException } from '@nestjs/common';

export class AuthException extends HttpException {
  constructor() {
    super('Invalid Credentials', 401);
  }
}
