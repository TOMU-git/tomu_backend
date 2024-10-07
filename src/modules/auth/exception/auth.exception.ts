import { HttpException } from '@nestjs/common';

export class AuthException extends HttpException {
  constructor() {
    super('Invalid Credentials', 401);
  }
}

export class AuthIncorrectPassword extends HttpException {
  constructor(message: string) {
    super(message, 400);
  }
}
