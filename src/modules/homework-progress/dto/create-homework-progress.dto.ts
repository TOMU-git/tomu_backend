import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional } from "class-validator";

export class CreateHomeworkProgressDto {
  @ApiProperty({
    type: Number,
    description: "ID of the user associated with the progress record",
    example: "1",
  })
  @IsNumber()
  userId: number;

  @ApiProperty({
    type: Number,
    description: "ID of the homework associated with the progress record",
    example: 1,
  })
  @IsNumber()
  homeworkId: number;

  @ApiProperty({
    description: "Foydalanuvchi IDsi",
    type: Number,
  })
  @IsNotEmpty()
  @IsInt()
  blockId: number;

  @ApiProperty({
    description:
      "Indicates if the homework is watched (true - watched, false - not watched)",
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isWatched?: boolean;
}
