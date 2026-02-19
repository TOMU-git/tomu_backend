import { ApiProperty } from '@nestjs/swagger';
import { GenderEnum } from 'src/common/enums/enum';
import { GroupStatusEnum } from 'src/common/enums/group-status.enum';

export class GroupResponseDto {
    @ApiProperty({
        type: Number,
        example: 1,
        description: 'The unique identifier of the group',
    })
    id: number;

    @ApiProperty({
        type: String,
        example: '1a',
        description: 'The name of the group',
    })
    name: string;

    @ApiProperty({
        enum: GenderEnum,
        example: GenderEnum.MALE,
        description: 'Gender of the group members',
    })
    gender: GenderEnum;

    @ApiProperty({
        type: Number,
        example: 5,
        description: 'The current number of students in the group',
    })
    studentsCount: number;

    @ApiProperty({
        type: Number,
        example: 12,
        description: 'Maximum number of students',
    })
    maxStudents: number;

    @ApiProperty({
        enum: GroupStatusEnum,
        example: GroupStatusEnum.FILLING,
        description: 'Status of the group',
    })
    status: GroupStatusEnum;

    @ApiProperty({
        type: Date,
        example: '2026-02-15T15:00:00Z',
        description: 'When the lessons start (3 days after filling)',
        required: false,
    })
    startDate?: Date;

    @ApiProperty({
        type: Number,
        example: 1,
        description: 'Current step in the rotating schedule',
    })
    currentScheduleStep: number;

    @ApiProperty({
        type: Date,
        example: '2026-02-06T11:45:22Z',
        description: 'When the group was created',
    })
    createdAt: Date;

    @ApiProperty({
        type: Date,
        example: '2026-02-06T11:45:22Z',
        description: 'When the group was last updated',
    })
    updatedAt: Date;
}
