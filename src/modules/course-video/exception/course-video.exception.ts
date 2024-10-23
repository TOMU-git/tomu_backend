import { HttpException } from '@nestjs/common';

export class CourseVideoNotFoundException extends HttpException {
  constructor() {
    super('CourseVideo not found', 404);
  }
}

export class CourseVideoAlreadyExistException extends HttpException {
  constructor() {
    super('CourseVideo already exist', 400);
  }
}
