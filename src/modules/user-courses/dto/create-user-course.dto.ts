// create-user-course.dto.ts

import { IsEnum, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { StatusEnum } from 'src/common/enums/enum';

export class CreateUserCourseDto {
  @ApiProperty({
    description: 'The date when the course was purchased',
    type: String,
    format: 'date',
    example: '2024-10-08',
  })
  @IsNotEmpty()
  @IsDateString()
  purchaseDate: Date;

  @ApiProperty({
    description: 'The status of the user course',
    enum: StatusEnum,
    example: StatusEnum.PANDING,
  })
  @IsNotEmpty()
  @IsEnum(StatusEnum)
  status: StatusEnum;

  @ApiProperty({
    description: 'The ID of the user',
    example: 1,
  })
  @IsNotEmpty()
  userId: number; // Foydalanuvchi ID si

  @ApiProperty({
    description: 'The ID of the course',
    example: 101,
  })
  @IsNotEmpty()
  courseId: number; // Kurs ID si
}
