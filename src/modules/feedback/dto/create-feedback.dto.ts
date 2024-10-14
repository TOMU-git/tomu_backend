import { IsString, IsInt, IsNotEmpty, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFeedbackDto {
  @ApiProperty({
    description: 'Feedback comment',
    example: 'This course was very informative.',
  })
  @IsString()
  @IsNotEmpty()
  comment: string;

  @ApiProperty({
    description: 'Course rating (1 to 5)',
    example: 5,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({
    description: 'User ID associated with the feedback',
    example: 'user-id-here',
  })
  @IsString()
  @IsNotEmpty()
  user: string;

  @ApiProperty({
    description: 'Course ID associated with the feedback',
    example: 'course-id-here',
  })
  @IsString()
  @IsNotEmpty()
  course: string;
}
