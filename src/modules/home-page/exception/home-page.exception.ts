import { HttpException } from "@nestjs/common";

export class HomePageNotFoundException extends HttpException {
  constructor() {
    super("HomePage page not found", 404);
  }
}

export class HomePageAlreadyExistException extends HttpException {
  constructor() {
    super("This title already exists", 400);
  }
}
