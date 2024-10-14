import { IsNotEmpty, IsString } from 'class-validator';

export class CreateGrammarDto {
  @IsNotEmpty()
  @IsString()
  grammarText: string;

  @IsNotEmpty()
  lessonId: string; // Lesson bilan bog'lanish uchun lessonId kiritiladi
}
