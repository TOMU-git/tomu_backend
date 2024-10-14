import { IsString, IsNotEmpty, IsUUID, IsArray, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBlockDto {
  @ApiProperty({ example: 'Module 1: Basics', description: 'Block title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 4,
    description: 'Course ID',
    type: Number,
  })
  @IsInt()
  @IsNotEmpty()
  courseId: number; // Kurs ID (raqam)
}
