import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsNotEmpty } from "class-validator";

export class UpdateLessonProgressDto {
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

  @ApiProperty({
    type: Number,
  })
  @IsNotEmpty()
  @IsInt()
  courseId: number;

  @ApiProperty({
    type: Number,
  })
  @IsNotEmpty()
  @IsInt()
  blockId: number;
}
