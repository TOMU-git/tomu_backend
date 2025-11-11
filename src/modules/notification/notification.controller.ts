import {
    Controller,
    Post,
    Body,
    Get,
    Request,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { NotificationService } from './services/notification.service';
import { SendNotificationDto } from './dto/send-notification.dto';
import { SendToAllNotificationDto } from './dto/send-to-all-notification.dto';
import { RegisterFcmTokenDto } from './dto/register-fcm-token.dto';
import { Auth } from 'src/common/decorator/auth.decorator';
import { RoleEnum } from 'src/common/enums/enum';
import { config } from 'src/common/config';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) { }

    @Post('register-token')
    @Auth(RoleEnum.STUDENT, RoleEnum.TEACHER, RoleEnum.ADMIN, RoleEnum.DIRECTOR)
    @ApiOperation({ summary: 'Register or update FCM token for device' })
    @ApiResponse({ status: 200, description: 'FCM token registered successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @HttpCode(HttpStatus.OK)
    async registerToken(@Request() req, @Body() registerDto: RegisterFcmTokenDto) {
        const userId = req.user.id;
        await this.notificationService.registerFcmToken(userId, registerDto);
        return {
            message: 'FCM token registered successfully',
        };
    }

    @Post('send')
    @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR)
    @ApiOperation({ summary: 'Send push notification' })
    @ApiResponse({ status: 200, description: 'Notification sent successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async sendNotification(@Body() notificationDto: SendNotificationDto) {
        const result = await this.notificationService.sendNotification(notificationDto);
        return {
            message: 'Notification sent',
            success: result.success,
            failure: result.failure,
        };
    }

    @Post('send-to-user')
    @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR)
    @ApiOperation({ summary: 'Send push notification to specific user' })
    @ApiResponse({ status: 200, description: 'Notification sent successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async sendToUser(@Body() notificationDto: SendNotificationDto) {
        if (!notificationDto.userId) {
            throw new Error('userId is required');
        }
        const result = await this.notificationService.sendToUser(
            notificationDto.userId,
            notificationDto,
        );
        return {
            message: 'Notification sent to user',
            success: result.success,
            failure: result.failure,
        };
    }

    @Post('send-to-all')
    @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR)
    @ApiOperation({ summary: 'Send push notification to all users' })
    @ApiResponse({ status: 200, description: 'Notification sent to all users successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async sendToAll(@Body() notificationDto: SendToAllNotificationDto) {
        const result = await this.notificationService.sendToAllUsers(notificationDto);
        return {
            message: 'Notification sent to all users',
            success: result.success,
            failure: result.failure,
            totalSent: result.success + result.failure,
        };
    }

    @Get('status')
    @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR)
    @ApiOperation({ summary: 'Check Firebase notification service status' })
    @ApiResponse({ status: 200, description: 'Service status' })
    async getStatus() {
        // You can add more status checks here
        return {
            status: 'active',
            message: 'Notification service is running',
        };
    }

    @Get('debug/devices')
    @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR)
    @ApiOperation({ summary: 'Debug: Get all active devices with FCM tokens' })
    @ApiResponse({ status: 200, description: 'Device information' })
    async getDevicesDebug() {
        const result = await this.notificationService.getDevicesDebug();
        return {
            message: 'Device debug information',
            ...result,
        };
    }

    @Get('firebase-config')
    @ApiOperation({ summary: 'Get Firebase configuration for mobile apps' })
    @ApiResponse({ status: 200, description: 'Firebase configuration' })
    async getFirebaseConfig() {
        // Return Firebase App IDs for frontend/mobile apps
        return {
            projectId: config.firebaseProjectId,
            appIds: {
                web: config.firebaseWebAppId,
                android: config.firebaseAndroidAppId,
                ios: config.firebaseIosAppId,
                macos: config.firebaseMacosAppId,
                windows: config.firebaseWindowsAppId,
            },
        };
    }
}
