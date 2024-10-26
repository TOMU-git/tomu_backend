import { HttpException } from "@nestjs/common";

export class CourseNotFoundException extends HttpException {
  constructor() {
    super("Course not found", 404);
  }
}

export class CourseAlreadyExistException extends HttpException {
  constructor() {
    super("Course already exist", 400);
  }
}
