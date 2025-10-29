import { UserDevice } from '../entities/user-device.entity';

/**
 * Device Repository Interface
 * 
 * Defines contract for device data access operations
 * Follows Repository pattern for clean architecture
 */
export interface IDeviceRepository {
    /**
     * Create a new device record
     * @param entity Device entity to create
     * @returns Created device entity
     */
    create(entity: UserDevice): Promise<UserDevice>;

    /**
     * Find device by ID
     * @param id Device ID
     * @returns Device entity or null
     */
    findById(id: number): Promise<UserDevice | null>;

    /**
     * Find device by device ID and user ID
     * @param deviceId Unique device identifier
     * @param userId User ID
     * @returns Device entity or null
     */
    findByDeviceIdAndUserId(deviceId: string, userId: number): Promise<UserDevice | null>;

    /**
     * Find all devices for a user
     * @param userId User ID
     * @param includeInactive Include inactive devices
     * @returns Array of device entities
     */
    findByUserId(userId: number, includeInactive?: boolean): Promise<UserDevice[]>;

    /**
     * Find active devices for a user
     * @param userId User ID
     * @returns Array of active device entities
     */
    findActiveByUserId(userId: number): Promise<UserDevice[]>;

    /**
     * Count active devices for a user
     * @param userId User ID
     * @returns Number of active devices
     */
    countActiveByUserId(userId: number): Promise<number>;

    /**
     * Find oldest device for a user
     * @param userId User ID
     * @returns Oldest device entity or null
     */
    findOldestByUserId(userId: number): Promise<UserDevice | null>;

    /**
     * Update device entity
     * @param entity Device entity to update
     * @returns Updated device entity
     */
    update(entity: UserDevice): Promise<UserDevice>;

    /**
     * Delete device by ID
     * @param id Device ID
     * @returns Deleted device entity or null
     */
    delete(id: number): Promise<UserDevice | null>;

    /**
     * Delete device by device ID and user ID
     * @param deviceId Unique device identifier
     * @param userId User ID
     * @returns Deleted device entity or null
     */
    deleteByDeviceIdAndUserId(deviceId: string, userId: number): Promise<UserDevice | null>;

    /**
     * Delete all devices for a user
     * @param userId User ID
     * @returns Number of deleted devices
     */
    deleteAllByUserId(userId: number): Promise<number>;

    /**
     * Find expired devices
     * @param beforeDate Date before which devices are considered expired
     * @returns Array of expired device entities
     */
    findExpiredDevices(beforeDate: Date): Promise<UserDevice[]>;

    /**
     * Find inactive devices
     * @param beforeDate Date before which devices are considered inactive
     * @returns Array of inactive device entities
     */
    findInactiveDevices(beforeDate: Date): Promise<UserDevice[]>;

    /**
     * Update last login timestamp for device
     * @param deviceId Device ID
     * @param loginTime Login timestamp
     * @returns Updated device entity or null
     */
    updateLastLogin(deviceId: number, loginTime: Date): Promise<UserDevice | null>;

    /**
     * Deactivate device
     * @param deviceId Device ID
     * @returns Updated device entity or null
     */
    deactivateDevice(deviceId: number): Promise<UserDevice | null>;

    /**
     * Activate device
     * @param deviceId Device ID
     * @returns Updated device entity or null
     */
    activateDevice(deviceId: number): Promise<UserDevice | null>;

    /**
     * Check if device exists for user
     * @param deviceId Unique device identifier
     * @param userId User ID
     * @returns True if device exists, false otherwise
     */
    existsByDeviceIdAndUserId(deviceId: string, userId: number): Promise<boolean>;
}
