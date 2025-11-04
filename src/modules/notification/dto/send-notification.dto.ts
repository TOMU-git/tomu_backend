import { IsString, IsNotEmpty, IsOptional, IsObject, IsArray, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendNotificationDto {
    @ApiProperty({
        description: 'Notification title',
        example: 'Yangi dars mavjud!',
    })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({
        description: 'Notification body/message',
        example: 'Sizga yangi dars qo\'shildi. Ko\'rib chiqing!',
    })
    @IsString()
    @IsNotEmpty()
    body: string;

    @ApiProperty({
        description: 'User ID to send notification to (optional, if not provided, sends to all users)',
        example: 1,
        required: false,
    })
    @IsNumber()
    @IsOptional()
    userId?: number;

    @ApiProperty({
        description: 'Additional data to send with notification',
        example: { lessonId: 1, courseId: 1, type: 'new_lesson' },
        required: false,
    })
    @IsObject()
    @IsOptional()
    data?: Record<string, any>;

    @ApiProperty({
        description: 'FCM token(s) to send notification to (optional, if userId provided, uses user devices)',
        example: ['token1', 'token2'],
        required: false,
    })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    tokens?: string[];
}
