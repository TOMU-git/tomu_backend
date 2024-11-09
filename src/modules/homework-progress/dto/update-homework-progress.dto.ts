import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsNumber, IsOptional } from "class-validator";

export class UpdateHomeworkProgressDto {
  @ApiProperty({
    type: Boolean,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isWatched?: boolean;

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
  homeworkOrder?: number;

  @ApiProperty({
    type: Number,
    example: 3,
    default: 0,
  })
  @IsNumber()
  @IsOptional()
  countWatched?: number;
}
