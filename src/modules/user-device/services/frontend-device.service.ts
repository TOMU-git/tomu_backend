import { DeviceInfoDto } from '../dto/device-info.dto';
import { DeviceResponseDto } from '../dto/device-response.dto';
import { createDeviceInfo, validateDeviceInfo, sanitizeDeviceInfo } from '../utils/device.utils';

/**
 * Frontend Device Service
 * 
 * Service for frontend device management
 * Handles device info collection, API calls, and local storage
 */
export class FrontendDeviceService {
    private baseUrl: string;
    private token: string | null = null;

    constructor(baseUrl: string = '/api') {
        this.baseUrl = baseUrl;
        this.loadToken();
    }

    /**
     * Load JWT token from storage
     */
    private loadToken(): void {
        this.token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    }

    /**
     * Set JWT token
     */
    setToken(token: string): void {
        this.token = token;
        localStorage.setItem('access_token', token);
    }

    /**
     * Clear JWT token
     */
    clearToken(): void {
        this.token = null;
        localStorage.removeItem('access_token');
        sessionStorage.removeItem('access_token');
    }

    /**
     * Check if device management is supported
     */
    async checkDeviceSupport(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/auth/device-support`);
            const data = await response.json();
            return data.supported === true;
        } catch (error) {
            console.warn('Device management not supported:', error);
            return false;
        }
    }

    /**
     * Collect device information
     */
    async collectDeviceInfo(): Promise<DeviceInfoDto> {
        const deviceInfo = await createDeviceInfo();
        const sanitized = sanitizeDeviceInfo(deviceInfo);

        if (!validateDeviceInfo(sanitized)) {
            throw new Error('Invalid device information collected');
        }

        return sanitized;
    }

    /**
     * Enhanced login with device information
     */
    async loginWithDevice(credentials: { phoneNumber: string; password: string }): Promise<any> {
        const deviceSupport = await this.checkDeviceSupport();

        if (deviceSupport) {
            // Use V2 API with device information
            const deviceInfo = await this.collectDeviceInfo();
            const response = await fetch(`${this.baseUrl}/auth/sign-in/users/v2`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...credentials,
                    deviceInfo
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Login failed');
            }

            const data = await response.json();

            // Store token if login successful
            if (data.data?.tokens?.access_token) {
                this.setToken(data.data.tokens.access_token);
            }

            return data;
        } else {
            // Fallback to V1 API (backward compatibility)
            const response = await fetch(`${this.baseUrl}/auth/sign-in/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(credentials)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Login failed');
            }

            const data = await response.json();

            // Store token if login successful
            if (data.data?.tokens?.access_token) {
                this.setToken(data.data.tokens.access_token);
            }

