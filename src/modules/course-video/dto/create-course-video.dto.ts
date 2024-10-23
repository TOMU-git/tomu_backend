import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class CreateCourseVideoDto {
  @ApiProperty({
    description: 'Video faylining URL manzili',
    example: 'https://example.com/video.mp4',
  })
  @IsString()
  video: string;
}
