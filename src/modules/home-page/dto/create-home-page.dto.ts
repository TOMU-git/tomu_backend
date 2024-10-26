import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  IsUrl,
} from "class-validator";
import { Transform, Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateHomePageDto {
  @ApiPropertyOptional({
    description: "Landing page sarlavhasi",
    example: "Yozuvchi va Ularning Ijodi",
  })
  @IsString()
  title: string;

  @ApiPropertyOptional({
    description: "Landing page ta’rifi",
    example:
      "Bu yerda yozuvchilar va ularning ijodi haqida ma’lumotlar beriladi.",
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: "Foydalanuvchi afzalliklari",
    example: ["afzallik1", "afzallik2"],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @Transform(({ value }) =>
    typeof value === "string" ? value.split(",") : value,
  ) // Stringni massivga ajratish
  preferences?: string[];
}
