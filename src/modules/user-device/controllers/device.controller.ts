import {
    Controller,
    Get,
    Post,
    Delete,
    Put,
    Body,
    Param,
    Query,
    Inject,
    UseGuards,
    Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ResData } from 'src/lib/resData';
import { DeviceResponseDto } from '../dto/device-response.dto';
import { DeviceInfoDto } from '../dto/device-info.dto';
import { IDeviceService } from '../interfaces/device.service';
import { Auth } from 'src/common/decorator/auth.decorator';
import { RoleEnum } from 'src/common/enums/enum';
import { CurrentUser } from 'src/common/decorator/CurrentUser.decorator';
import { User } from 'src/modules/user/entities/user.entity';

/**
 * Device Controller
 * 
 * Handles device management API endpoints
 * Provides device registration, validation, and management
 * 
 * Features:
 * - Device registration and validation
 * - Device list and management
 * - Device removal and cleanup
 * - Device statistics and analytics
 * - Security level management
 */
@ApiTags('devices')
@Controller('devices')
@ApiBearerAuth()
export class DeviceController {
    constructor(
        @Inject('IDeviceService')
        private readonly deviceService: IDeviceService,
    ) { }

    /**
     * Register a new device
     * POST /api/devices/register
     */
    @Post('register')
    @Auth(RoleEnum.STUDENT, RoleEnum.TEACHER, RoleEnum.ADMIN, RoleEnum.DIRECTOR)
    @ApiOperation({
        summary: 'Register a new device',
        description: 'Register a new device for the current user. Handles device limit validation and cleanup.'
    })
    @ApiResponse({
        status: 201,
        description: 'Device registered successfully',
        type: DeviceResponseDto
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid device information or device limit exceeded'
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized'
    })
    async registerDevice(
        @Body() deviceInfo: DeviceInfoDto,
        @CurrentUser() user: User,
    ): Promise<ResData<DeviceResponseDto>> {
        return await this.deviceService.registerDevice(user.id, deviceInfo);
    }

    /**
     * Get user's devices
     * GET /api/devices/my-devices
     */
    @Get('my-devices')
    @Auth(RoleEnum.STUDENT, RoleEnum.TEACHER, RoleEnum.ADMIN, RoleEnum.DIRECTOR)
    @ApiOperation({
        summary: 'Get user devices',
        description: 'Get all devices registered for the current user'
    })
    @ApiQuery({
        name: 'includeInactive',
        required: false,
        type: Boolean,
        description: 'Include inactive devices in the response'
    })
    @ApiResponse({
        status: 200,
        description: 'Devices retrieved successfully',
        type: [DeviceResponseDto]
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized'
    })
    async getMyDevices(
        @Query('includeInactive') includeInactive: boolean = false,
        @CurrentUser() user: User,
    ): Promise<ResData<DeviceResponseDto[]>> {
        return await this.deviceService.getUserDevices(user.id, includeInactive);
    }

    /**
     * Remove a specific device
     * DELETE /api/devices/:deviceId
     */
    @Delete(':deviceId')
    @Auth(RoleEnum.STUDENT, RoleEnum.TEACHER, RoleEnum.ADMIN, RoleEnum.DIRECTOR)
    @ApiOperation({
        summary: 'Remove device',
        description: 'Remove a specific device from the current user'
    })
    @ApiResponse({
        status: 200,
        description: 'Device removed successfully',
        type: DeviceResponseDto
    })
    @ApiResponse({
        status: 404,
        description: 'Device not found'
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized'
    })
    async removeDevice(
        @Param('deviceId') deviceId: string,
        @CurrentUser() user: User,
    ): Promise<ResData<DeviceResponseDto>> {
        return await this.deviceService.removeDevice(user.id, deviceId);
    }

    /**
     * Remove all devices
     * DELETE /api/devices/logout-all
     */
    @Delete('logout-all')
    @Auth(RoleEnum.STUDENT, RoleEnum.TEACHER, RoleEnum.ADMIN, RoleEnum.DIRECTOR)
    @ApiOperation({
        summary: 'Logout all devices',
        description: 'Remove all devices for the current user (logout from all devices)'
    })
    @ApiResponse({
        status: 200,
        description: 'All devices logged out successfully',
        schema: {
            type: 'object',
            properties: {
                removedCount: { type: 'number' }
            }
        }
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized'
    })
    async logoutAllDevices(
        @CurrentUser() user: User,
    ): Promise<ResData<{ removedCount: number }>> {
        return await this.deviceService.removeAllDevices(user.id);
    }

    /**
     * Update device information
     * PUT /api/devices/:deviceId
     */
    @Put(':deviceId')
    @Auth(RoleEnum.STUDENT, RoleEnum.TEACHER, RoleEnum.ADMIN, RoleEnum.DIRECTOR)
    @ApiOperation({
        summary: 'Update device',
        description: 'Update device information for a specific device'
    })
    @ApiResponse({
        status: 200,
        description: 'Device updated successfully',
        type: DeviceResponseDto
    })
    @ApiResponse({
        status: 404,
        description: 'Device not found'
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized'
    })
    async updateDevice(
        @Param('deviceId') deviceId: string,
        @Body() deviceInfo: Partial<DeviceInfoDto>,
        @CurrentUser() user: User,
    ): Promise<ResData<DeviceResponseDto>> {
        return await this.deviceService.updateDevice(user.id, deviceId, deviceInfo);
    }

