import { IsNotEmpty, IsString, IsInt } from 'class-validator';

export class CreateChatDto {
  @IsInt()
  userId: number;

  @IsNotEmpty()
  @IsString()
  message: string;
}
