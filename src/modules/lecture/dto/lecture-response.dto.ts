import { ApiProperty } from '@nestjs/swagger';
import { LectureStatusEnum } from 'src/common/enums/lecture-status.enum';

export class LectureResponseDto {
    @ApiProperty({
        type: Number,
        example: 1,
        description: 'The unique identifier of the lecture',
    })
    id: number;

    @ApiProperty({
        type: String,
        example: 'Introduction to TypeScript',
        description: 'The title of the lecture',
    })
    title: string;

    @ApiProperty({
        type: Date,
        example: '2026-02-10T14:30:00Z',
        description: 'The start time of the lecture',
    })
    startTime: Date;

    @ApiProperty({
        type: Date,
        example: '2026-02-10T16:00:00Z',
        description: 'The end time of the lecture',
        required: false,
    })
    endTime?: Date;

    @ApiProperty({
        type: Number,
        example: 60,
        description: 'Duration of the lecture in minutes',
        required: false,
    })
    duration?: number;

    @ApiProperty({
        type: String,
        example: 'https://example.com/course-image.jpg',
        description: 'Course image URL',
        required: false,
    })
    courseImage?: string;

    @ApiProperty({
        enum: LectureStatusEnum,
        example: LectureStatusEnum.SCHEDULED,
        description: 'Status of the lecture',
    })
    status: LectureStatusEnum;

    @ApiProperty({
        type: String,
        example: 'https://t.me/+AbCdEf...',
        description: 'Telegram invite link',
        required: false,
    })
    inviteLink?: string;

    @ApiProperty({
        type: Object,
        description: 'The group this lecture belongs to',
        example: {
            id: 1,
            name: '1a',
            gender: 'MALE',
        },
    })
    group: {
        id: number;
        name: string;
        gender: string;
    };

    @ApiProperty({
        type: Object,
        description: 'The user (teacher) conducting this lecture',
        example: {
            id: 1,
            firstName: 'John',
            lastName: 'Doe',
        },
        required: false,
    })
    user?: {
        id: number;
        firstName: string;
        lastName: string;
    };

    @ApiProperty({
        type: Date,
        example: '2026-02-06T11:45:22Z',
        description: 'When the lecture was created',
    })
    createdAt: Date;

    @ApiProperty({
        type: Date,
        example: '2026-02-06T11:45:22Z',
        description: 'When the lecture was last updated',
    })
    updatedAt: Date;
}
