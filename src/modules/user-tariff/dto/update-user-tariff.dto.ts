import { ApiProperty } from "@nestjs/swagger";
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
} from "class-validator";

export class UpdateUserTariffDto {
  @ApiProperty({ type: Number })
  @IsNumber()
  @IsNotEmpty()
  userId: number;

  @ApiProperty({ type: Number })
  @IsNumber()
  @IsNotEmpty()
  tariffId: number;

  @ApiProperty({ type: String, format: "date", required: false })
  @IsDateString()
  @IsOptional()
  startedAt?: Date;

  @ApiProperty({ type: String, format: "date", required: false })
  @IsDateString()
  @IsOptional()
  endedAt?: Date;

  @ApiProperty({ type: Boolean, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
