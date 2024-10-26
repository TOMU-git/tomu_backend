import { HttpException, HttpStatus } from "@nestjs/common";

export class UserNotFound extends HttpException {
  constructor() {
    super("user not found", HttpStatus.NOT_FOUND);
  }
}

export class UserAlreadyExist extends HttpException {
  constructor() {
    super("User already exist", HttpStatus.BAD_REQUEST);
  }
}

export class UserForbiddenException extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.FORBIDDEN);
  }
}
