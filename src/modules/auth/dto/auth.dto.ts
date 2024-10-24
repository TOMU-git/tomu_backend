import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginAuthDto {
  @ApiProperty({ type: String, example: '+998335701001' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class AccessAuthDto {
  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  accessToken: string;
}
