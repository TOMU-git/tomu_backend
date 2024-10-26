import { HttpException } from "@nestjs/common";

export class HomeworkNotFoundException extends HttpException {
  constructor() {
    super("Homework not found", 404);
  }
}

export class HomeworkAlreadyExistException extends HttpException {
  constructor() {
    super("Homework already exist", 400);
  }
}

export class HomeworkOrderAlreadyExistException extends HttpException {
  constructor() {
    super('Homework order is busy, choose another order number', 400);
  }
}
