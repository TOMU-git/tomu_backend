import { RoleEnum } from 'src/common/enums/enum';

/**
 * Device Management Constants
 * 
 * Centralized configuration for device management
 * Easy to modify limits and settings
 */

/**
 * Default device limits per user role
 * These limits are applied when user is created
 */
export const DEFAULT_DEVICE_LIMITS: Record<RoleEnum, number> = {
    [RoleEnum.STUDENT]: 2,    // Students: 2 devices
    [RoleEnum.TEACHER]: 3,    // Teachers: 3 devices
    [RoleEnum.ADMIN]: 5,      // Admins: 5 devices
    [RoleEnum.DIRECTOR]: 10,  // Directors: 10 devices
};

/**
 * Device session expiry settings
 * After this time, device becomes inactive
 */
export const DEVICE_SESSION_EXPIRY = {
    DEFAULT_DAYS: 30,        // Default session length
    MAX_DAYS: 90,           // Maximum allowed session length
    MIN_DAYS: 1,            // Minimum session length
    CLEANUP_INTERVAL_HOURS: 24, // How often to clean up expired devices
} as const;

/**
 * Device security levels
 * Used for risk assessment and device management
 */
export const DEVICE_SECURITY_LEVELS = {
    LOW: 'low',       // Suspicious activity detected
    NORMAL: 'normal', // Standard device
    HIGH: 'high',     // Trusted device (e.g., company device)
} as const;

/**
 * Device types supported by the system
 */
export const DEVICE_TYPES = {
    MOBILE: 'mobile',
    TABLET: 'tablet',
    DESKTOP: 'desktop',
    WEB: 'web',
} as const;

/**
 * Device validation rules
 */
export const DEVICE_VALIDATION = {
    DEVICE_ID_LENGTH: 36,        // UUID length
    DEVICE_NAME_MAX_LENGTH: 255,
    OS_NAME_MAX_LENGTH: 100,
    BROWSER_NAME_MAX_LENGTH: 100,
    IP_ADDRESS_MAX_LENGTH: 45,   // IPv6 max length
    USER_AGENT_MAX_LENGTH: 1000, // Reasonable limit
    LOCATION_MAX_LENGTH: 255,
} as const;

/**
 * Device cleanup settings
 */
export const DEVICE_CLEANUP = {
    INACTIVE_DAYS: 60,           // Remove devices inactive for 60 days
    BATCH_SIZE: 100,             // Process 100 devices at a time
    MAX_RETRIES: 3,              // Max retries for cleanup operations
} as const;

/**
 * Device fingerprinting settings
 */
export const DEVICE_FINGERPRINT = {
    REQUIRED_FIELDS: [
        'deviceId',
        'deviceName',
        'deviceType',
        'osName',
        'userAgent',
        'ipAddress'
    ],
    OPTIONAL_FIELDS: [
        'osVersion',
        'browserName',
        'browserVersion',
        'location',
        'metadata'
    ],
} as const;

/**
 * Error messages for device management
 */
export const DEVICE_ERROR_MESSAGES = {
    DEVICE_LIMIT_EXCEEDED: 'Device limit exceeded. Please remove an existing device to add a new one.',
    DEVICE_NOT_FOUND: 'Device not found or access denied.',
    DEVICE_EXPIRED: 'Device session has expired. Please log in again.',
    INVALID_DEVICE: 'Invalid device information provided.',
    DEVICE_ALREADY_EXISTS: 'Device is already registered for this user.',
    DEVICE_MANAGEMENT_DISABLED: 'Device management is not enabled for this user.',
    UNAUTHORIZED_DEVICE: 'This device is not authorized for this user.',
} as const;

/**
 * Success messages for device management
 */
export const DEVICE_SUCCESS_MESSAGES = {
    DEVICE_REGISTERED: 'Device registered successfully.',
    DEVICE_REMOVED: 'Device removed successfully.',
    DEVICE_UPDATED: 'Device updated successfully.',
    DEVICE_ACTIVATED: 'Device activated successfully.',
    DEVICE_DEACTIVATED: 'Device deactivated successfully.',
    ALL_DEVICES_LOGGED_OUT: 'All devices logged out successfully.',
} as const;
