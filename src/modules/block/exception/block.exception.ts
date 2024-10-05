import { HttpException } from '@nestjs/common';

export class BlockNotFoundException extends HttpException {
  constructor() {
    super('Block not found', 404);
  }
}

export class BlockAlreadyExistException extends HttpException {
  constructor() {
    super('Block already exist', 400);
  }
}
