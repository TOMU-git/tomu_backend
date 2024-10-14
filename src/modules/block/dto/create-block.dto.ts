import { IsString, IsNotEmpty, IsUUID, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBlockDto {
  @ApiProperty({ example: 'Module 1: Basics', description: 'Block title' })
  @IsString()
  @IsNotEmpty()
  title: string;
  

  @ApiProperty({
    example: 'UUID of the associated course',
    description: 'Course ID',
  })
  @IsUUID()
  @IsNotEmpty()
  courseId: string; // Kurs UUID

  @ApiProperty({
    type: [String],
    example: ['lesson1-uuid', 'lesson2-uuid', 'lesson3-uuid'],
    description: 'List of lesson IDs to associate with this block',
  })
  @IsArray()
  @IsUUID(undefined, { each: true })
  lessons: string[]; // Lesson UUID lar ro'yxati (videolar bilan birga bo'ladi)
}
