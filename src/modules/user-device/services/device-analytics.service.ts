import { Injectable, Inject } from '@nestjs/common';
import { IDeviceService } from '../interfaces/device.service';
import { environmentConfig } from '../config/device.config';

/**
 * Device Analytics Service
 * 
 * Provides analytics and insights for device management
 * Tracks usage patterns, security metrics, and performance data
 */
@Injectable()
export class DeviceAnalyticsService {
    constructor(
        @Inject('IDeviceService')
        private readonly deviceService: IDeviceService,
    ) { }

    /**
     * Get device analytics for a specific user
     */
    async getUserDeviceAnalytics(userId: number): Promise<{
        totalDevices: number;
        activeDevices: number;
        inactiveDevices: number;
        expiredDevices: number;
        byType: Record<string, number>;
        byOS: Record<string, number>;
        byBrowser: Record<string, number>;
        bySecurityLevel: Record<string, number>;
        recentActivity: Array<{
            deviceId: string;
            deviceName: string;
            lastLoginAt: Date;
            action: string;
        }>;
        securityInsights: {
            suspiciousDevices: number;
            highRiskDevices: number;
            trustedDevices: number;
        };
    }> {
        try {
            const stats = await this.deviceService.getDeviceStatistics(userId);
            const devices = await this.deviceService.getUserDevices(userId, true);

            // Analyze by type
            const byType = this.analyzeByType(devices.data);

            // Analyze by OS
            const byOS = this.analyzeByOS(devices.data);

            // Analyze by browser
            const byBrowser = this.analyzeByBrowser(devices.data);

            // Analyze by security level
            const bySecurityLevel = this.analyzeBySecurityLevel(devices.data);

            // Get recent activity
            const recentActivity = this.getRecentActivity(devices.data);

            // Get security insights
            const securityInsights = this.getSecurityInsights(devices.data);

            return {
                totalDevices: stats.total,
                activeDevices: stats.active,
                inactiveDevices: stats.inactive,
                expiredDevices: stats.expired,
                byType,
                byOS,
                byBrowser,
                bySecurityLevel,
                recentActivity,
                securityInsights,
            };
        } catch (error) {
            console.error('❌ Get User Device Analytics Error:', error);
            throw error;
        }
    }

    /**
     * Get global device analytics (admin only)
     */
    async getGlobalDeviceAnalytics(): Promise<{
        totalUsers: number;
        totalDevices: number;
        activeDevices: number;
        inactiveDevices: number;
        expiredDevices: number;
        byType: Record<string, number>;
        byOS: Record<string, number>;
        byBrowser: Record<string, number>;
        byRole: Record<string, number>;
        deviceLimitUtilization: {
            average: number;
            byRole: Record<string, number>;
        };
        securityMetrics: {
            suspiciousDevices: number;
            highRiskDevices: number;
            trustedDevices: number;
            averageSecurityLevel: number;
        };
        trends: {
            dailyRegistrations: Array<{ date: string; count: number }>;
            dailyLogins: Array<{ date: string; count: number }>;
            deviceTypeDistribution: Array<{ type: string; percentage: number }>;
        };
    }> {
        try {
            // This would require additional methods in DeviceService
            // For now, return mock data structure
            return {
                totalUsers: 0,
                totalDevices: 0,
                activeDevices: 0,
                inactiveDevices: 0,
                expiredDevices: 0,
                byType: {},
                byOS: {},
                byBrowser: {},
                byRole: {},
                deviceLimitUtilization: {
                    average: 0,
                    byRole: {},
                },
                securityMetrics: {
                    suspiciousDevices: 0,
                    highRiskDevices: 0,
                    trustedDevices: 0,
                    averageSecurityLevel: 0,
                },
                trends: {
                    dailyRegistrations: [],
                    dailyLogins: [],
                    deviceTypeDistribution: [],
                },
            };
        } catch (error) {
            console.error('❌ Get Global Device Analytics Error:', error);
            throw error;
        }
    }

