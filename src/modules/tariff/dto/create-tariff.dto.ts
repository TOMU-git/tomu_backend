import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class CreateTariffDto {
  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ type: Number })
  @IsInt()
  @IsNotEmpty()
  price: number;

  @ApiProperty({ type: Number })
  @IsInt()
  @IsNotEmpty()
  duration: number;

  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  description: string;
}
