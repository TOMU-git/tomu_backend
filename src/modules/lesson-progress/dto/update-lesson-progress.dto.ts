import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsNotEmpty } from "class-validator";

export class UpdateLessonProgressDto {
  @ApiProperty({
    description:
      "Dars jarayonining holati (masalan, o'rgangan: true, o'rganmagan: false)",
    type: Boolean,
  })
  @IsNotEmpty()
  @IsBoolean()
  isWatched: boolean;

  @ApiProperty({
    type: Number,
  })
  @IsNotEmpty()
  @IsInt()
  userId: number;

  @ApiProperty({
    type: Number,
  })
  @IsNotEmpty()
  @IsInt()
  blockOrder: number;
}
