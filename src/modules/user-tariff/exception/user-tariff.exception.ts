import { HttpException } from "@nestjs/common";

export class UserTariffNotFoundException extends HttpException {
  constructor() {
    super("User Tariff Not Found", 404);
  }
}
