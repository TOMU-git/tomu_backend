import { Injectable, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { IDeviceService } from '../interfaces/device.service';
import { environmentConfig } from '../config/device.config';

/**
 * Device Cleanup Service
 * 
 * Handles automatic cleanup of expired and inactive devices
 * Runs on a schedule to maintain database performance
 */
@Injectable()
export class DeviceCleanupService {
    constructor(
        @Inject('IDeviceService')
        private readonly deviceService: IDeviceService,
    ) { }

    /**
     * Cleanup expired devices
     * Runs every hour
     */
    @Cron(CronExpression.EVERY_HOUR)
    async cleanupExpiredDevices(): Promise<void> {
        if (!environmentConfig.features.enableDeviceCleanup) {
            return;
        }

        try {
            const beforeDate = new Date();
            beforeDate.setDate(beforeDate.getDate() - environmentConfig.getCleanupSetting('expiredDays'));

            const result = await this.deviceService.cleanupExpiredDevices(beforeDate);

            if (environmentConfig.monitoring.enableLogging) {
                console.log(`🧹 Device Cleanup: Removed ${result.data.cleanedCount} expired devices`);
            }
        } catch (error) {
            console.error('❌ Device Cleanup Error (Expired):', error);
        }
    }

    /**
     * Cleanup inactive devices
     * Runs every 6 hours
     */
    @Cron(CronExpression.EVERY_6_HOURS)
    async cleanupInactiveDevices(): Promise<void> {
        if (!environmentConfig.features.enableDeviceCleanup) {
            return;
        }

        try {
            const beforeDate = new Date();
            beforeDate.setDate(beforeDate.getDate() - environmentConfig.getCleanupSetting('inactiveDays'));

            const result = await this.deviceService.cleanupInactiveDevices(beforeDate);

            if (environmentConfig.monitoring.enableLogging) {
                console.log(`🧹 Device Cleanup: Removed ${result.data.cleanedCount} inactive devices`);
            }
        } catch (error) {
            console.error('❌ Device Cleanup Error (Inactive):', error);
        }
    }

    /**
     * Manual cleanup of all expired and inactive devices
     * Can be called via API or admin interface
     */
    async manualCleanup(): Promise<{
        expired: number;
        inactive: number;
        total: number;
    }> {
        if (!environmentConfig.features.enableDeviceCleanup) {
            throw new Error('Device cleanup is disabled');
        }

        try {
            const now = new Date();
            const expiredDate = new Date();
            expiredDate.setDate(now.getDate() - environmentConfig.getCleanupSetting('expiredDays'));

            const inactiveDate = new Date();
            inactiveDate.setDate(now.getDate() - environmentConfig.getCleanupSetting('inactiveDays'));

            const [expiredResult, inactiveResult] = await Promise.all([
                this.deviceService.cleanupExpiredDevices(expiredDate),
                this.deviceService.cleanupInactiveDevices(inactiveDate),
            ]);

            const total = expiredResult.data.cleanedCount + inactiveResult.data.cleanedCount;

            if (environmentConfig.monitoring.enableLogging) {
                console.log(`🧹 Manual Device Cleanup: Removed ${total} devices (${expiredResult.data.cleanedCount} expired, ${inactiveResult.data.cleanedCount} inactive)`);
            }

            return {
                expired: expiredResult.data.cleanedCount,
                inactive: inactiveResult.data.cleanedCount,
                total,
            };
        } catch (error) {
            console.error('❌ Manual Device Cleanup Error:', error);
            throw error;
        }
    }

    /**
     * Get cleanup statistics
     * Returns information about devices that would be cleaned up
     */
    async getCleanupStats(): Promise<{
        expired: number;
        inactive: number;
        total: number;
        nextCleanup: Date;
    }> {
        try {
            const now = new Date();
            const expiredDate = new Date();
            expiredDate.setDate(now.getDate() - environmentConfig.getCleanupSetting('expiredDays'));

            const inactiveDate = new Date();
            inactiveDate.setDate(now.getDate() - environmentConfig.getCleanupSetting('inactiveDays'));

            // Note: This would require additional methods in DeviceService
            // For now, return estimated values
            const expired = 0; // Would need to implement countExpiredDevices
            const inactive = 0; // Would need to implement countInactiveDevices
            const total = expired + inactive;

            // Calculate next cleanup time (next hour)
            const nextCleanup = new Date();
            nextCleanup.setHours(nextCleanup.getHours() + 1, 0, 0, 0);

            return {
                expired,
                inactive,
                total,
                nextCleanup,
            };
        } catch (error) {
            console.error('❌ Get Cleanup Stats Error:', error);
            throw error;
        }
    }
}
