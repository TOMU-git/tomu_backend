import { ResData } from 'src/lib/resData';
import { DeviceInfoDto } from '../dto/device-info.dto';
import { DeviceResponseDto } from '../dto/device-response.dto';
import { UserDevice } from '../entities/user-device.entity';

/**
 * Device Service Interface
 * 
 * Defines contract for device management business logic
 * Follows Service pattern for clean architecture
 */
export interface IDeviceService {
    /**
     * Register a new device for user
     * Handles device limit validation and cleanup
     * @param userId User ID
     * @param deviceInfo Device information
     * @returns Device registration result
     */
    registerDevice(
        userId: number,
        deviceInfo: DeviceInfoDto
    ): Promise<ResData<DeviceResponseDto>>;

    /**
     * Validate device for user
     * Checks if device is authorized and active
     * @param userId User ID
     * @param deviceId Device ID
     * @returns Validation result
     */
    validateDevice(userId: number, deviceId: string): Promise<boolean>;

    /**
     * Get all devices for user
     * @param userId User ID
     * @param includeInactive Include inactive devices
     * @returns User devices
     */
    getUserDevices(
        userId: number,
        includeInactive?: boolean
    ): Promise<ResData<DeviceResponseDto[]>>;

    /**
     * Remove device from user
     * @param userId User ID
     * @param deviceId Device ID
     * @returns Removal result
     */
    removeDevice(
        userId: number,
        deviceId: string
    ): Promise<ResData<DeviceResponseDto>>;

    /**
     * Remove all devices for user
     * @param userId User ID
     * @returns Removal result
     */
    removeAllDevices(userId: number): Promise<ResData<{ removedCount: number }>>;

    /**
     * Update device information
     * @param userId User ID
     * @param deviceId Device ID
     * @param deviceInfo Updated device information
     * @returns Update result
     */
    updateDevice(
        userId: number,
        deviceId: string,
        deviceInfo: Partial<DeviceInfoDto>
    ): Promise<ResData<DeviceResponseDto>>;

    /**
     * Refresh device session
     * Updates last login and extends expiry
     * @param userId User ID
     * @param deviceId Device ID
     * @returns Refresh result
     */
    refreshDeviceSession(
        userId: number,
        deviceId: string
    ): Promise<ResData<DeviceResponseDto>>;

    /**
     * Check device limit for user
     * @param userId User ID
     * @returns Device limit status
     */
    checkDeviceLimit(userId: number): Promise<{
        current: number;
        max: number;
        canAdd: boolean;
    }>;

    /**
     * Clean up expired devices
     * Removes devices that have expired
     * @param beforeDate Date before which devices are considered expired
     * @returns Cleanup result
     */
    cleanupExpiredDevices(beforeDate: Date): Promise<ResData<{ cleanedCount: number }>>;

    /**
     * Clean up inactive devices
     * Removes devices that have been inactive for too long
     * @param beforeDate Date before which devices are considered inactive
     * @returns Cleanup result
     */
    cleanupInactiveDevices(beforeDate: Date): Promise<ResData<{ cleanedCount: number }>>;

    /**
     * Get device statistics
     * @param userId User ID
     * @returns Device statistics
     */
    getDeviceStatistics(userId: number): Promise<{
        total: number;
        active: number;
        inactive: number;
        expired: number;
        byType: Record<string, number>;
    }>;

    /**
     * Set device security level
     * @param userId User ID
     * @param deviceId Device ID
     * @param securityLevel Security level
     * @returns Update result
     */
    setDeviceSecurityLevel(
        userId: number,
        deviceId: string,
        securityLevel: 'low' | 'normal' | 'high'
    ): Promise<ResData<DeviceResponseDto>>;

    /**
     * Check if device management is enabled for user
     * @param userId User ID
     * @returns True if enabled, false otherwise
     */
    isDeviceManagementEnabled(userId: number): Promise<boolean>;

    /**
     * Enable device management for user
     * @param userId User ID
     * @returns Enable result
     */
    enableDeviceManagement(userId: number): Promise<ResData<boolean>>;

    /**
     * Disable device management for user
     * @param userId User ID
     * @returns Disable result
     */
    disableDeviceManagement(userId: number): Promise<ResData<boolean>>;
}
