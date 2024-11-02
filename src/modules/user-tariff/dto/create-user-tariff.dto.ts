import { ApiProperty } from "@nestjs/swagger";
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
} from "class-validator";

export class CreateUserTariffDto {
  @ApiProperty({ type: Number })
  @IsInt()
  @IsNotEmpty()
  userId: number;

  @ApiProperty({ type: Number })
  @IsInt()
  @IsNotEmpty()
  tariffId: number;
}
