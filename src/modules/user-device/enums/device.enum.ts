/**
 * Device Management Enums
 * 
 * Centralized enums for device management
 * Provides type safety and consistency
 */

/**
 * Device types supported by the system
 */
export enum DeviceType {
    MOBILE = 'mobile',
    TABLET = 'tablet',
    DESKTOP = 'desktop',
    WEB = 'web',
}

/**
 * Device security levels
 * Used for risk assessment and device management
 */
export enum DeviceSecurityLevel {
    LOW = 'low',       // Suspicious activity detected
    NORMAL = 'normal', // Standard device
    HIGH = 'high',     // Trusted device (e.g., company device)
}

/**
 * Device status for management
 */
export enum DeviceStatus {
    ACTIVE = 'active',           // Device is active and can be used
    INACTIVE = 'inactive',       // Device is inactive (blocked)
    EXPIRED = 'expired',         // Device session has expired
    SUSPENDED = 'suspended',     // Device is suspended by admin
    PENDING = 'pending',         // Device is pending approval
}

/**
 * Device management actions
 */
export enum DeviceAction {
    REGISTER = 'register',       // Register new device
    ACTIVATE = 'activate',       // Activate device
    DEACTIVATE = 'deactivate',   // Deactivate device
    REMOVE = 'remove',           // Remove device
    UPDATE = 'update',           // Update device info
    REFRESH = 'refresh',         // Refresh device session
}

/**
 * Device cleanup reasons
 */
export enum DeviceCleanupReason {
    EXPIRED = 'expired',         // Device session expired
    INACTIVE = 'inactive',       // Device inactive too long
    USER_REQUEST = 'user_request', // User requested removal
    ADMIN_ACTION = 'admin_action', // Admin removed device
    SECURITY = 'security',       // Security concern
    SYSTEM = 'system',           // System cleanup
}

/**
 * Device validation results
 */
export enum DeviceValidationResult {
    VALID = 'valid',             // Device is valid
    INVALID = 'invalid',         // Device is invalid
    EXPIRED = 'expired',         // Device has expired
    BLOCKED = 'blocked',         // Device is blocked
    NOT_FOUND = 'not_found',     // Device not found
    UNAUTHORIZED = 'unauthorized', // Device not authorized
}

/**
 * Device fingerprint components
 */
export enum DeviceFingerprintComponent {
    DEVICE_ID = 'device_id',
    USER_AGENT = 'user_agent',
    IP_ADDRESS = 'ip_address',
    SCREEN_RESOLUTION = 'screen_resolution',
    TIMEZONE = 'timezone',
    LANGUAGE = 'language',
    PLATFORM = 'platform',
    HARDWARE = 'hardware',
}
