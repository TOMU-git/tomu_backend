import { HttpException } from "@nestjs/common";

export class LessonProgressNotFoundException extends HttpException {
  constructor() {
    super("LessonProgress not found", 404);
  }
}

export class LessonProgressAlreadyExistException extends HttpException {
  constructor() {
    super("LessonProgress already exist", 400);
  }
}
