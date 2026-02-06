import { ApiProperty } from '@nestjs/swagger';
import {
    IsString,
    IsNotEmpty,
    IsInt,
    IsOptional,
    Min,
    MaxLength,
} from 'class-validator';

export class CreateGroupDto {
    @ApiProperty({
        type: String,
        example: 'Advanced TypeScript Group',
        description: 'The name of the group',
        maxLength: 255,
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    name: string;

    @ApiProperty({
        type: Number,
        example: 0,
        description: 'The number of students in the group',
        required: false,
        minimum: 0,
        default: 0,
    })
    @IsOptional()
    @IsInt()
    @Min(0)
    studentsCount?: number;
}
