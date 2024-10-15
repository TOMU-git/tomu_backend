import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsArray,
} from 'class-validator';

export class CreateTariffDto {
  @ApiProperty({ type: Number })
  @IsInt()
  @IsNotEmpty()
  course_id: number;

  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ type: Number })
  @IsInt()
  @IsNotEmpty()
  duration: number;

  @ApiProperty({ type: Number })
  @IsInt()
  @IsNotEmpty()
  price: number;

  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  options?: string[];
}
