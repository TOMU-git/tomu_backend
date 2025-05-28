import { ApiProperty } from "@nestjs/swagger";
import { IsDate, IsEnum, IsInt, IsNotEmpty, IsString } from "class-validator";
import { GenderEnum } from "src/common/enums/enum";

export class CreateLiveChatDto {
  @ApiProperty({
    type: String,
    description: "First name",
    example: "John",
  })
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @ApiProperty({
    type: String,
    description: "Last name",
    example: "Doe",
  })
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiProperty({
    type: String,
    enum: GenderEnum,
  })
  @IsEnum(GenderEnum)
  @IsNotEmpty()
  gender: GenderEnum;

  @ApiProperty({
    type: String,
    description: "Phone number",
    example: "+998901234567",
  })
  @IsNotEmpty()
  @IsString()
  phoneNumber: string;

  @ApiProperty({
    type: Number,
    description: "Duration in minutes",
    example: 40,
    required: true,
  })
  @IsInt()
  @IsNotEmpty()
  duration: number;

  @ApiProperty({
    type: Number,
    description: "User id"
  })
  @IsInt()
  @IsNotEmpty()
  userId: number;

  @ApiProperty({
    type: Number,
    description: "Selected meeting course id",
  })
  @IsInt()
  @IsNotEmpty()
  selectedCourseId: number;

  @ApiProperty({
    type: String,
    description: "Select should be 'YYYY-MM-DD'",
    example: "2024-11-25",
  })
  @IsString()
  @IsNotEmpty()
  selectedDay: Date;

  @ApiProperty({
    type: String,
    description: "Selected time",
    example: "10:00"
  })
  @IsString()
  @IsNotEmpty()
  selectedTime: string;
}
