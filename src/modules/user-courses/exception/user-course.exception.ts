import { HttpException } from "@nestjs/common";

export class UserCourseNotFoundException extends HttpException {
  constructor() {
    super("UserCourse not found", 404);
  }
}

export class UserCourseAlreadyExistException extends HttpException {
  constructor() {
    super("UserCourse already exist", 400);
  }
}
