import { IsString, IsOptional, IsEnum, IsObject, IsIP, MaxLength, MinLength, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DEVICE_TYPES, DEVICE_VALIDATION } from '../constants/device.constants';

/**
 * Device Information DTO
 * 
 * Used for device registration and management
 * Validates device information from frontend
 */
export class DeviceInfoDto {
    /**
     * Unique device identifier
     * Generated from device fingerprint
     * Must be UUID format
     */
    @ApiProperty({
        description: 'Unique device identifier (UUID)',
        example: '550e8400-e29b-41d4-a716-446655440000',
        minLength: 36,
        maxLength: 36
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(DEVICE_VALIDATION.DEVICE_ID_LENGTH)
    @MaxLength(DEVICE_VALIDATION.DEVICE_ID_LENGTH)
    deviceId: string;

    /**
     * Human-readable device name
     * Examples: "iPhone 15 Pro", "Samsung Galaxy S24"
     */
    @ApiProperty({
        description: 'Human-readable device name',
        example: 'iPhone 15 Pro',
        maxLength: DEVICE_VALIDATION.DEVICE_NAME_MAX_LENGTH
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(DEVICE_VALIDATION.DEVICE_NAME_MAX_LENGTH)
    deviceName: string;

    /**
     * Device type category
     */
    @ApiProperty({
        description: 'Device type category',
        enum: Object.values(DEVICE_TYPES),
        example: DEVICE_TYPES.MOBILE
    })
    @IsEnum(Object.values(DEVICE_TYPES))
    deviceType: keyof typeof DEVICE_TYPES;

    /**
     * Operating system name
     * Examples: "iOS", "Android", "Windows", "macOS"
     */
    @ApiProperty({
        description: 'Operating system name',
        example: 'iOS',
        maxLength: DEVICE_VALIDATION.OS_NAME_MAX_LENGTH
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(DEVICE_VALIDATION.OS_NAME_MAX_LENGTH)
    osName: string;

    /**
     * Operating system version
     * Examples: "17.2.1", "14", "Windows 11"
     */
    @ApiPropertyOptional({
        description: 'Operating system version',
        example: '17.2.1',
        maxLength: 50
    })
    @IsString()
    @IsOptional()
    @MaxLength(50)
    osVersion?: string;

    /**
     * Browser name (for web devices)
     * Examples: "Chrome", "Safari", "Firefox"
     */
    @ApiPropertyOptional({
        description: 'Browser name for web devices',
        example: 'Chrome',
        maxLength: DEVICE_VALIDATION.BROWSER_NAME_MAX_LENGTH
    })
    @IsString()
    @IsOptional()
    @MaxLength(DEVICE_VALIDATION.BROWSER_NAME_MAX_LENGTH)
    browserName?: string;

    /**
     * Browser version
     * Examples: "120.0.6099.109", "17.2.1"
     */
    @ApiPropertyOptional({
        description: 'Browser version',
        example: '120.0.6099.109',
        maxLength: 50
    })
    @IsString()
    @IsOptional()
    @MaxLength(50)
    browserVersion?: string;

    /**
     * Device IP address
     * Must be valid IPv4 or IPv6 address
     */
    @ApiProperty({
        description: 'Device IP address (IPv4/IPv6)',
        example: '192.168.1.100',
        maxLength: DEVICE_VALIDATION.IP_ADDRESS_MAX_LENGTH
    })
    @IsIP()
    @IsNotEmpty()
    @MaxLength(DEVICE_VALIDATION.IP_ADDRESS_MAX_LENGTH)
    ipAddress: string;

    /**
     * Full user agent string
     * Used for device fingerprinting
     */
    @ApiProperty({
        description: 'Full user agent string',
        example: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2_1 like Mac OS X) AppleWebKit/605.1.15',
        maxLength: DEVICE_VALIDATION.USER_AGENT_MAX_LENGTH
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(DEVICE_VALIDATION.USER_AGENT_MAX_LENGTH)
    userAgent: string;

    /**
     * Device location (if available)
     * Format: "City, Country" or "Country"
     */
    @ApiPropertyOptional({
        description: 'Device location (City, Country)',
        example: 'Tashkent, Uzbekistan',
        maxLength: DEVICE_VALIDATION.LOCATION_MAX_LENGTH
    })
    @IsString()
    @IsOptional()
    @MaxLength(DEVICE_VALIDATION.LOCATION_MAX_LENGTH)
    location?: string;

    /**
     * Additional device metadata
     * JSON object for extensibility
     * Examples: screen resolution, timezone, language
     */
    @ApiPropertyOptional({
        description: 'Additional device metadata (JSON)',
        example: {
            screenResolution: '1920x1080',
            timezone: 'Asia/Tashkent',
            language: 'uz-UZ',
            colorDepth: 24
        }
    })
    @IsObject()
    @IsOptional()
    metadata?: Record<string, any>;

    /**
     * Firebase Cloud Messaging (FCM) token
     * Used for sending push notifications to the device
     */
    @ApiPropertyOptional({
        description: 'Firebase Cloud Messaging token for push notifications',
        example: 'dGhpc2lzYW5leGFtcGxldG9rZW4...',
        maxLength: 500
    })
    @IsString()
    @IsOptional()
    @MaxLength(500)
    fcmToken?: string;
}
