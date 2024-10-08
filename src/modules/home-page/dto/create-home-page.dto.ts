import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

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

  @ApiProperty({
    description: 'Landing page uchun rasm URL manzili',
    example: 'https://example.com/image.jpg',
  })
  @IsNotEmpty()
  @IsUrl()
  image: string;

  @ApiProperty({
    description: 'Foydalanuvchi afzalliklari',
    example: ['afzallik1', 'afzallik2'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @Type(() => String) // Array of strings
  preferences?: string[];
}
