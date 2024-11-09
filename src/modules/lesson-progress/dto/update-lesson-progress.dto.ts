import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsNotEmpty } from "class-validator";

export class UpdateLessonProgressDto {
  @ApiProperty({
    description:
      "Dars jarayonining holati (masalan, o'rgangan: true, o'rganmagan: false)",
    type: Boolean,
  })
  @IsNotEmpty()
  @IsBoolean()
  isWatched: boolean;
}
