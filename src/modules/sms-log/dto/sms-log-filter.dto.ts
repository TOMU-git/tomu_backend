import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsIn, IsOptional, IsString, Min } from "class-validator";
import { Type } from "class-transformer";
import { IsInt } from "class-validator";

export class SmsLogFilterDto {
  @ApiPropertyOptional({ example: "998901234567" })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: ["sent", "failed", "auth-error"] })
  @IsOptional()
  @IsIn(["sent", "failed", "auth-error"])
  status?: string;

  @ApiPropertyOptional({ enum: ["otp", "forgot-password"] })
  @IsOptional()
  @IsIn(["otp", "forgot-password"])
  type?: string;

  @ApiPropertyOptional({ example: "2024-01-01" })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: "2024-12-31" })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
