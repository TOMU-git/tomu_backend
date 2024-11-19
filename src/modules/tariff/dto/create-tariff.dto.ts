import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsInt,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';



export class CreateTariffDto {
  @ApiProperty({ example: "Basic Plan", description: "Tariff name" })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 30, description: "Tariff duration in days" })
  @IsNotEmpty()
  @IsInt()
  @Type(() => Number)
  duration: number;

  @ApiProperty({ example: 100, description: "Tariff price in USD" })
  @IsNotEmpty()
  @IsInt()
  @Type(() => Number)
  price: number;

  @ApiProperty({
    example: ["Access to basic courses", "Support via email"],
    description: "Optional features for this tariff",
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @ApiProperty({
    type: Number,
    example: "123e4567-e89b-12d3-a456-426614174000",
    description: "Course ID",
  })
  @IsNotEmpty()
  @IsInt()
  courseId: number;
}
