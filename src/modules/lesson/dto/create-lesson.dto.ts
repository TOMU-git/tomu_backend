import { IsInt, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateLessonDTO {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  video_url: string;

  @IsInt()
  order: number;

  // Grammar va Homework uchun optional, agar kerak bo'lsa
  grammarId?: string; // Agar siz grammarning ID-sini qo'shmoqchi bo'lsangiz
  homeworkId?: string; // Agar siz homeworkning ID-sini qo'shmoqchi bo'lsangiz
}
