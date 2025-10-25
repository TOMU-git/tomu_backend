import { DeviceInfoDto } from '../dto/device-info.dto';
import { DeviceType } from '../enums/device.enum';

/**
 * Device Utilities
 * 
 * Utility functions for device management
 * Used by both frontend and backend
 */

/**
 * Generate a unique device ID
 * Uses UUID v4 format
 */
export const generateDeviceId = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

/**
 * Extract device name from user agent
 */
export const getDeviceName = (userAgent: string): string => {
    if (userAgent.includes('iPhone')) return 'iPhone';
    if (userAgent.includes('iPad')) return 'iPad';
    if (userAgent.includes('Android')) return 'Android Device';
    if (userAgent.includes('Windows')) return 'Windows PC';
    if (userAgent.includes('Mac')) return 'Mac';
    if (userAgent.includes('Linux')) return 'Linux PC';
    return 'Unknown Device';
};

/**
 * Determine device type from user agent
 */
export const getDeviceType = (userAgent: string): DeviceType => {
    if (userAgent.includes('Mobile')) return DeviceType.MOBILE;
    if (userAgent.includes('iPad') || userAgent.includes('Tablet')) return DeviceType.TABLET;
    if (userAgent.includes('Windows') || userAgent.includes('Mac') || userAgent.includes('Linux')) {
        return DeviceType.DESKTOP;
    }
    return DeviceType.WEB;
};

/**
 * Extract operating system name from user agent
 */
export const getOSName = (userAgent: string): string => {
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('Linux')) return 'Linux';
    return 'Unknown';
};

/**
 * Extract operating system version from user agent
 */
export const getOSVersion = (userAgent: string): string | undefined => {
    // Windows version
    if (userAgent.includes('Windows NT')) {
        const match = userAgent.match(/Windows NT (\d+\.\d+)/);
        if (match) {
            const version = parseFloat(match[1]);
            if (version === 10.0) return '10';
            if (version === 6.3) return '8.1';
            if (version === 6.2) return '8';
            if (version === 6.1) return '7';
            return match[1];
        }
    }

    // macOS version
    if (userAgent.includes('Mac OS X')) {
        const match = userAgent.match(/Mac OS X (\d+[._]\d+)/);
        if (match) {
            return match[1].replace('_', '.');
        }
    }

    // iOS version
    if (userAgent.includes('iPhone OS') || userAgent.includes('iPad OS')) {
        const match = userAgent.match(/OS (\d+[._]\d+)/);
        if (match) {
            return match[1].replace('_', '.');
        }
    }

    // Android version
    if (userAgent.includes('Android')) {
        const match = userAgent.match(/Android (\d+\.?\d*)/);
        if (match) {
            return match[1];
        }
    }

    return undefined;
};

/**
 * Extract browser name from user agent
 */
export const getBrowserName = (userAgent: string): string | undefined => {
    if (userAgent.includes('Chrome') && !userAgent.includes('Edge')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    if (userAgent.includes('Opera')) return 'Opera';
    return undefined;
};

/**
 * Extract browser version from user agent
 */
export const getBrowserVersion = (userAgent: string): string | undefined => {
    // Chrome version
    if (userAgent.includes('Chrome') && !userAgent.includes('Edge')) {
        const match = userAgent.match(/Chrome\/(\d+\.?\d*)/);
        if (match) return match[1];
    }

    // Firefox version
    if (userAgent.includes('Firefox')) {
        const match = userAgent.match(/Firefox\/(\d+\.?\d*)/);
        if (match) return match[1];
    }

    // Safari version
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
        const match = userAgent.match(/Version\/(\d+\.?\d*)/);
        if (match) return match[1];
    }

    // Edge version
    if (userAgent.includes('Edge')) {
        const match = userAgent.match(/Edge\/(\d+\.?\d*)/);
        if (match) return match[1];
    }

    return undefined;
};

/**
 * Get client IP address (if available)
 * This is typically handled by the backend
 */
export const getClientIP = async (): Promise<string> => {
    try {
        // Try to get IP from a public service
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        // Fallback to localhost
        return '127.0.0.1';
    }
};

/**
 * Get device location (if available)
 * This requires user permission
 */
export const getDeviceLocation = (): Promise<string | undefined> => {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve(undefined);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                resolve(`${latitude}, ${longitude}`);
            },
            () => {
                resolve(undefined);
            },
            { timeout: 5000 }
        );
    });
};

/**
 * Collect device metadata
 */
export const getDeviceMetadata = (): Record<string, any> => {
    return {
        screenResolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        colorDepth: screen.colorDepth,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        doNotTrack: navigator.doNotTrack,
        hardwareConcurrency: navigator.hardwareConcurrency,
        maxTouchPoints: navigator.maxTouchPoints,
        vendor: navigator.vendor,
        vendorSub: navigator.vendorSub,
        productSub: navigator.productSub,
        appName: navigator.appName,
        appVersion: navigator.appVersion,
        userAgent: navigator.userAgent,
    };
};

/**
 * Create device info from browser environment
 * This is the main function used by frontend
 */
export const createDeviceInfo = async (): Promise<DeviceInfoDto> => {
    const userAgent = navigator.userAgent;
    const deviceId = generateDeviceId();
    const deviceName = getDeviceName(userAgent);
    const deviceType = getDeviceType(userAgent);
    const osName = getOSName(userAgent);
    const osVersion = getOSVersion(userAgent);
    const browserName = getBrowserName(userAgent);
    const browserVersion = getBrowserVersion(userAgent);
    const ipAddress = await getClientIP();
    const location = await getDeviceLocation();
    const metadata = getDeviceMetadata();

    return {
        deviceId,
        deviceName,
        deviceType: deviceType as any, // Type assertion for enum
        osName,
        osVersion,
        browserName,
        browserVersion,
        ipAddress,
        userAgent,
        location,
        metadata,
    };
};

/**
 * Validate device info
 * Ensures all required fields are present
 */
export const validateDeviceInfo = (deviceInfo: Partial<DeviceInfoDto>): boolean => {
    const requiredFields = [
        'deviceId',
        'deviceName',
        'deviceType',
        'osName',
        'ipAddress',
        'userAgent'
    ];

    return requiredFields.every(field =>
        deviceInfo[field as keyof DeviceInfoDto] !== undefined &&
        deviceInfo[field as keyof DeviceInfoDto] !== null &&
        deviceInfo[field as keyof DeviceInfoDto] !== ''
    );
};

/**
 * Sanitize device info
 * Remove sensitive information and validate data
 */
export const sanitizeDeviceInfo = (deviceInfo: DeviceInfoDto): DeviceInfoDto => {
    return {
        ...deviceInfo,
        // Ensure deviceId is valid UUID format
        deviceId: deviceInfo.deviceId.replace(/[^a-f0-9-]/gi, ''),
        // Limit string lengths
        deviceName: deviceInfo.deviceName.substring(0, 255),
        osName: deviceInfo.osName.substring(0, 100),
        osVersion: deviceInfo.osVersion?.substring(0, 50),
        browserName: deviceInfo.browserName?.substring(0, 100),
        browserVersion: deviceInfo.browserVersion?.substring(0, 50),
        ipAddress: deviceInfo.ipAddress.substring(0, 45),
        userAgent: deviceInfo.userAgent.substring(0, 1000),
        location: deviceInfo.location?.substring(0, 255),
        // Sanitize metadata
        metadata: deviceInfo.metadata ? {
            ...deviceInfo.metadata,
            // Remove any potentially sensitive data
            userAgent: undefined,
        } : undefined,
    };
};
