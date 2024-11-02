import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class LoginAuthDto {
  @ApiProperty({ type: String, example: "+998335701001" })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({ type: String, example: "password" })
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

export class VerifyDto {
  @ApiProperty({
    type: String,
    required: true,
    example: "123456",
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    type: String,
    required: true,
    example: "+998901234567",
  })
  @IsString()
  @IsNotEmpty()
  phone: string;
}

export class SentSmsDto {
  @ApiProperty({
    type: String,
    required: true,
    example: "+998901234567",
  })
  @IsString()
  @IsNotEmpty()
  phone: string;
}
