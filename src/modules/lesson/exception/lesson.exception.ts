import { HttpException } from "@nestjs/common";

export class LessonNotFoundException extends HttpException {
  constructor() {
    super("Lesson not found", 404);
  }
}

export class LessonAlreadyExistException extends HttpException {
  constructor() {
    super("Lesson already exist", 400);
  }
}

export class LessonOrderAlreadyExistException extends HttpException {
  constructor() {
    super("This order number is busy, choose another order number", 400);
  }
}
