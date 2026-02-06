import { ApiProperty } from '@nestjs/swagger';

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
        example: '2026-02-10',
        description: 'The date when the lecture will be held',
    })
    day: Date;

    @ApiProperty({
        type: Date,
        example: '2026-02-10T14:30:00Z',
        description: 'The start time of the lecture',
    })
    startTime: Date;

    @ApiProperty({
        type: Number,
        example: 90,
        description: 'Duration of the lecture in minutes',
        required: false,
    })
    duration?: number;

    @ApiProperty({
        type: String,
        example: 'https://t.me/example_bot',
        description: 'Telegram bot URL for the lecture',
        required: false,
    })
    botUrl?: string;

    @ApiProperty({
        type: Object,
        description: 'The group this lecture belongs to',
        example: {
            id: 1,
            name: 'Advanced TypeScript Group',
            studentsCount: 25,
        },
    })
    group: {
        id: number;
        name: string;
        studentsCount: number;
    };

    @ApiProperty({
        type: Object,
        description: 'The user (teacher) conducting this lecture',
        example: {
            id: 1,
            firstName: 'John',
            lastName: 'Doe',
        },
    })
    user: {
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
