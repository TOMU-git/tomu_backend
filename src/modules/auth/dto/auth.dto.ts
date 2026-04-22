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

export class ForgotPassword{
  @ApiProperty({
    type: String,
    example: "+998901234567",
  })
  @IsString()
  @IsNotEmpty()
  phone: string;
}

export class GoogleMobileAuthDto {
  @ApiProperty({
    type: String,
    required: true,
    description: "The idToken received from Google Sign-In on the mobile device",
  })
  @IsString()
  @IsNotEmpty()
  idToken: string;
}

export class AppleMobileAuthDto {
  @ApiProperty({
    type: String,
    required: true,
    description: "The identityToken received from Apple Sign-In on the mobile device",
  })
  @IsString()
  @IsNotEmpty()
  identityToken: string;

  @ApiProperty({
    type: String,
    required: false,
    description: "First name, usually only sent on the first successful login by Apple",
  })
  @IsString()
  @IsNotEmpty()
  firstName?: string;

  @ApiProperty({
    type: String,
    required: false,
    description: "Last name, usually only sent on the first successful login by Apple",
  })
  @IsString()
  @IsNotEmpty()
  lastName?: string;
}
