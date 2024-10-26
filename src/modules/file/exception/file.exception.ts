import { HttpException, HttpStatus } from "@nestjs/common";

export class FileException extends HttpException {
  constructor(fileType: string) {
    super(`File type expected image but ${fileType}`, HttpStatus.BAD_REQUEST);
  }
}

export class FileNotFoundException extends HttpException {
  constructor() {
    super(`File not found`, HttpStatus.NOT_FOUND);
  }
}
