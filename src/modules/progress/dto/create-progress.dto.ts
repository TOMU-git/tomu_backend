import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProgressDto {
  @ApiProperty({
    description: 'Foydalanuvchining IDsi',
    example: 1,
  })
  @Transform(({ value }) => parseInt(value, 10)) // Stringni avtomatik raqamga aylantirish
  @IsInt()
  @IsPositive()
  userId: number;

  @ApiPropertyOptional({
    description: 'Darsning IDsi',
    example: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @IsPositive()
  lessonId?: number;

  @ApiPropertyOptional({
    description: 'Homeworkning IDsi',
    example: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @IsPositive()
  homeworkId?: number;

  @ApiProperty({
    description: 'Foydalanuvchi videoni ko‘rgan yoki ko‘rmaganligi',
    example: true,
  })
  @IsBoolean()
  isWatched: boolean;
}
