// create-user-course.dto.ts
import { ID } from "src/common/types/type";
import { IsBoolean, IsEnum, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { StatusEnum } from "src/common/enums/enum";

export class CreateUserCourseDto {
  @ApiProperty({
    description: "The status of the user course",
    enum: StatusEnum,
    example: StatusEnum.PANDING,
  })
  @IsNotEmpty()
  @IsEnum(StatusEnum)
  status: StatusEnum;

  @ApiProperty({
    description: "The ID of the user",
    example: 1,
  })
  @IsNotEmpty()
  userId: ID; 

  @ApiProperty({
    description: "The on free trial of the user course",
    example: true,
  })
  @IsBoolean()
  onFreeTrial: boolean;

  @ApiProperty({
    description: "The ID of the course",
    example: 101,
  })
  @IsNotEmpty()
  courseId: ID; 
}

