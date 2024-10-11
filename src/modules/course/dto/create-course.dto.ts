import { IsOptional, IsString, IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsNotEmpty({ message: "O'qituvchi ID si bo'sh bo'lmasligi kerak" })
  instructor: string; // o'zgartirildi

  @ApiPropertyOptional({
    type: String,
  })
  @IsString()
  @IsOptional()
  fileName?: string; // Ixtiyoriy qildik
}
