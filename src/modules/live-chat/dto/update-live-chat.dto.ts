import { ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { CreateLiveChatDto } from "./create-live-chat.dto";
import { IsDate, IsEnum, IsInt, IsOptional, IsString } from "class-validator";
import {
  GenderEnum,
  MeetingStatusEnum,
} from "src/common/enums/enum";

export class UpdateLiveChatDto {
  @ApiPropertyOptional({
    type: String,
    description: "First name",
    example: "John",
  })
  @IsOptional()
  @IsString()
  firstName: string;

  @ApiPropertyOptional({
    type: String,
    description: "Last name",
    example: "Doe",
  })
  @IsOptional()
  @IsString()
  lastName: string;

  @ApiPropertyOptional({
    type: String,
    enum: GenderEnum,
  })
  @IsEnum(GenderEnum)
  @IsOptional()
  gender: GenderEnum;

  @ApiPropertyOptional({
    type: String,
    description: "Phone number",
    example: "+998901234567",
  })
  @IsOptional()
  @IsString()
  phoneNumber: string;

  @ApiPropertyOptional({
    type: Number,
    description: "Duration in minutes",
    example: 20,
  })
  @IsInt()
  @IsOptional()
  duration: number;

  @ApiPropertyOptional({
    type: Number,
    description: "Selected meeting course id",
  })
  @IsInt()
  @IsOptional()
  selectedCourseId: number;

  @ApiPropertyOptional({
    type: String,
    description: "Select should be 'YYYY-MM-DD' or 'DD/MM/YYYY' format.",
    example: "25/11/2024",
  })
  @IsString()
  @IsOptional()
  selectedDay: String;

  @ApiPropertyOptional({
    type: String,
    description: "Selected time",
    example: "10:00 AM",
  })
  @IsString()
  @IsOptional()
  selectedTime: string;

  @ApiPropertyOptional({
    type: String,
    enum: MeetingStatusEnum,
  })
  @IsEnum(MeetingStatusEnum)
  @IsOptional()
  status: MeetingStatusEnum;
}
