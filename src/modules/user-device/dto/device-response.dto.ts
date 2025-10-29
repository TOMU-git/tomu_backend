import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserDevice } from '../entities/user-device.entity';

/**
 * Device Response DTO
 * 
 * Used for API responses
 * Excludes sensitive information
 */
export class DeviceResponseDto {
    @ApiProperty({
        description: 'Device ID',
        example: '550e8400-e29b-41d4-a716-446655440000'
    })
    id: number;

    @ApiProperty({
        description: 'Unique device identifier',
        example: '550e8400-e29b-41d4-a716-446655440000'
    })
    deviceId: string;

    @ApiProperty({
        description: 'Device name',
        example: 'iPhone 15 Pro'
    })
    deviceName: string;

    @ApiProperty({
        description: 'Device type',
        example: 'mobile'
    })
    deviceType: string;

    @ApiProperty({
        description: 'Operating system name',
        example: 'iOS'
    })
    osName: string;

    @ApiPropertyOptional({
        description: 'Operating system version',
        example: '17.2.1'
    })
    osVersion?: string;

    @ApiPropertyOptional({
        description: 'Browser name',
        example: 'Safari'
    })
    browserName?: string;

    @ApiPropertyOptional({
        description: 'Browser version',
        example: '17.2.1'
    })
    browserVersion?: string;

    @ApiProperty({
        description: 'IP address',
        example: '192.168.1.100'
    })
    ipAddress: string;

    @ApiPropertyOptional({
        description: 'Device location',
        example: 'Tashkent, Uzbekistan'
    })
    location?: string;

    @ApiProperty({
        description: 'Device active status',
        example: true
    })
    isActive: boolean;

    @ApiProperty({
        description: 'Last login timestamp',
        example: '2024-01-15T10:30:00Z'
    })
    lastLoginAt: Date;

    @ApiPropertyOptional({
        description: 'Device expiry timestamp',
        example: '2024-02-15T10:30:00Z'
    })
    expiresAt?: Date;

    @ApiProperty({
        description: 'Device security level',
        example: 'normal'
    })
    securityLevel: string;

    @ApiProperty({
        description: 'Creation timestamp',
        example: '2024-01-01T10:30:00Z'
    })
    createdAt: Date;

    @ApiProperty({
        description: 'Last update timestamp',
        example: '2024-01-15T10:30:00Z'
    })
    lastUpdatedAt: Date;

    /**
     * Convert UserDevice entity to DeviceResponseDto
     */
    static fromEntity(entity: UserDevice): DeviceResponseDto {
        const dto = new DeviceResponseDto();
        dto.id = entity.id;
        dto.deviceId = entity.deviceId;
        dto.deviceName = entity.deviceName;
        dto.deviceType = entity.deviceType;
        dto.osName = entity.osName;
        dto.osVersion = entity.osVersion;
        dto.browserName = entity.browserName;
        dto.browserVersion = entity.browserVersion;
        dto.ipAddress = entity.ipAddress;
        dto.location = entity.location;
        dto.isActive = entity.isActive;
        dto.lastLoginAt = entity.lastLoginAt;
        dto.expiresAt = entity.expiresAt;
        dto.securityLevel = entity.securityLevel;
        dto.createdAt = entity.createdAt;
        dto.lastUpdatedAt = entity.lastUpdatedAt;
        return dto;
    }

    /**
     * Convert array of UserDevice entities to DeviceResponseDto array
     */
    static fromEntities(entities: UserDevice[]): DeviceResponseDto[] {
        return entities.map(entity => DeviceResponseDto.fromEntity(entity));
    }
}
