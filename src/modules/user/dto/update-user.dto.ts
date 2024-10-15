import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, NotEquals } from 'class-validator';
import { GenderEnum, RoleEnum } from 'src/common/enums/enum';

export class UpdateUserDto {
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

  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  password: string;
}
