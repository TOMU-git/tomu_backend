import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty } from 'class-validator';

export class CreateUserTariffDto {
  @ApiProperty({ type: Date })
  @IsDateString()
  @IsNotEmpty()
  purchase_date: Date;

  @ApiProperty({ type: Date })
  @IsDateString()
  @IsNotEmpty()
  expiration_date: Date;
}
