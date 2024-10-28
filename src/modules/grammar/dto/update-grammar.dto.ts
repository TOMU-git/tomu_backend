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
    description: 'Bog‘lanadigan Kursnig IDsi',
    example: 1,
  })
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : value)) // Stringni avtomatik raqamga aylantirish, bo‘sh bo‘lsa o‘zgartirmaslik
  courseId?: number;
}

