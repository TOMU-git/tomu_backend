import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { UserDevice } from '../entities/user-device.entity';
import { IDeviceRepository } from '../interfaces/device.repository';

/**
 * Device Repository Implementation
 * 
 * Implements device data access operations
 * Uses TypeORM for database operations
 * Follows Repository pattern for clean architecture
 */
@Injectable()
export class DeviceRepository implements IDeviceRepository {
    constructor(
        @InjectRepository(UserDevice)
        private readonly deviceRepository: Repository<UserDevice>,
    ) { }

    /**
     * Create a new device record
     */
    async create(entity: UserDevice): Promise<UserDevice> {
        return await this.deviceRepository.save(entity);
    }

    /**
     * Find device by ID
     */
    async findById(id: number): Promise<UserDevice | null> {
        return await this.deviceRepository.findOne({
            where: { id },
            relations: ['user'],
        });
    }

    /**
     * Find device by device ID and user ID
     */
    async findByDeviceIdAndUserId(deviceId: string, userId: number): Promise<UserDevice | null> {
        return await this.deviceRepository.findOne({
            where: { deviceId, userId },
            relations: ['user'],
        });
    }

    /**
     * Find all devices for a user
     */
    async findByUserId(userId: number, includeInactive: boolean = true): Promise<UserDevice[]> {
        const query = this.deviceRepository
            .createQueryBuilder('device')
            .where('device.userId = :userId', { userId })
            .orderBy('device.lastLoginAt', 'DESC');

        if (!includeInactive) {
            query.andWhere('device.isActive = :isActive', { isActive: true });
        }

        return await query.getMany();
    }

    /**
     * Find active devices for a user
     */
    async findActiveByUserId(userId: number): Promise<UserDevice[]> {
        return await this.deviceRepository.find({
            where: {
                userId,
                isActive: true
            },
            order: { lastLoginAt: 'DESC' },
        });
    }

    /**
     * Count active devices for a user
     */
    async countActiveByUserId(userId: number): Promise<number> {
        return await this.deviceRepository.count({
            where: {
                userId,
                isActive: true
            },
        });
    }

    /**
     * Find oldest device for a user
     */
    async findOldestByUserId(userId: number): Promise<UserDevice | null> {
        return await this.deviceRepository.findOne({
            where: {
                userId,
                isActive: true
            },
            order: { lastLoginAt: 'ASC' },
        });
    }

    /**
     * Update device entity
     */
    async update(entity: UserDevice): Promise<UserDevice> {
        return await this.deviceRepository.save(entity);
    }

    /**
     * Delete device by ID
     */
    async delete(id: number): Promise<UserDevice | null> {
        const device = await this.findById(id);
        if (device) {
            await this.deviceRepository.remove(device);
        }
        return device;
    }

    /**
     * Delete device by device ID and user ID
     */
    async deleteByDeviceIdAndUserId(deviceId: string, userId: number): Promise<UserDevice | null> {
        const device = await this.findByDeviceIdAndUserId(deviceId, userId);
        if (device) {
            await this.deviceRepository.remove(device);
        }
        return device;
    }

    /**
     * Delete all devices for a user
     */
    async deleteAllByUserId(userId: number): Promise<number> {
        const result = await this.deviceRepository.delete({ userId });
        return result.affected || 0;
    }

    /**
     * Find expired devices
     */
    async findExpiredDevices(beforeDate: Date): Promise<UserDevice[]> {
        return await this.deviceRepository.find({
            where: {
                expiresAt: LessThan(beforeDate),
                isActive: true,
            },
        });
    }

    /**
     * Find inactive devices
     */
    async findInactiveDevices(beforeDate: Date): Promise<UserDevice[]> {
        return await this.deviceRepository.find({
            where: {
                lastLoginAt: LessThan(beforeDate),
                isActive: true,
            },
        });
    }

    /**
     * Update last login timestamp for device
     */
    async updateLastLogin(deviceId: number, loginTime: Date): Promise<UserDevice | null> {
        const device = await this.findById(deviceId);
        if (device) {
            device.lastLoginAt = loginTime;
            return await this.update(device);
        }
        return null;
    }

    /**
     * Deactivate device
     */
    async deactivateDevice(deviceId: number): Promise<UserDevice | null> {
        const device = await this.findById(deviceId);
        if (device) {
            device.isActive = false;
            return await this.update(device);
        }
        return null;
    }

    /**
     * Activate device
     */
    async activateDevice(deviceId: number): Promise<UserDevice | null> {
        const device = await this.findById(deviceId);
        if (device) {
            device.isActive = true;
            return await this.update(device);
        }
        return null;
    }

    /**
     * Check if device exists for user
     */
    async existsByDeviceIdAndUserId(deviceId: string, userId: number): Promise<boolean> {
        const count = await this.deviceRepository.count({
            where: { deviceId, userId },
        });
        return count > 0;
    }
}
