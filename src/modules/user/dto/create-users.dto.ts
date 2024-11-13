import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsInt, IsNotEmpty, IsString } from "class-validator";
import { GenderEnum, RoleEnum } from "src/common/enums/enum";

export class CreateAdminDto {
  @ApiProperty({
    type: String,
    example: "John",
    description: "The first name of the admin or teacher.",
  })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({
    type: String,
    example: "Doe",
    description: "The last name of the admin or teacher.",
  })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({
    type: String,
    example: "+998901234567",
    description: "The phone number for verification.",
  })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({ type: String, enum: GenderEnum })
  @IsEnum(GenderEnum)
  gender: GenderEnum;

  @ApiProperty({
    type: String,
    example: "password",
    description: "The password of the admin or teacher.",
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class CreateTeacherDto {
  @ApiProperty({
    type: String,
    example: "John",
    description: "The first name of the admin or teacher.",
  })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({
    type: String,
    example: "Doe",
    description: "The last name of the admin or teacher.",
  })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({
    type: String,
    example: "+998901234567",
    description: "The phone number for verification.",
  })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({ type: String, enum: GenderEnum })
  @IsEnum(GenderEnum)
  gender: GenderEnum;

  @ApiProperty({
    type: String,
    example: "password",
    description: "The password of the admin or teacher.",
  })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    type: Number,
    description: "course id"
  })
  @IsInt()
  @IsNotEmpty()
  courseId: number;
}

export class CreateStudentDto {
  @ApiProperty({
    type: String,
    example: "Ilyosbek",
    description: "The first name of the student.",
  })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({
    type: String,
    example: "Isaqov",
    description: "The last name of the student.",
  })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ type: String, enum: GenderEnum })
  @IsEnum(GenderEnum)
  gender: GenderEnum;

  @ApiProperty({
    type: String,
    example: "+998901234567",
    description: "The phone number for verification.",
  })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({
    type: String,
    example: "password",
    description: "The password of the student.",
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class SearchUserByPhoneNumber {
  @ApiProperty({
    type: String,
    example: "+998901234567",
    description: "The phone number to search for user.",
  })
  @IsString()
  phoneNumber: string;
}
