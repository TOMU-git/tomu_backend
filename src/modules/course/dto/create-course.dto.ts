import {
  IsOptional,
  IsString,
  IsInt,
  IsArray,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCourseDto {
  @ApiProperty({
    description: 'Course title',
    example: 'Introduction to Programming',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Course description',
    example: 'This course covers the basics of programming using Python.',
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Course instructor ID',
    example: '550e8400-e29b-41d4-a716-446655440000', // UUID formatida
  })
  @IsNotEmpty({ message: "O'qituvchi ID si bo'sh bo'lmasligi kerak" })
  @IsString()
  instructor: string; // O'qituvchi ID si

  @ApiProperty({
    description: 'Image URL for the course',
    example: 'https://example.com/image.jpg',
    required: false, // Ixtiyoriy ekanligini ko'rsatish
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({
    description: 'List of block IDs',
    example: ['block_id_1', 'block_id_2'],
    required: false, // Ixtiyoriy ekanligini ko'rsatish
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  blocks?: string[];
}