    /**
     * Refresh device session
     * POST /api/devices/:deviceId/refresh
     */
    @Post(':deviceId/refresh')
    @Auth(RoleEnum.STUDENT, RoleEnum.TEACHER, RoleEnum.ADMIN, RoleEnum.DIRECTOR)
    @ApiOperation({
        summary: 'Refresh device session',
        description: 'Refresh device session and extend expiry time'
    })
    @ApiResponse({
        status: 200,
        description: 'Device session refreshed successfully',
        type: DeviceResponseDto
    })
    @ApiResponse({
        status: 404,
        description: 'Device not found'
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized'
    })
    async refreshDeviceSession(
        @Param('deviceId') deviceId: string,
        @CurrentUser() user: User,
    ): Promise<ResData<DeviceResponseDto>> {
        return await this.deviceService.refreshDeviceSession(user.id, deviceId);
    }

    /**
     * Get device limit information
     * GET /api/devices/limit
     */
    @Get('limit')
    @Auth(RoleEnum.STUDENT, RoleEnum.TEACHER, RoleEnum.ADMIN, RoleEnum.DIRECTOR)
    @ApiOperation({
        summary: 'Get device limit',
        description: 'Get device limit information for the current user'
    })
    @ApiResponse({
        status: 200,
        description: 'Device limit retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                current: { type: 'number' },
                max: { type: 'number' },
                canAdd: { type: 'boolean' }
            }
        }
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized'
    })
    async getDeviceLimit(
        @CurrentUser() user: User,
    ): Promise<ResData<{ current: number; max: number; canAdd: boolean }>> {
        const limit = await this.deviceService.checkDeviceLimit(user.id);
        return new ResData('Device limit retrieved successfully', 200, limit);
    }

    /**
     * Get device statistics
     * GET /api/devices/statistics
     */
    @Get('statistics')
    @Auth(RoleEnum.STUDENT, RoleEnum.TEACHER, RoleEnum.ADMIN, RoleEnum.DIRECTOR)
    @ApiOperation({
        summary: 'Get device statistics',
        description: 'Get device statistics for the current user'
    })
    @ApiResponse({
        status: 200,
        description: 'Device statistics retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                total: { type: 'number' },
                active: { type: 'number' },
                inactive: { type: 'number' },
                expired: { type: 'number' },
                byType: { type: 'object' }
            }
        }
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized'
    })
    async getDeviceStatistics(
        @CurrentUser() user: User,
    ): Promise<ResData<any>> {
        const stats = await this.deviceService.getDeviceStatistics(user.id);
        return new ResData('Device statistics retrieved successfully', 200, stats);
    }

    /**
     * Set device security level
     * PUT /api/devices/:deviceId/security-level
     */
    @Put(':deviceId/security-level')
    @Auth(RoleEnum.STUDENT, RoleEnum.TEACHER, RoleEnum.ADMIN, RoleEnum.DIRECTOR)
    @ApiOperation({
        summary: 'Set device security level',
        description: 'Set security level for a specific device'
    })
    @ApiResponse({
        status: 200,
        description: 'Device security level updated successfully',
        type: DeviceResponseDto
    })
    @ApiResponse({
        status: 404,
        description: 'Device not found'
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized'
    })
    async setDeviceSecurityLevel(
        @Param('deviceId') deviceId: string,
        @Body('securityLevel') securityLevel: 'low' | 'normal' | 'high',
        @CurrentUser() user: User,
    ): Promise<ResData<DeviceResponseDto>> {
        return await this.deviceService.setDeviceSecurityLevel(user.id, deviceId, securityLevel);
    }

    /**
     * Enable device management
     * POST /api/devices/enable-management
     */
    @Post('enable-management')
    @Auth(RoleEnum.STUDENT, RoleEnum.TEACHER, RoleEnum.ADMIN, RoleEnum.DIRECTOR)
    @ApiOperation({
        summary: 'Enable device management',
        description: 'Enable device management for the current user'
    })
    @ApiResponse({
        status: 200,
        description: 'Device management enabled successfully',
        schema: {
            type: 'object',
            properties: {
                enabled: { type: 'boolean' }
            }
        }
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized'
    })
    async enableDeviceManagement(
        @CurrentUser() user: User,
    ): Promise<ResData<boolean>> {
        return await this.deviceService.enableDeviceManagement(user.id);
    }

    /**
     * Disable device management
     * POST /api/devices/disable-management
     */
    @Post('disable-management')
    @Auth(RoleEnum.STUDENT, RoleEnum.TEACHER, RoleEnum.ADMIN, RoleEnum.DIRECTOR)
    @ApiOperation({
        summary: 'Disable device management',
        description: 'Disable device management for the current user'
    })
    @ApiResponse({
        status: 200,
        description: 'Device management disabled successfully',
        schema: {
            type: 'object',
            properties: {
                enabled: { type: 'boolean' }
            }
        }
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized'
    })
    async disableDeviceManagement(
        @CurrentUser() user: User,
    ): Promise<ResData<boolean>> {
        return await this.deviceService.disableDeviceManagement(user.id);
    }

    /**
     * Check device management status
     * GET /api/devices/management-status
     */
    @Get('management-status')
    @Auth(RoleEnum.STUDENT, RoleEnum.TEACHER, RoleEnum.ADMIN, RoleEnum.DIRECTOR)
    @ApiOperation({
        summary: 'Check device management status',
        description: 'Check if device management is enabled for the current user'
    })
    @ApiResponse({
        status: 200,
        description: 'Device management status retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                enabled: { type: 'boolean' }
            }
        }
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized'
    })
    async getDeviceManagementStatus(
        @CurrentUser() user: User,
    ): Promise<ResData<{ enabled: boolean }>> {
        const enabled = await this.deviceService.isDeviceManagementEnabled(user.id);
        return new ResData('Device management status retrieved successfully', 200, { enabled });
    }
}