    /**
     * Get device security report
     */
    async getDeviceSecurityReport(userId: number): Promise<{
        riskLevel: 'low' | 'medium' | 'high';
        issues: Array<{
            type: string;
            severity: 'low' | 'medium' | 'high';
            description: string;
            recommendation: string;
        }>;
        recommendations: Array<{
            priority: 'low' | 'medium' | 'high';
            action: string;
            description: string;
        }>;
    }> {
        try {
            const devices = await this.deviceService.getUserDevices(userId, true);
            const issues: Array<any> = [];
            const recommendations: Array<any> = [];

            // Analyze devices for security issues
            devices.data.forEach(device => {
                // Check for suspicious activity
                if (device.securityLevel === 'low') {
                    issues.push({
                        type: 'suspicious_device',
                        severity: 'high',
                        description: `Device "${device.deviceName}" has low security level`,
                        recommendation: 'Review device activity and consider removing if suspicious',
                    });
                }

                // Check for expired devices
                if (device.expiresAt && new Date(device.expiresAt) < new Date()) {
                    issues.push({
                        type: 'expired_device',
                        severity: 'medium',
                        description: `Device "${device.deviceName}" has expired`,
                        recommendation: 'Remove expired device or refresh session',
                    });
                }

                // Check for inactive devices
                const daysSinceLastLogin = Math.floor(
                    (new Date().getTime() - new Date(device.lastLoginAt).getTime()) / (1000 * 60 * 60 * 24)
                );

                if (daysSinceLastLogin > 30) {
                    issues.push({
                        type: 'inactive_device',
                        severity: 'low',
                        description: `Device "${device.deviceName}" has been inactive for ${daysSinceLastLogin} days`,
                        recommendation: 'Consider removing inactive devices',
                    });
                }
            });

            // Generate recommendations
            if (devices.data.length > 5) {
                recommendations.push({
                    priority: 'medium',
                    action: 'reduce_devices',
                    description: 'Consider reducing the number of registered devices for better security',
                });
            }

            if (issues.some(issue => issue.severity === 'high')) {
                recommendations.push({
                    priority: 'high',
                    action: 'review_security',
                    description: 'Review device security settings and remove suspicious devices',
                });
            }

            // Determine overall risk level
            const highRiskIssues = issues.filter(issue => issue.severity === 'high').length;
            const mediumRiskIssues = issues.filter(issue => issue.severity === 'medium').length;

            let riskLevel: 'low' | 'medium' | 'high' = 'low';
            if (highRiskIssues > 0) {
                riskLevel = 'high';
            } else if (mediumRiskIssues > 2) {
                riskLevel = 'medium';
            }

            return {
                riskLevel,
                issues,
                recommendations,
            };
        } catch (error) {
            console.error('❌ Get Device Security Report Error:', error);
            throw error;
        }
    }

    /**
     * Track device event
     */
    async trackDeviceEvent(
        userId: number,
        deviceId: string,
        event: string,
        metadata?: Record<string, any>
    ): Promise<void> {
        if (!environmentConfig.features.enableDeviceAnalytics) {
            return;
        }

        try {
            // This would integrate with your analytics system
            // For now, just log the event
            if (environmentConfig.monitoring.enableLogging) {
                console.log(`📊 Device Event: User ${userId}, Device ${deviceId}, Event ${event}`, metadata);
            }
        } catch (error) {
            console.error('❌ Track Device Event Error:', error);
        }
    }

    /**
     * Analyze devices by type
     */
    private analyzeByType(devices: any[]): Record<string, number> {
        const analysis: Record<string, number> = {};

        devices.forEach(device => {
            analysis[device.deviceType] = (analysis[device.deviceType] || 0) + 1;
        });

        return analysis;
    }

    /**
     * Analyze devices by OS
     */
    private analyzeByOS(devices: any[]): Record<string, number> {
        const analysis: Record<string, number> = {};

        devices.forEach(device => {
            analysis[device.osName] = (analysis[device.osName] || 0) + 1;
        });

        return analysis;
    }

    /**
     * Analyze devices by browser
     */
    private analyzeByBrowser(devices: any[]): Record<string, number> {
        const analysis: Record<string, number> = {};

        devices.forEach(device => {
            if (device.browserName) {
                analysis[device.browserName] = (analysis[device.browserName] || 0) + 1;
            }
        });

        return analysis;
    }

    /**
     * Analyze devices by security level
     */
    private analyzeBySecurityLevel(devices: any[]): Record<string, number> {
        const analysis: Record<string, number> = {};

        devices.forEach(device => {
            analysis[device.securityLevel] = (analysis[device.securityLevel] || 0) + 1;
        });

        return analysis;
    }

    /**
     * Get recent activity
     */
    private getRecentActivity(devices: any[]): Array<any> {
        return devices
            .sort((a, b) => new Date(b.lastLoginAt).getTime() - new Date(a.lastLoginAt).getTime())
            .slice(0, 10)
            .map(device => ({
                deviceId: device.deviceId,
                deviceName: device.deviceName,
                lastLoginAt: device.lastLoginAt,
                action: device.isActive ? 'login' : 'logout',
            }));
    }

    /**
     * Get security insights
     */
    private getSecurityInsights(devices: any[]): {
        suspiciousDevices: number;
        highRiskDevices: number;
        trustedDevices: number;
    } {
        const suspiciousDevices = devices.filter(d => d.securityLevel === 'low').length;
        const highRiskDevices = devices.filter(d => d.securityLevel === 'normal').length;
        const trustedDevices = devices.filter(d => d.securityLevel === 'high').length;

        return {
            suspiciousDevices,
            highRiskDevices,
            trustedDevices,
        };
    }
}
