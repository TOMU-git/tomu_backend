import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsString, IsOptional, IsInt} from "class-validator";
import { GenderEnum, RoleEnum } from "src/common/enums/enum";

export class UpdateUserDto {
  @ApiProperty({ type: String})
  @IsOptional()
  @IsString()
  firstName: string;

  @ApiProperty({ type: String })
  @IsOptional()
  @IsString()
  lastName: string;

  @ApiProperty({ type: String })
  @IsOptional()
  @IsString()
  phoneNumber: string;

  @ApiProperty({ type: String, enum: GenderEnum })
  @IsOptional()
  @IsEnum(GenderEnum)
  gender: GenderEnum;

  @ApiProperty({ type: String })
  @IsOptional()
  @IsString()
  password: string;

  @ApiProperty({
    type: Number,
    description: 'For only teacher role'
  })
  @IsOptional()
  @IsInt()
  courseId: number;
}
