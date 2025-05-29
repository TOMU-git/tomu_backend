import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsNumber, IsOptional, IsString } from "class-validator";
import { ID } from "src/common/types/type";

export class UpdateHomeworkProgressDto {
  @ApiProperty({
    type: String,
    example: "60d21b4667d0d8992e610c85",
    description: "Homework progress ID",
  })
  @IsString()
  @IsOptional()
  id?: ID;
  @ApiProperty({
    type: Number,
    example: 3,
    default: 0,
  })
  @IsNumber()
  @IsOptional()
  userId?: number;

  @ApiProperty({
    type: Number,
    example: 3,
    default: 0,
  })
  @IsNumber()
  @IsOptional()
  blockOrder?: number;


  @ApiProperty({
    type: Number,
    example: 3,
    default: 0,
  })
  @IsNumber()
  @IsOptional()
  blockId?: number;


  @ApiProperty({
    type: Number,
    example: 3,
    default: 0,
  })
  @IsNumber()
  @IsOptional()
  courseId?: number;


  @ApiProperty({
    type: Number,
    example: 3,
    default: 0,
  })
  @IsNumber()
  @IsOptional()
  homeworkOrder?: number;
}
