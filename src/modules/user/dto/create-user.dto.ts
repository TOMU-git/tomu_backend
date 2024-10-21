import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, isString, IsString } from 'class-validator';
import { GenderEnum, RoleEnum } from '../../../common/enums/enum';

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

export class SearchUserByPhoneNumber {
  @ApiProperty({
    type: String,
    example: '+998901234567',
    description: 'The phone number to search for user.',
  })
  @IsNotEmpty()
  @IsString()
  phoneNumber: string;
}
