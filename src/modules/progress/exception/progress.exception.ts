import { HttpException } from '@nestjs/common';

export class ProgressNotFoundException extends HttpException {
  constructor() {
    super('Progress not found', 404);
  }
}

export class ProgressAlreadyExistException extends HttpException {
  constructor() {
    super('Progress already exist', 400);
  }
}
