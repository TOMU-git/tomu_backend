import {
  IsInt,
  IsString,
  IsOptional,
  IsNotEmpty,
  IsPositive,
  MaxLength,
} from 'class-validator';

export class CreateLessonDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  video_url: string;

  @IsInt()
  @IsPositive()
  order: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  mimetype: string;

  @IsInt()
  @IsPositive()
  size: number;

  @IsOptional()
  @IsString()
  blockId: string; // Bog'lanadigan `Block`ning `id`si

  @IsOptional()
  @IsString()
  grammarId: string; // Bog'lanadigan `Grammar`ning `id`si

  @IsOptional()
  @IsString()
  homeworkId: string; // Bog'lanadigan `Homework`ning `id`si
}
