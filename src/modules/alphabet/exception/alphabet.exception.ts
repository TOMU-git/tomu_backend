import { HttpException } from '@nestjs/common';

export class AlphabetNotFoundException extends HttpException {
  constructor() {
    super('Alphabet not found', 404);
  }
}

export class AlphabetAlreadyExistException extends HttpException {
  constructor() {
    super('Alphabet already exist', 400);
  }
}
