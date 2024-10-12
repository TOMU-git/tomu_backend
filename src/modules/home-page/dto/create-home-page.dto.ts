import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  IsUrl,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateHomePageDto {
  @ApiProperty({
    description: 'Landing page sarlavhasi',
    example: 'Yozuvchi va Ularning Ijodi',
  })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Landing page ta’rifi',
    example:
      'Bu yerda yozuvchilar va ularning ijodi haqida ma’lumotlar beriladi.',
  })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiPropertyOptional({
    type: String,
  })
  @IsString()
  @IsOptional()
  fileName?: string; // Ixtiyoriy qildik

  @ApiProperty({
    description: 'Foydalanuvchi afzalliklari',
    example: ['afzallik1', 'afzallik2'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',') : value,
  ) // Stringni massivga ajratish
  preferences?: string[];
}
