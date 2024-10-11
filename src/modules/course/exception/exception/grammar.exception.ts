import { HttpException } from '@nestjs/common';

export class GrammarNotFoundException extends HttpException {
  constructor() {
    super('Grammar not found', 404);
  }
}

export class GrammarAlreadyExistException extends HttpException {
  constructor() {
    super('Grammar already exist', 400);
  }
}
