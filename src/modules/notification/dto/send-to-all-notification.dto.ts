import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendToAllNotificationDto {
    @ApiProperty({
        description: 'Notification title',
        example: 'Yangi xabar',
    })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({
        description: 'Notification body/message',
        example: 'Bu barcha userlarga yuboriladi',
    })
    @IsString()
    @IsNotEmpty()
    body: string;
}

