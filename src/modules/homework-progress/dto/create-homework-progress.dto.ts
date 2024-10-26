import { IsBoolean, IsInt, IsNotEmpty } from "class-validator";
import { ID } from "src/common/types/type";
import { ApiProperty } from "@nestjs/swagger";

export class CreateHomeworkProgressDto {
  @ApiProperty({
    description: "Foydalanuvchi IDsi",
    type: Number,
  })
  @IsNotEmpty()
  @IsInt()
  userId: ID;

  @ApiProperty({
    description: "Dars IDsi",
    type: Number,
  })
  @IsNotEmpty()
  @IsInt()
  homeworkId: ID;

  @ApiProperty({
    description:
      "Dars jarayonining holati (masalan, o'rgangan: true, o'rganmagan: false)",
    type: Boolean,
  })
  @IsNotEmpty()
  @IsBoolean()
  isWatched: boolean;
}
