import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsNumber } from 'class-validator';

export class CreateUserTariffDto {
  @ApiProperty({ type: Number })
  @IsNumber()
  @IsNotEmpty()
  userId: number;

  @ApiProperty({ type: Number })
  @IsNumber()
  @IsNotEmpty()
  tariffId: number;
}
