import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger'; // Swagger dekoratorini import qilish

export class CreateGrammarDto {
  @ApiProperty({
    description: 'The title of the grammar', // Swaggerda ko'rsatiladigan tavsif
    example: 'Present Simple Tense', // Misol
  })
  @IsNotEmpty({ message: 'Title is required' })
  @IsString({ message: 'Title must be a string' })
  @Length(1, 255, { message: 'Title must be between 1 and 255 characters' })
  title: string;

  @ApiProperty({
    description: 'The text of the grammar',
    example:
      'The present simple tense is used to describe habits and routines.',
  })
  @IsNotEmpty({ message: 'Grammar text is required' })
  @IsString({ message: 'Grammar text must be a string' })
  grammarText: string;

  @ApiProperty({
    description: 'The ID of the associated course, if any',
    example: 1,
    required: false, // Bu maydon ixtiyoriy
  })
  @IsOptional()
  courseId?: number;
}
