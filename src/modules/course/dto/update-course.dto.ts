import { IsOptional, IsString, IsBoolean } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";

export class UpdateCourseDto {
  @ApiPropertyOptional({
    description: "Course title",
    example: "Russian language",
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    description: "Course description",
    example: "This course covers the basics of programming using Python.",
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: "Video URL of the course",
    example: "https://example.com/video.mp4",
  })
  @IsString()
  @IsOptional()
  videoUrl?: string;

  @ApiPropertyOptional({
    description: "Optional file name associated with the course",
    type: String,
  })
  @IsString()
  @IsOptional()
  fileName?: string;

  @ApiPropertyOptional({
    description: "Kurs faol yoki yo'qligini ko'rsatadi",
    example: true,
    default: true,
  })
  @IsBoolean({ message: "isActive qiymati boolean bo'lishi kerak" })
  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true)
  isActive?: boolean = true;

  @ApiPropertyOptional({
    description: "Kursning qaysi tilda mavjudligi",
    example: "ar",
    type: String,
  })
  @IsString({ message: "lang string bo'lishi kerak" })
  @IsOptional()
  lang?: string;
}

