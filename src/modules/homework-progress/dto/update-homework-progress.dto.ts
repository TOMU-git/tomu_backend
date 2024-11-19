import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsNumber, IsOptional } from "class-validator";

export class UpdateHomeworkProgressDto {
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
