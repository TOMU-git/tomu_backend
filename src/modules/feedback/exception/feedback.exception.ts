import { HttpException } from "@nestjs/common";

export class FeedbackNotFoundException extends HttpException {
  constructor() {
    super("Feedback not found", 404);
  }
}

export class FeedbackAlreadyExistException extends HttpException {
  constructor() {
    super("Feedback already exist", 400);
  }
}
