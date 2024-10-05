import { IsString, IsNotEmpty } from 'class-validator';

export class CreateHomeworkDto {
  @IsString()
  @IsNotEmpty()
  assignment_video_url: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNotEmpty()
  lessonId: string; // Lesson bilan bog'lanish uchun lessonId kiritiladi
}
