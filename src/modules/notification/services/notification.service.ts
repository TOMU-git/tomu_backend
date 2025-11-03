import { Injectable, Inject, Logger, NotFoundException } from '@nestjs/common';
import { FirebaseService } from './firebase.service';
import { SendNotificationDto } from '../dto/send-notification.dto';
import { RegisterFcmTokenDto } from '../dto/register-fcm-token.dto';
import { IDeviceService } from 'src/modules/user-device/interfaces/device.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserDevice } from 'src/modules/user-device/entities/user-device.entity';

@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);

    constructor(
        private readonly firebaseService: FirebaseService,
        @Inject('IDeviceService') private readonly deviceService: IDeviceService,
        @InjectRepository(UserDevice)
        private readonly userDeviceRepository: Repository<UserDevice>,
    ) { }

    /**
     * Register or update FCM token for a device
     */
    async registerFcmToken(userId: number, registerDto: RegisterFcmTokenDto): Promise<void> {
        try {
            // If deviceId is provided, update that specific device
            if (registerDto.deviceId) {
                const device = await this.userDeviceRepository.findOne({
                    where: {
                        userId,
                        deviceId: registerDto.deviceId,
                    },
                });

                if (!device) {
                    throw new NotFoundException(`Device with ID ${registerDto.deviceId} not found`);
                }

                device.fcmToken = registerDto.fcmToken;
                await this.userDeviceRepository.save(device);
                this.logger.log(`FCM token updated for device ${registerDto.deviceId}`);
                return;
            }

            // Otherwise, update all active devices for the user
            const devices = await this.userDeviceRepository.find({
                where: {
                    userId,
                    isActive: true,
                },
            });

            if (devices.length === 0) {
                throw new NotFoundException('No active devices found for user');
            }

            // Update FCM token for all active devices
            for (const device of devices) {
                device.fcmToken = registerDto.fcmToken;
                await this.userDeviceRepository.save(device);
            }

            this.logger.log(`FCM token updated for ${devices.length} device(s)`);
        } catch (error) {
            this.logger.error(`Error registering FCM token: ${error.message}`);
            throw error;
        }
    }

    /**
     * Send notification to a specific user
     */
    async sendToUser(userId: number, notificationDto: SendNotificationDto): Promise<{ success: number; failure: number }> {
        try {
            // Get all active devices with FCM tokens for the user
            const devices = await this.userDeviceRepository.find({
                where: {
                    userId,
                    isActive: true,
                },
            });

            const tokens = devices
                .map((device) => device.fcmToken)
                .filter((token) => token && token.length > 0);

            if (tokens.length === 0) {
                this.logger.warn(`No FCM tokens found for user ${userId}`);
                return { success: 0, failure: 0 };
            }

            const notification = {
                title: notificationDto.title,
                body: notificationDto.body,
            };

            const response = await this.firebaseService.sendToTokens(
                tokens,
                notification,
                notificationDto.data,
            );

            return {
                success: response.successCount,
                failure: response.failureCount,
            };
        } catch (error) {
            this.logger.error(`Error sending notification to user: ${error.message}`);
            throw error;
        }
    }

    /**
     * Send notification to specific tokens
     */
    async sendToTokens(notificationDto: SendNotificationDto): Promise<{ success: number; failure: number }> {
        if (!notificationDto.tokens || notificationDto.tokens.length === 0) {
            throw new Error('Tokens array is required');
        }

        try {
            const notification = {
                title: notificationDto.title,
                body: notificationDto.body,
            };

            const response = await this.firebaseService.sendToTokens(
                notificationDto.tokens,
                notification,
                notificationDto.data,
            );

            return {
                success: response.successCount,
                failure: response.failureCount,
            };
        } catch (error) {
            this.logger.error(`Error sending notification to tokens: ${error.message}`);
            throw error;
        }
    }

    /**
     * Send notification to all users
     */
    async sendToAllUsers(notificationDto: SendNotificationDto): Promise<{ success: number; failure: number }> {
        try {
            // Get all active devices with FCM tokens
            const devices = await this.userDeviceRepository.find({
                where: {
                    isActive: true,
                },
            });

            const tokens = devices
                .map((device) => device.fcmToken)
                .filter((token) => token && token.length > 0);

            if (tokens.length === 0) {
                this.logger.warn('No FCM tokens found for any user');
                return { success: 0, failure: 0 };
            }

            const notification = {
                title: notificationDto.title,
                body: notificationDto.body,
            };

            // Send in batches of 500 (FCM limit)
            const batchSize = 500;
            let totalSuccess = 0;
            let totalFailure = 0;

            for (let i = 0; i < tokens.length; i += batchSize) {
                const batch = tokens.slice(i, i + batchSize);
                const response = await this.firebaseService.sendToTokens(
                    batch,
                    notification,
                    notificationDto.data,
                );
                totalSuccess += response.successCount;
                totalFailure += response.failureCount;
            }

            return {
                success: totalSuccess,
                failure: totalFailure,
            };
        } catch (error) {
            this.logger.error(`Error sending notification to all users: ${error.message}`);
            throw error;
        }
    }

    /**
     * Send notification (handles userId, tokens, or all users)
     */
    async sendNotification(notificationDto: SendNotificationDto): Promise<{ success: number; failure: number }> {
        if (notificationDto.userId) {
            return this.sendToUser(notificationDto.userId, notificationDto);
        }

        if (notificationDto.tokens && notificationDto.tokens.length > 0) {
            return this.sendToTokens(notificationDto);
        }

        // Send to all users if neither userId nor tokens provided
        return this.sendToAllUsers(notificationDto);
    }
}
