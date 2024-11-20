import { HttpException } from "@nestjs/common";

export class HomeworkProgressNotFoundException extends HttpException {
  constructor() {
    super("HomeworkProgress not found", 404);
  }
}

export class HomeworkProgressAlreadyExistException extends HttpException {
  constructor() {
    super("HomeworkProgress already exist", 400);
  }
}

export class NotFoundNextProgress extends HttpException {
  constructor() {
    super("Not found next progress, before you should generate new progresses", 400);
  }
}