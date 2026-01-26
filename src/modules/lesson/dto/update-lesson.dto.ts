import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateLessonDto {
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
    description: "GrammarLink",
  })
  @IsString()
  @IsOptional()
  grammarLink: string;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  video?: any; // Fayl yuklash uchun maydon

  @ApiPropertyOptional({
    description: 'Bog\'lanadigan Blockning IDsi',
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
    description: 'Bog\'lanadigan Blockning IDsi',
    example: 1,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? undefined : parsed;
  })
  blockId?: number;
}
