import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { ResData } from 'src/lib/resData';
import { IDeviceRepository } from '../interfaces/device.repository';
import { IDeviceService } from '../interfaces/device.service';
import { DeviceInfoDto } from '../dto/device-info.dto';
import { DeviceResponseDto } from '../dto/device-response.dto';
import { UserDevice } from '../entities/user-device.entity';
import { IUserService } from 'src/modules/user/interfaces/user.service';
import {
    DEFAULT_DEVICE_LIMITS,
    DEVICE_SESSION_EXPIRY,
    DEVICE_ERROR_MESSAGES,
    DEVICE_SUCCESS_MESSAGES
} from '../constants/device.constants';
import { RoleEnum } from 'src/common/enums/enum';
import { DeviceLimitExceededException, DeviceNotFoundException } from '../exception/device.exception';

/**
 * Device Service Implementation
 * 
 * Implements device management business logic
 * Handles device registration, validation, and cleanup
 * Follows Service pattern for clean architecture
 */
@Injectable()
export class DeviceService implements IDeviceService {
    constructor(
        @Inject('IDeviceRepository')
        private readonly deviceRepository: IDeviceRepository,
        @Inject('IUserService')
        private readonly userService: IUserService,
    ) { }

    /**
     * Register a new device for user
     * Handles device limit validation and cleanup
     */
    async registerDevice(
        userId: number,
        deviceInfo: DeviceInfoDto
    ): Promise<ResData<DeviceResponseDto>> {
        try {
            // Get user information
            const { data: user } = await this.userService.findOneById(userId);
            if (!user) {
                throw new HttpException('User not found', HttpStatus.NOT_FOUND);
            }

            // Check if device management is enabled for user
            if (!user.deviceManagementEnabled) {
                // Device management not enabled, allow registration without limits
                const device = await this.createDevice(userId, deviceInfo);
                return new ResData<DeviceResponseDto>(
                    DEVICE_SUCCESS_MESSAGES.DEVICE_REGISTERED,
                    HttpStatus.CREATED,
                    DeviceResponseDto.fromEntity(device)
                );
            }

            // Check if device already exists
            const existingDevice = await this.deviceRepository.findByDeviceIdAndUserId(
                deviceInfo.deviceId,
                userId
            );

            if (existingDevice) {
                // Update existing device
                existingDevice.lastLoginAt = new Date();
                existingDevice.isActive = true;
                existingDevice.ipAddress = deviceInfo.ipAddress;
                existingDevice.userAgent = deviceInfo.userAgent;
                existingDevice.location = deviceInfo.location;
                existingDevice.metadata = deviceInfo.metadata;
                // Update FCM token if provided
                if (deviceInfo.fcmToken) {
                    existingDevice.fcmToken = deviceInfo.fcmToken;
                }

                const updatedDevice = await this.deviceRepository.update(existingDevice);
                return new ResData<DeviceResponseDto>(
                    DEVICE_SUCCESS_MESSAGES.DEVICE_UPDATED,
                    HttpStatus.OK,
                    DeviceResponseDto.fromEntity(updatedDevice)
                );
            }

            // Check device limit
            const deviceLimit = await this.checkDeviceLimit(userId);
            if (!deviceLimit.canAdd) {
                // Throw error instead of auto-removing device
                throw new DeviceLimitExceededException();
            }

            // Create new device
            const device = await this.createDevice(userId, deviceInfo);
            return new ResData<DeviceResponseDto>(
                DEVICE_SUCCESS_MESSAGES.DEVICE_REGISTERED,
                HttpStatus.CREATED,
                DeviceResponseDto.fromEntity(device)
            );

        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            throw new HttpException(
                'Failed to register device',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Validate device for user
     * Checks if device is authorized and active
     */
    async validateDevice(userId: number, deviceId: string): Promise<boolean> {
        try {
            const device = await this.deviceRepository.findByDeviceIdAndUserId(deviceId, userId);

            if (!device) {
                return false;
            }

            // Check if device is active
            if (!device.isActive) {
                return false;
            }

            // Check if device has expired
            if (device.expiresAt && device.expiresAt < new Date()) {
                // Deactivate expired device
                await this.deviceRepository.deactivateDevice(device.id);
                return false;
            }

            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get all devices for user
     */
    async getUserDevices(
        userId: number,
        includeInactive: boolean = false
    ): Promise<ResData<DeviceResponseDto[]>> {
        try {
            const devices = await this.deviceRepository.findByUserId(userId, includeInactive);
            const deviceDtos = DeviceResponseDto.fromEntities(devices);

            return new ResData<DeviceResponseDto[]>(
                'Devices retrieved successfully',
                HttpStatus.OK,
                deviceDtos
            );
        } catch (error) {
            throw new HttpException(
                'Failed to retrieve devices',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Remove device from user
     */
    async removeDevice(
        userId: number,
        deviceId: string
    ): Promise<ResData<DeviceResponseDto>> {
        try {
            const device = await this.deviceRepository.deleteByDeviceIdAndUserId(deviceId, userId);

            if (!device) {
                throw new HttpException(
                    DEVICE_ERROR_MESSAGES.DEVICE_NOT_FOUND,
                    HttpStatus.NOT_FOUND
                );
            }

            return new ResData<DeviceResponseDto>(
                DEVICE_SUCCESS_MESSAGES.DEVICE_REMOVED,
                HttpStatus.OK,
                DeviceResponseDto.fromEntity(device)
            );
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            throw new HttpException(
                'Failed to remove device',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Remove all devices for user
     */
    async removeAllDevices(userId: number): Promise<ResData<{ removedCount: number }>> {
        try {
            const removedCount = await this.deviceRepository.deleteAllByUserId(userId);

            return new ResData<{ removedCount: number }>(
                DEVICE_SUCCESS_MESSAGES.ALL_DEVICES_LOGGED_OUT,
                HttpStatus.OK,
                { removedCount }
            );
        } catch (error) {
            throw new HttpException(
                'Failed to remove all devices',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Update device information
     */
    async updateDevice(
        userId: number,
        deviceId: string,
        deviceInfo: Partial<DeviceInfoDto>
    ): Promise<ResData<DeviceResponseDto>> {
        try {
            const device = await this.deviceRepository.findByDeviceIdAndUserId(deviceId, userId);

            if (!device) {
                throw new HttpException(
                    DEVICE_ERROR_MESSAGES.DEVICE_NOT_FOUND,
                    HttpStatus.NOT_FOUND
                );
            }

            // Update device properties
            if (deviceInfo.deviceName) device.deviceName = deviceInfo.deviceName;
            if (deviceInfo.location) device.location = deviceInfo.location;
            if (deviceInfo.metadata) device.metadata = deviceInfo.metadata;
            if (deviceInfo.fcmToken !== undefined) device.fcmToken = deviceInfo.fcmToken; // Update FCM token

            const updatedDevice = await this.deviceRepository.update(device);

            return new ResData<DeviceResponseDto>(
                DEVICE_SUCCESS_MESSAGES.DEVICE_UPDATED,
                HttpStatus.OK,
                DeviceResponseDto.fromEntity(updatedDevice)
            );
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            throw new HttpException(
                'Failed to update device',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Refresh device session
     * Updates last login and extends expiry
     */
    async refreshDeviceSession(
        userId: number,
        deviceId: string
    ): Promise<ResData<DeviceResponseDto>> {
        try {
            const device = await this.deviceRepository.findByDeviceIdAndUserId(deviceId, userId);

            if (!device) {
                throw new HttpException(
                    DEVICE_ERROR_MESSAGES.DEVICE_NOT_FOUND,
                    HttpStatus.NOT_FOUND
                );
            }

            // Update last login
            device.lastLoginAt = new Date();

            // Extend expiry if set
            if (device.expiresAt) {
                const newExpiry = new Date();
                newExpiry.setDate(newExpiry.getDate() + DEVICE_SESSION_EXPIRY.DEFAULT_DAYS);
                device.expiresAt = newExpiry;
            }

            const updatedDevice = await this.deviceRepository.update(device);

            return new ResData<DeviceResponseDto>(
                'Device session refreshed successfully',
                HttpStatus.OK,
                DeviceResponseDto.fromEntity(updatedDevice)
            );
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            throw new HttpException(
                'Failed to refresh device session',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Check device limit for user
     */
    async checkDeviceLimit(userId: number): Promise<{
        current: number;
        max: number;
        canAdd: boolean;
    }> {
        try {
            const { data: user } = await this.userService.findOneById(userId);
            if (!user) {
                throw new HttpException('User not found', HttpStatus.NOT_FOUND);
            }

            const current = await this.deviceRepository.countActiveByUserId(userId);
            const max = user.maxDevices || DEFAULT_DEVICE_LIMITS[user.role];

            return {
                current,
                max,
                canAdd: current < max
            };
        } catch (error) {
            throw new HttpException(
                'Failed to check device limit',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Clean up expired devices
     */
    async cleanupExpiredDevices(beforeDate: Date): Promise<ResData<{ cleanedCount: number }>> {
        try {
            const expiredDevices = await this.deviceRepository.findExpiredDevices(beforeDate);
            let cleanedCount = 0;

            for (const device of expiredDevices) {
                await this.deviceRepository.deactivateDevice(device.id);
                cleanedCount++;
            }

            return new ResData<{ cleanedCount: number }>(
                `Cleaned up ${cleanedCount} expired devices`,
                HttpStatus.OK,
                { cleanedCount }
            );
        } catch (error) {
            throw new HttpException(
                'Failed to cleanup expired devices',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Clean up inactive devices
     */
    async cleanupInactiveDevices(beforeDate: Date): Promise<ResData<{ cleanedCount: number }>> {
        try {
            const inactiveDevices = await this.deviceRepository.findInactiveDevices(beforeDate);
            let cleanedCount = 0;

            for (const device of inactiveDevices) {
                await this.deviceRepository.deactivateDevice(device.id);
                cleanedCount++;
            }

            return new ResData<{ cleanedCount: number }>(
                `Cleaned up ${cleanedCount} inactive devices`,
                HttpStatus.OK,
                { cleanedCount }
            );
        } catch (error) {
            throw new HttpException(
                'Failed to cleanup inactive devices',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Get device statistics
     */
    async getDeviceStatistics(userId: number): Promise<{
        total: number;
        active: number;
        inactive: number;
        expired: number;
        byType: Record<string, number>;
    }> {
        try {
            const devices = await this.deviceRepository.findByUserId(userId, true);
            const now = new Date();

            const stats = {
                total: devices.length,
                active: devices.filter(d => d.isActive).length,
                inactive: devices.filter(d => !d.isActive).length,
                expired: devices.filter(d => d.expiresAt && d.expiresAt < now).length,
                byType: {} as Record<string, number>
            };

            // Count by device type
            devices.forEach(device => {
                stats.byType[device.deviceType] = (stats.byType[device.deviceType] || 0) + 1;
            });

            return stats;
        } catch (error) {
            throw new HttpException(
                'Failed to get device statistics',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Set device security level
     */
    async setDeviceSecurityLevel(
        userId: number,
        deviceId: string,
        securityLevel: 'low' | 'normal' | 'high'
    ): Promise<ResData<DeviceResponseDto>> {
        try {
            const device = await this.deviceRepository.findByDeviceIdAndUserId(deviceId, userId);

            if (!device) {
                throw new HttpException(
                    DEVICE_ERROR_MESSAGES.DEVICE_NOT_FOUND,
                    HttpStatus.NOT_FOUND
                );
            }

            device.securityLevel = securityLevel;
            const updatedDevice = await this.deviceRepository.update(device);

            return new ResData<DeviceResponseDto>(
                'Device security level updated successfully',
                HttpStatus.OK,
                DeviceResponseDto.fromEntity(updatedDevice)
            );
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            throw new HttpException(
                'Failed to set device security level',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Check if device management is enabled for user
     */
    async isDeviceManagementEnabled(userId: number): Promise<boolean> {
        try {
            const { data: user } = await this.userService.findOneById(userId);
            return user?.deviceManagementEnabled || false;
        } catch (error) {
            return false;
        }
    }

    /**
     * Enable device management for user
     */
    async enableDeviceManagement(userId: number): Promise<ResData<boolean>> {
        try {
            const { data: user } = await this.userService.findOneById(userId);
            if (!user) {
                throw new HttpException('User not found', HttpStatus.NOT_FOUND);
            }

            // Set default device limit based on role if not set
            if (!user.maxDevices) {
                user.maxDevices = DEFAULT_DEVICE_LIMITS[user.role];
            }

            user.deviceManagementEnabled = true;
            await this.userService.updateUser(userId, { deviceManagementEnabled: true });

            return new ResData<boolean>(
                'Device management enabled successfully',
                HttpStatus.OK,
                true
            );
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            throw new HttpException(
                'Failed to enable device management',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Disable device management for user
     */
    async disableDeviceManagement(userId: number): Promise<ResData<boolean>> {
        try {
            const { data: user } = await this.userService.findOneById(userId);
            if (!user) {
                throw new HttpException('User not found', HttpStatus.NOT_FOUND);
            }

            user.deviceManagementEnabled = false;
            await this.userService.updateUser(userId, { deviceManagementEnabled: false });

            return new ResData<boolean>(
                'Device management disabled successfully',
                HttpStatus.OK,
                false
            );
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            throw new HttpException(
                'Failed to disable device management',
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }

    /**
     * Create a new device entity
     * Private helper method
     */
    private async createDevice(userId: number, deviceInfo: DeviceInfoDto): Promise<UserDevice> {
        const device = new UserDevice();
        device.deviceId = deviceInfo.deviceId;
        device.deviceName = deviceInfo.deviceName;
        device.deviceType = deviceInfo.deviceType as 'mobile' | 'tablet' | 'desktop' | 'web';
        device.osName = deviceInfo.osName;
        device.osVersion = deviceInfo.osVersion;
        device.browserName = deviceInfo.browserName;
        device.browserVersion = deviceInfo.browserVersion;
        device.ipAddress = deviceInfo.ipAddress;
        device.userAgent = deviceInfo.userAgent;
        device.location = deviceInfo.location;
        device.metadata = deviceInfo.metadata;
        device.fcmToken = deviceInfo.fcmToken; // Save FCM token
        device.userId = userId;
        device.isActive = true;
        device.lastLoginAt = new Date();
        device.securityLevel = 'normal';

        // Set expiry date
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + DEVICE_SESSION_EXPIRY.DEFAULT_DAYS);
        device.expiresAt = expiryDate;

        return await this.deviceRepository.create(device);
    }

    /**
     * Remove oldest device to make room for new device
     * Private helper method
     */
    private async removeOldestDevice(userId: number): Promise<void> {
        const oldestDevice = await this.deviceRepository.findOldestByUserId(userId);
        if (oldestDevice) {
            await this.deviceRepository.delete(oldestDevice.id);
        }
    }
}
