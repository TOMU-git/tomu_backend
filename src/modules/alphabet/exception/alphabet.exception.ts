import { HttpException } from "@nestjs/common";

export class AlphabetNotFoundException extends HttpException {
  constructor() {
    super("Alphabet not found", 404);
  }
}

export class AlphabetOrderAlreadyExistException extends HttpException {
  constructor() {
    super("This order number is busy, choose another order number", 400);
  }
}
