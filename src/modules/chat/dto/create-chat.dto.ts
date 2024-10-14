import { IsNotEmpty, IsString, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateChatDto {
  @ApiProperty({
    description: 'The ID of the user who is sending the message.',
    example: 1,
  })
  @IsInt()
  userId: number;

  @ApiProperty({
    description: 'The message content that the user wants to send.',
    example: 'Salom, qanday yordam bera olishim mumkin?',
  })
  @IsNotEmpty()
  @IsString()
  message: string;
}
