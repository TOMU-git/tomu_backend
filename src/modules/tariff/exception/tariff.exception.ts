import { HttpException, HttpStatus } from "@nestjs/common";

export class TariffNotFoundException extends HttpException {
  constructor() {
    super("Tariff Not Found", HttpStatus.NOT_FOUND);
  }
}
