import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateCourseDto {
  @ApiProperty({
    description: 'Title of the course',
    type: String,
    example: 'Introduction to Programming',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Detailed description of the course',
    type: String,
    example: 'This course covers the basics of programming using Python.',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Instructor of the course',
    type: String,
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty()
  instructor: string;
  @ApiProperty({
    description: 'List of block IDs associated with the course',
    type: [String], // ID lar ro'yxati
    example: ['block_id_1', 'block_id_2'], // Misol
  })
  blocks: string[];

  @ApiProperty({
    description: 'URL of the course image',
    type: String,
    example: 'https://example.com/image.jpg',
    required: false, // Bu ixtiyoriy
  })
  @IsOptional()
  @IsString()
  imageUrl?: string; // Rasm URL'i ixtiyoriy
}
