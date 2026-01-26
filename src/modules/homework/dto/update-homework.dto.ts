import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, IsOptional } from 'class-validator';

export class UpdateHomeworkDto {
  @ApiPropertyOptional({})
  @IsString()
  @IsOptional()
  title?: string;

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
  blockId?: number;

  @ApiPropertyOptional({
    description: 'Tartib raqami',
    example: 1,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return undefined;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? undefined : parsed;
  })
  order?: number;
}
