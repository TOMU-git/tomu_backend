import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { GenderEnum } from 'src/common/enums/enum';

export class LoginAuthDto {
  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class UpdateProfileDto {
  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({ type: String, enum: GenderEnum })
  @IsEnum(GenderEnum)
  @IsNotEmpty()
  gender: GenderEnum;
}

export class UpdatePasswordDto {
  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  newPassword: string;

  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  confirmPassword: string;
}
