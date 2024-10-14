import { HttpException } from '@nestjs/common';

export class ChatNotFoundException extends HttpException {
  constructor() {
    super('Chat not found', 404);
  }
}

export class ChatAlreadyExistException extends HttpException {
  constructor() {
    super('Chat already exist', 400);
  }
}
