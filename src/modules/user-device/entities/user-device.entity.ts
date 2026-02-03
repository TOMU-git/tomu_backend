import { BaseEntity } from 'src/common/database/baseEntity';
import { Column, Entity, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from 'src/modules/user/entities/user.entity';

/**
 * UserDevice Entity
 * 
 * Manages user device sessions and limits
 * - Tracks active devices per user
 * - Enforces device limits based on user role
 * - Provides device management capabilities
 * 
 * Security considerations:
 * - Device fingerprinting for unique identification
 * - IP address tracking for security
 * - Session expiry management
 * - Automatic cleanup of inactive devices
 */
@Entity('user_devices')
@Index(['userId', 'deviceId'], { unique: true }) // Prevent duplicate devices
@Index(['userId', 'isActive']) // Optimize active device queries
@Index(['expiresAt']) // Optimize cleanup queries
export class UserDevice extends BaseEntity {
    /**
     * Unique device identifier
     * Generated from device fingerprint (hardware + software)
     * Format: UUID v4
     */
    @Column({
        name: 'device_id',
        type: 'varchar',
        length: 36,
        comment: 'Unique device identifier (UUID)'
    })
    deviceId: string;

    /**
     * Human-readable device name
     * Examples: "iPhone 15 Pro", "Samsung Galaxy S24", "MacBook Pro"
     */
    @Column({
        name: 'device_name',
        type: 'varchar',
        length: 255,
        comment: 'Human-readable device name'
    })
    deviceName: string;

    /**
     * Device type category
     * Used for analytics and device management
     */
    @Column({
        name: 'device_type',
        type: 'varchar',
        length: 50,
        comment: 'Device type: mobile, tablet, desktop, web'
    })
    deviceType: 'mobile' | 'tablet' | 'desktop' | 'web';

    /**
     * Operating system name
     * Examples: "iOS", "Android", "Windows", "macOS", "Linux"
     */
    @Column({
        name: 'os_name',
        type: 'varchar',
        length: 100,
        comment: 'Operating system name'
    })
    osName: string;

    /**
     * Operating system version
     * Examples: "17.2.1", "14", "Windows 11"
     */
    @Column({
        name: 'os_version',
        type: 'varchar',
        length: 50,
        nullable: true,
        comment: 'Operating system version'
    })
    osVersion: string;

    /**
     * Browser name (for web devices)
     * Examples: "Chrome", "Safari", "Firefox", "Edge"
     */
    @Column({
        name: 'browser_name',
        type: 'varchar',
        length: 100,
        nullable: true,
        comment: 'Browser name for web devices'
    })
    browserName: string;

    /**
     * Browser version
     * Examples: "120.0.6099.109", "17.2.1"
     */
    @Column({
        name: 'browser_version',
        type: 'varchar',
        length: 50,
        nullable: true,
        comment: 'Browser version'
    })
    browserVersion: string;

    /**
     * Device IP address
     * Used for security monitoring and geolocation
     * Supports both IPv4 and IPv6
     */
    @Column({
        name: 'ip_address',
        type: 'varchar',
        length: 45,
        comment: 'Device IP address (IPv4/IPv6)'
    })
    ipAddress: string;

    /**
     * Full user agent string
     * Used for device fingerprinting and debugging
     */
    @Column({
        name: 'user_agent',
        type: 'text',
        comment: 'Full user agent string'
    })
    userAgent: string;

    /**
     * Device location (if available)
     * Format: "City, Country" or "Country"
     */
    @Column({
        name: 'location',
        type: 'varchar',
        length: 255,
        nullable: true,
        comment: 'Device location (City, Country)'
    })
    location: string;

    /**
     * Device activity status
     * true = Active device (can be used for login)
     * false = Inactive device (blocked from login)
     */
    @Column({
        name: 'is_active',
        type: 'boolean',
        default: true,
        comment: 'Device activity status'
    })
    isActive: boolean;

    /**
     * Last login timestamp
     * Updated on each successful login
     * Used for device cleanup and analytics
     */
    @Column({
        name: 'last_login_at',
        type: 'timestamp',
        comment: 'Last successful login timestamp'
    })
    lastLoginAt: Date;

    /**
     * Device session expiry
     * After this time, device becomes inactive
     * null = Never expires (until manually removed)
     */
    @Column({
        name: 'expires_at',
        type: 'timestamp',
        nullable: true,
        comment: 'Device session expiry timestamp'
    })
    expiresAt: Date;

    /**
     * Device security level
     * Used for risk assessment and device management
     */
    @Column({
        name: 'security_level',
        type: 'varchar',
        length: 20,
        default: 'normal',
        comment: 'Device security level: low, normal, high'
    })
    securityLevel: 'low' | 'normal' | 'high';

    /**
     * Additional device metadata
     * JSON format for extensibility
     * Examples: screen resolution, timezone, language
     */
    @Column({
        name: 'metadata',
        type: 'json',
        nullable: true,
        comment: 'Additional device metadata (JSON)'
    })
    metadata: Record<string, any>;

    /**
     * Firebase Cloud Messaging (FCM) token
     * Used for sending push notifications to the device
     * Token can change, so it's updated on each device registration/login
     */
    @Column({
        name: 'fcm_token',
        type: 'varchar',
        length: 500,
        nullable: true,
        comment: 'Firebase Cloud Messaging token for push notifications'
    })
    fcmToken: string;

    /**
     * User relationship
     * Many devices belong to one user
     */
    @ManyToOne(() => User, user => user.devices, {
        onDelete: 'CASCADE', // Remove devices when user is deleted
        onUpdate: 'CASCADE'  // Update user_id when user.id changes
    })
    @JoinColumn({ name: 'user_id' })
    user: User;

    /**
     * User ID foreign key
     * References users.id
     */
    @Column({
        name: 'user_id',
        type: 'int',
        comment: 'User ID foreign key'
    })
    userId: number;
}
