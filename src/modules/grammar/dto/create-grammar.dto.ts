import { IsNotEmpty, IsOptional, IsString, Length, MaxLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"; // Swagger dekoratorini import qilish
import { Transform } from "class-transformer";

export class CreateGrammarDto {
  @ApiProperty({
    description: "Darsning sarlavhasi",
    example: "Ingliz tilida dars",
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({
    type: "string",
    format: "binary",
  })
  @IsOptional()
  video: any; // Fayl yuklash uchun maydon

  @ApiProperty({
    description: "The ID of the associated course, if any",
    example: 1,
    required: false, // Bu maydon ixtiyoriy
  })
  @Transform(({ value }) => parseInt(value, 10)) // Stringni avtomatik raqamga aylantirish
  @IsOptional()
  courseId?: number;
}
