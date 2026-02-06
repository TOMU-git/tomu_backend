import { ApiProperty } from '@nestjs/swagger';

export class GroupResponseDto {
    @ApiProperty({
        type: Number,
        example: 1,
        description: 'The unique identifier of the group',
    })
    id: number;

    @ApiProperty({
        type: String,
        example: 'Advanced TypeScript Group',
        description: 'The name of the group',
    })
    name: string;

    @ApiProperty({
        type: Number,
        example: 25,
        description: 'The number of students in the group',
    })
    studentsCount: number;

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
