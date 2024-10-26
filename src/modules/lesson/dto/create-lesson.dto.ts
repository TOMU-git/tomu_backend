import { Transform } from "class-transformer";
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateLessonDto {
  @ApiProperty({
    description: "Darsning sarlavhasi",
    example: "Ingliz tilida dars",
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({
    type: "string",
    format: "binary",
  })
  @IsOptional()
  video: any; // Fayl yuklash uchun maydon

  @ApiProperty({
    description: "Dars tartibi",
    example: 1,
  })
  @Transform(({ value }) => parseInt(value, 10)) // Stringni avtomatik raqamga aylantirish
  @IsInt()
  @IsPositive()
  order: number;

  @ApiProperty({
    description: "Bog‘lanadigan Blockning IDsi",
    example: 1,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10)) // Stringni avtomatik raqamga aylantirish
  blockId: number;
}
