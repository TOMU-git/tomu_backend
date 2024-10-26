import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from "class-validator";

export class CreateAlphabetDto {
  @ApiProperty({
    description: "Alifbo darsining nomi",
    example: "Alifbo darsi 1",
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({
    type: "string",
    format: "binary",
  })
  @IsOptional()
  video: any; // Fayl yuklash uchun maydon

  @ApiProperty({
    description: "Darsning tartibini belgilaydi, masalan 1, 2, 3 ko'rinishida.",
    example: 1,
  })
  @IsInt()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNotEmpty()
  order: number;

  @ApiProperty({
    description: "Dars tegishli bo‘lgan kursning ID raqami.",
    example: 1,
  })
  @IsInt()
  @Transform(({ value }) => parseInt(value, 10)) // Stringni avtomatik raqamga aylantirish
  @IsNotEmpty()
  courseId: number;
}
