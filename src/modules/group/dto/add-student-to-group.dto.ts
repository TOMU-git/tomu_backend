import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty } from 'class-validator';

export class AddStudentToGroupDto {
    @ApiProperty({
        type: Number,
        example: 1,
        description: 'Student user ID',
    })
    @IsInt()
    @IsNotEmpty()
    userId: number;

    @ApiProperty({
        type: Number,
        example: 1,
        description: 'Course ID',
    })
    @IsInt()
    @IsNotEmpty()
    courseId: number;
}
