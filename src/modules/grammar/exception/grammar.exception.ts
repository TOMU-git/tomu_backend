import { HttpException } from "@nestjs/common";

export class GrammarNotFoundException extends HttpException {
  constructor() {
    super("Grammar not found", 404);
  }
}

export class GrammarAlreadyExistException extends HttpException {
  constructor() {
    super("Grammar already exist", 400);
  }
}

export class GrammarOrderAlreadyExistException extends HttpException {
  constructor() {
    super("Grammar with this order already exists in this course", 400);
  }
}

export class GrammarsNotFoundByCourseId extends HttpException {
  constructor() {
    super("No grammars found for this course", 400);
  }
}
