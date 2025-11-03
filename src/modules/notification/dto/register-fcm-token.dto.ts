import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterFcmTokenDto {
    @ApiProperty({
        description: 'Firebase Cloud Messaging token',
        example: 'dGhpc2lzYW5leGFtcGxldG9rZW4...',
    })
    @IsString()
    @IsNotEmpty()
    fcmToken: string;

    @ApiProperty({
        description: 'Device ID (optional, if not provided, will use current device)',
        example: '550e8400-e29b-41d4-a716-446655440000',
        required: false,
    })
    @IsString()
    @IsOptional()
    deviceId?: string;
}