            return data;
        }
    }

    /**
     * Get user's devices
     */
    async getMyDevices(includeInactive: boolean = false): Promise<DeviceResponseDto[]> {
        if (!this.token) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(`${this.baseUrl}/devices/my-devices?includeInactive=${includeInactive}`, {
            headers: {
                'Authorization': `Bearer ${this.token}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                this.clearToken();
                throw new Error('Authentication expired');
            }
            throw new Error('Failed to fetch devices');
        }

        const data = await response.json();
        return data.data;
    }

    /**
     * Remove a specific device
     */
    async removeDevice(deviceId: string): Promise<DeviceResponseDto> {
        if (!this.token) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(`${this.baseUrl}/devices/${deviceId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${this.token}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                this.clearToken();
                throw new Error('Authentication expired');
            }
            throw new Error('Failed to remove device');
        }

        const data = await response.json();
        return data.data;
    }

    /**
     * Logout from all devices
     */
    async logoutAllDevices(): Promise<{ removedCount: number }> {
        if (!this.token) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(`${this.baseUrl}/devices/logout-all`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${this.token}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                this.clearToken();
                throw new Error('Authentication expired');
            }
            throw new Error('Failed to logout all devices');
        }

        const data = await response.json();
        return data.data;
    }

    /**
     * Update device information
     */
    async updateDevice(deviceId: string, deviceInfo: Partial<DeviceInfoDto>): Promise<DeviceResponseDto> {
        if (!this.token) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(`${this.baseUrl}/devices/${deviceId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`
            },
            body: JSON.stringify(deviceInfo)
        });

        if (!response.ok) {
            if (response.status === 401) {
                this.clearToken();
                throw new Error('Authentication expired');
            }
            throw new Error('Failed to update device');
        }

        const data = await response.json();
        return data.data;
    }

    /**
     * Refresh device session
     */
    async refreshDeviceSession(deviceId: string): Promise<DeviceResponseDto> {
        if (!this.token) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(`${this.baseUrl}/devices/${deviceId}/refresh`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                this.clearToken();
                throw new Error('Authentication expired');
            }
            throw new Error('Failed to refresh device session');
        }

        const data = await response.json();
        return data.data;
    }

    /**
     * Get device limit information
     */
    async getDeviceLimit(): Promise<{ current: number; max: number; canAdd: boolean }> {
        if (!this.token) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(`${this.baseUrl}/devices/limit`, {
            headers: {
                'Authorization': `Bearer ${this.token}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                this.clearToken();
                throw new Error('Authentication expired');
            }
            throw new Error('Failed to fetch device limit');
        }

        const data = await response.json();
        return data.data;
    }

    /**
     * Get device statistics
     */
    async getDeviceStatistics(): Promise<any> {
        if (!this.token) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(`${this.baseUrl}/devices/statistics`, {
            headers: {
                'Authorization': `Bearer ${this.token}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                this.clearToken();
                throw new Error('Authentication expired');
            }
            throw new Error('Failed to fetch device statistics');
        }

        const data = await response.json();
        return data.data;
    }

    /**
     * Set device security level
     */
    async setDeviceSecurityLevel(
        deviceId: string,
        securityLevel: 'low' | 'normal' | 'high'
    ): Promise<DeviceResponseDto> {
        if (!this.token) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(`${this.baseUrl}/devices/${deviceId}/security-level`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`
            },
            body: JSON.stringify({ securityLevel })
        });

        if (!response.ok) {
            if (response.status === 401) {
                this.clearToken();
                throw new Error('Authentication expired');
            }
            throw new Error('Failed to set device security level');
        }

        const data = await response.json();
        return data.data;
    }

    /**
     * Enable device management
     */
    async enableDeviceManagement(): Promise<boolean> {
        if (!this.token) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(`${this.baseUrl}/devices/enable-management`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                this.clearToken();
                throw new Error('Authentication expired');
            }
            throw new Error('Failed to enable device management');
        }

        const data = await response.json();
        return data.data;
    }

    /**
     * Disable device management
     */
    async disableDeviceManagement(): Promise<boolean> {
        if (!this.token) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(`${this.baseUrl}/devices/disable-management`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                this.clearToken();
                throw new Error('Authentication expired');
            }
            throw new Error('Failed to disable device management');
        }

        const data = await response.json();
        return data.data;
    }

    /**
     * Check device management status
     */
    async getDeviceManagementStatus(): Promise<{ enabled: boolean }> {
        if (!this.token) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(`${this.baseUrl}/devices/management-status`, {
            headers: {
                'Authorization': `Bearer ${this.token}`
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                this.clearToken();
                throw new Error('Authentication expired');
            }
            throw new Error('Failed to fetch device management status');
        }

        const data = await response.json();
        return data.data;
    }

    /**
     * Check if current device is registered
     */
    async isCurrentDeviceRegistered(): Promise<boolean> {
        try {
            const deviceInfo = await this.collectDeviceInfo();
            const devices = await this.getMyDevices();
            return devices.some(device => device.deviceId === deviceInfo.deviceId);
        } catch (error) {
            return false;
        }
    }

    /**
     * Register current device
     */
    async registerCurrentDevice(): Promise<DeviceResponseDto> {
        const deviceInfo = await this.collectDeviceInfo();
        return await this.registerDevice(deviceInfo);
    }

    /**
     * Register a device
     */
    async registerDevice(deviceInfo: DeviceInfoDto): Promise<DeviceResponseDto> {
        if (!this.token) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(`${this.baseUrl}/devices/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`
            },
            body: JSON.stringify(deviceInfo)
        });

        if (!response.ok) {
            if (response.status === 401) {
                this.clearToken();
                throw new Error('Authentication expired');
            }
            throw new Error('Failed to register device');
        }

        const data = await response.json();
        return data.data;
    }
}

// Export singleton instance
export const deviceService = new FrontendDeviceService();
