import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsString,
    IsNotEmpty,
    IsDate,
    IsInt,
    IsOptional,
    IsUrl,
    Min,
    MaxLength,
    IsEnum,
} from 'class-validator';
import { LectureStatusEnum } from 'src/common/enums/lecture-status.enum';

export class CreateLectureDto {
    @ApiProperty({
        type: String,
        example: 'Introduction to TypeScript',
        description: 'The title of the lecture',
        maxLength: 255,
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    title: string;

    @ApiProperty({
        type: Date,
        example: '2026-02-10T14:30:00Z',
        description: 'The start time of the lecture',
    })
    @IsDate()
    @Type(() => Date)
    startTime: Date;

    @ApiProperty({
        type: Number,
        example: 90,
        description: 'Duration of the lecture in minutes',
        required: false,
        minimum: 1,
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    duration?: number;

    @ApiProperty({
        enum: LectureStatusEnum,
        example: LectureStatusEnum.SCHEDULED,
        description: 'Status of the lecture',
        required: false,
    })
    @IsOptional()
    @IsEnum(LectureStatusEnum)
    status?: LectureStatusEnum;

    @ApiProperty({
        type: String,
        example: 'https://t.me/+AbCdEfGhIjK',
        description: 'Telegram invite link for the lecture',
        required: false,
    })
    @IsOptional()
    @IsString()
    inviteLink?: string;

    @ApiProperty({
        type: Number,
        example: 1,
        description: 'The ID of the group this lecture belongs to',
    })
    @IsInt()
    @IsNotEmpty()
    groupId: number;

    @ApiProperty({
        type: Number,
        example: 1,
        description: 'The ID of the user (teacher) conducting this lecture',
        required: false,
    })
    @IsOptional()
    @IsInt()
    userId?: number;
}
