import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { GenderEnum, RoleEnum } from 'src/common/enums/enum';

export class CreateUserDto {
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
  gender: GenderEnum;

  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ type: String, enum: RoleEnum })
  @IsEnum(RoleEnum)
  role: RoleEnum;
}
