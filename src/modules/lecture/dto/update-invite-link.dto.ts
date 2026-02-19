import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateInviteLinkDto {
    @ApiProperty({
        type: String,
        example: 'https://t.me/+xxxxx',
        description: 'Telegram group invite link',
    })
    @IsString()
    @IsNotEmpty()
    inviteLink: string;
}
