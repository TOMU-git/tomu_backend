import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsArray,
  IsInt,
  IsEnum,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { HomeworkEnum } from "src/common/enums/enum";

export class CreateBlockDto {
  @ApiProperty({ example: "Module 1: Basics", description: "Block title" })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ type: String, enum: HomeworkEnum })
  @IsEnum(HomeworkEnum)
  category: HomeworkEnum;

  @ApiProperty({
    example: 4,
    description: "Course ID",
    type: Number,
  })
  @IsInt()
  @IsNotEmpty()
  courseId: number; // Kurs ID (raqam)

  @ApiProperty({
    example: 4,
    description: "Order",
    type: Number,
  })
  @IsInt()
  @IsNotEmpty()
  order: number;
}
