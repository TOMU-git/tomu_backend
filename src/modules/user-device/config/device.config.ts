import { config } from 'src/common/config';

/**
 * Device Management Configuration
 * 
 * Centralized configuration for device management
 * Environment-based settings for different deployment stages
 */
export const deviceConfig = {
    /**
     * Device limits per role
     * Can be overridden by environment variables
     */
    limits: {
        STUDENT: parseInt(process.env.DEVICE_LIMIT_STUDENT || '2'),
        TEACHER: parseInt(process.env.DEVICE_LIMIT_TEACHER || '3'),
        ADMIN: parseInt(process.env.DEVICE_LIMIT_ADMIN || '5'),
        DIRECTOR: parseInt(process.env.DEVICE_LIMIT_DIRECTOR || '10'),
    },

    /**
     * Device session settings
     */
    session: {
        defaultExpiryDays: parseInt(process.env.DEVICE_SESSION_EXPIRY_DAYS || '30'),
        maxExpiryDays: parseInt(process.env.DEVICE_MAX_EXPIRY_DAYS || '90'),
        minExpiryDays: parseInt(process.env.DEVICE_MIN_EXPIRY_DAYS || '1'),
    },

    /**
     * Device cleanup settings
     */
    cleanup: {
        inactiveDays: parseInt(process.env.DEVICE_INACTIVE_DAYS || '60'),
        expiredDays: parseInt(process.env.DEVICE_EXPIRED_DAYS || '30'),
        batchSize: parseInt(process.env.DEVICE_CLEANUP_BATCH_SIZE || '100'),
        intervalHours: parseInt(process.env.DEVICE_CLEANUP_INTERVAL_HOURS || '24'),
    },

    /**
     * Security settings
     */
    security: {
        enableFingerprinting: process.env.DEVICE_ENABLE_FINGERPRINTING === 'true',
        enableLocationTracking: process.env.DEVICE_ENABLE_LOCATION === 'true',
        enableIPValidation: process.env.DEVICE_ENABLE_IP_VALIDATION === 'true',
        maxFailedAttempts: parseInt(process.env.DEVICE_MAX_FAILED_ATTEMPTS || '5'),
        lockoutDurationMinutes: parseInt(process.env.DEVICE_LOCKOUT_DURATION_MINUTES || '30'),
    },

    /**
     * Feature flags
     */
    features: {
        enableDeviceManagement: process.env.ENABLE_DEVICE_MANAGEMENT === 'true',
        enableDeviceLimits: process.env.ENABLE_DEVICE_LIMITS === 'true',
        enableDeviceCleanup: process.env.ENABLE_DEVICE_CLEANUP === 'true',
        enableDeviceAnalytics: process.env.ENABLE_DEVICE_ANALYTICS === 'true',
        enableDeviceSecurity: process.env.ENABLE_DEVICE_SECURITY === 'true',
    },

    /**
     * API settings
     */
    api: {
        enableV1Endpoints: process.env.ENABLE_DEVICE_V1_ENDPOINTS !== 'false',
        enableV2Endpoints: process.env.ENABLE_DEVICE_V2_ENDPOINTS !== 'false',
        enableDeviceSupportEndpoint: process.env.ENABLE_DEVICE_SUPPORT_ENDPOINT !== 'false',
    },

    /**
     * Database settings
     */
    database: {
        enableIndexes: process.env.DEVICE_ENABLE_DB_INDEXES !== 'false',
        enableConstraints: process.env.DEVICE_ENABLE_DB_CONSTRAINTS !== 'false',
        enableTriggers: process.env.DEVICE_ENABLE_DB_TRIGGERS !== 'false',
    },

    /**
     * Monitoring settings
     */
    monitoring: {
        enableMetrics: process.env.DEVICE_ENABLE_METRICS === 'true',
        enableLogging: process.env.DEVICE_ENABLE_LOGGING === 'true',
        logLevel: process.env.DEVICE_LOG_LEVEL || 'info',
        enableAlerts: process.env.DEVICE_ENABLE_ALERTS === 'true',
    },

    /**
     * Rate limiting
     */
    rateLimit: {
        deviceRegistration: parseInt(process.env.DEVICE_REGISTRATION_RATE_LIMIT || '5'),
        deviceRemoval: parseInt(process.env.DEVICE_REMOVAL_RATE_LIMIT || '10'),
        deviceList: parseInt(process.env.DEVICE_LIST_RATE_LIMIT || '30'),
        windowMs: parseInt(process.env.DEVICE_RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    },

    /**
     * Validation settings
     */
    validation: {
        deviceIdLength: parseInt(process.env.DEVICE_ID_LENGTH || '36'),
        deviceNameMaxLength: parseInt(process.env.DEVICE_NAME_MAX_LENGTH || '255'),
        userAgentMaxLength: parseInt(process.env.DEVICE_USER_AGENT_MAX_LENGTH || '1000'),
        ipAddressMaxLength: parseInt(process.env.DEVICE_IP_MAX_LENGTH || '45'),
        locationMaxLength: parseInt(process.env.DEVICE_LOCATION_MAX_LENGTH || '255'),
    },

    /**
     * Get device limit for role
     */
    getDeviceLimitForRole(role: string): number {
        return this.limits[role as keyof typeof this.limits] || this.limits.STUDENT;
    },

    /**
     * Check if feature is enabled
     */
    isFeatureEnabled(feature: keyof typeof this.features): boolean {
        return this.features[feature];
    },

    /**
     * Check if API endpoint is enabled
     */
    isApiEnabled(api: keyof typeof this.api): boolean {
        return this.api[api];
    },

    /**
     * Get security setting
     */
    getSecuritySetting(setting: keyof typeof this.security): any {
        return this.security[setting];
    },

    /**
     * Get cleanup setting
     */
    getCleanupSetting(setting: keyof typeof this.cleanup): number {
        return this.cleanup[setting];
    },

    /**
     * Get session setting
     */
    getSessionSetting(setting: keyof typeof this.session): number {
        return this.session[setting];
    },

    /**
     * Get validation setting
     */
    getValidationSetting(setting: keyof typeof this.validation): number {
        return this.validation[setting];
    },

    /**
     * Get rate limit setting
     */
    getRateLimitSetting(setting: keyof typeof this.rateLimit): number {
        return this.rateLimit[setting];
    },
};

/**
 * Environment-specific configurations
 */
export const getEnvironmentConfig = () => {
    const env = process.env.NODE_ENV || 'development';

    switch (env) {
        case 'production':
            return {
                ...deviceConfig,
                features: {
                    ...deviceConfig.features,
                    enableDeviceManagement: true,
                    enableDeviceLimits: true,
                    enableDeviceCleanup: true,
                    enableDeviceAnalytics: true,
                    enableDeviceSecurity: true,
                },
                security: {
                    ...deviceConfig.security,
                    enableFingerprinting: true,
                    enableLocationTracking: false, // Disable in production for privacy
                    enableIPValidation: true,
                },
                monitoring: {
                    ...deviceConfig.monitoring,
                    enableMetrics: true,
                    enableLogging: true,
                    enableAlerts: true,
                },
            };

        case 'staging':
            return {
                ...deviceConfig,
                features: {
                    ...deviceConfig.features,
                    enableDeviceManagement: true,
                    enableDeviceLimits: true,
                    enableDeviceCleanup: false, // Disable cleanup in staging
                    enableDeviceAnalytics: true,
                    enableDeviceSecurity: true,
                },
                security: {
                    ...deviceConfig.security,
                    enableFingerprinting: true,
                    enableLocationTracking: false,
                    enableIPValidation: false, // Disable in staging
                },
            };

        case 'development':
        default:
            return {
                ...deviceConfig,
                features: {
                    ...deviceConfig.features,
                    enableDeviceManagement: true,
                    enableDeviceLimits: false, // Disable limits in development
                    enableDeviceCleanup: false,
                    enableDeviceAnalytics: false,
                    enableDeviceSecurity: false,
                },
                security: {
                    ...deviceConfig.security,
                    enableFingerprinting: false,
                    enableLocationTracking: false,
                    enableIPValidation: false,
                },
                monitoring: {
                    ...deviceConfig.monitoring,
                    enableMetrics: false,
                    enableLogging: true,
                    enableAlerts: false,
                },
            };
    }
};

export const environmentConfig = getEnvironmentConfig();
