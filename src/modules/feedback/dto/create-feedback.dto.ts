import { IsString, IsInt, IsNotEmpty, Min, Max, IsIn } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";

export class CreateFeedbackDto {
  @ApiProperty({
    description: "Feedback comment",
    example: "This course was very informative.",
  })
  @IsString()
  @IsNotEmpty()
  comment: string;

  @ApiProperty({
    type: Number,
    description: "User ID associated with the feedback",
    example: "user",
  })
  @IsInt()
  @IsNotEmpty()
  user: number;

  @ApiProperty({
    type: Number,
    description: "Course ID associated with the feedback",
    example: "course-here",
  })
  @IsInt()
  @IsNotEmpty()
  course: number;
}
