import { IsOptional, IsString, IsNotEmpty, IsUUID } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateCourseDto {
  @ApiProperty({
    description: "Course title",
    example: "Russian language",
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: "Course description",
    example: "This course covers the basics of programming using Python.",
  })
  @IsString()
  description: string;

  @ApiProperty({})
  @IsString()
  videoUrl: string;

  @ApiPropertyOptional({
    type: String,
  })
  @IsString()
  @IsOptional()
  fileName?: string; // Ixtiyoriy qildik
}
