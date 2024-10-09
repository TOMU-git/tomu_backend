import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'; // Swagger uchun dekorator

export class CreateLessonDto {
  @ApiProperty({
    description: 'Darsning sarlavhasi',
    example: 'Ingliz tilida dars',
    maxLength: 255,
  })
  @IsString()
  // @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary', // Fayl yuklash uchun format
  })
  @IsOptional() // Fayl yuklash optional
  video: any; // Fayl yuklash uchun maydon

  @ApiProperty({
    description: 'Dars tartibi',
    example: 1,
  })
  // @IsInt()
  // @IsPositive()
  order: number;

  @ApiProperty({
    description: 'Fayl turi (mimetype)',
    example: 'video/mp4',
    maxLength: 50,
  })
  @IsString()
  // @IsNotEmpty()
  // @MaxLength(50)
  mimetype: string;

  @ApiProperty({
    description: 'Fayl o‘lchami baytlarda',
    example: 1048576,
  })
  // @IsInt()
  // @IsPositive()
  size: number;

  @ApiProperty({
    description: 'Bog‘lanadigan Blockning IDsi',
    example: 1,
    required: false,
  })
  @IsOptional()
  // @IsInt()
  blockId: number; // ID format

  @ApiProperty({
    description: 'Bog‘lanadigan Grammarning IDsi',
    example: 2,
    required: false,
  })
  @IsOptional()
  // @IsInt()
  grammarId: number; // ID format

  @ApiProperty({
    description: 'Bog‘lanadigan Homeworkning IDsi',
    example: 3,
    required: false,
  })
  @IsOptional()
  // @IsInt()
  homeworkId: number; // ID format
}
