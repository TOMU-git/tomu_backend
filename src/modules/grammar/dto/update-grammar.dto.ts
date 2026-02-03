import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateGrammarDto {
  @ApiPropertyOptional({
    description: 'Darsning sarlavhasi',
    example: 'Ingliz tilida dars',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  video?: any; // Fayl yuklash uchun maydon

  @ApiPropertyOptional({
    description: 'Grammarning tartibi',
    example: 1,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? undefined : parsed;
  })
  order?: number;

  @ApiPropertyOptional({
    description: 'Bog‘lanadigan Kursnig IDsi',
    example: 1,
  })
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : value)) // Stringni avtomatik raqamga aylantirish, bo‘sh bo‘lsa o‘zgartirmaslik
  courseId?: number;
}

