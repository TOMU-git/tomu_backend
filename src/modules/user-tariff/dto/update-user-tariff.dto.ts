import { PartialType } from "@nestjs/swagger";
import { CreateUserTariffDto } from "./create-user-tariff.dto";

export class UpdateUserTariffDto extends PartialType(CreateUserTariffDto) {}
