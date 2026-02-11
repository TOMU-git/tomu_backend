import { ApiProperty } from '@nestjs/swagger';
import {
    IsString,
    IsNotEmpty,
    IsInt,
    IsOptional,
    Min,
    MaxLength,
    IsEnum,
} from 'class-validator';
import { GenderEnum } from 'src/common/enums/enum';

export class CreateGroupDto {
    @ApiProperty({
        type: String,
        example: '1a',
        description: 'The name of the group (e.g. 1a, 1b)',
        maxLength: 50,
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    name: string;

    @ApiProperty({
        enum: GenderEnum,
        example: GenderEnum.MALE,
        description: 'Gender of the group members',
    })
    @IsEnum(GenderEnum)
    @IsNotEmpty()
    gender: GenderEnum;

    @ApiProperty({
        type: Number,
        example: 12,
        description: 'Maximum number of students',
        required: false,
        default: 12,
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    maxStudents?: number;

    @ApiProperty({
        type: Number,
        example: 1,
        description: 'Course ID',
    })
    @IsInt()
    @IsNotEmpty()
    courseId: number;
}
