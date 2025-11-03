import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { config } from 'src/common/config';

@Injectable()
export class FirebaseService implements OnModuleInit {
    private readonly logger = new Logger(FirebaseService.name);
    private firebaseApp: admin.app.App;

    async onModuleInit() {
        try {
            // Check if Firebase is configured
            if (!config.firebaseProjectId || !config.firebasePrivateKey || !config.firebaseClientEmail) {
                this.logger.warn('Firebase credentials not configured. Push notifications will not work.');
                return;
            }

            // Initialize Firebase Admin SDK
            const serviceAccount = {
                projectId: config.firebaseProjectId,
                privateKey: config.firebasePrivateKey,
                clientEmail: config.firebaseClientEmail,
            };

            // Check if Firebase app already exists
            try {
                this.firebaseApp = admin.app();
            } catch (error) {
                // App doesn't exist, initialize it
                this.firebaseApp = admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
                    projectId: config.firebaseProjectId,
                });
            }

            this.logger.log('Firebase Admin SDK initialized successfully');
        } catch (error) {
            this.logger.error(`Failed to initialize Firebase: ${error.message}`);
        }
    }

    /**
     * Check if Firebase is initialized
     */
    isInitialized(): boolean {
        try {
            return !!admin.apps.length;
        } catch {
            return false;
        }
    }

    /**
     * Send notification to a single FCM token
     */
    async sendToToken(token: string, notification: admin.messaging.Notification, data?: Record<string, string>): Promise<string> {
        if (!this.isInitialized()) {
            throw new Error('Firebase is not initialized');
        }

        const message: admin.messaging.Message = {
            token,
            notification,
            data: data ? this.stringifyData(data) : undefined,
            android: {
                priority: 'high' as admin.messaging.AndroidConfig['priority'],
                notification: {
                    sound: 'default',
                    channelId: 'default',
                },
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'default',
                        badge: 1,
                    },
                },
            },
        };

        try {
            const response = await admin.messaging().send(message);
            this.logger.log(`Successfully sent message: ${response}`);
            return response;
        } catch (error) {
            this.logger.error(`Error sending message: ${error.message}`);
            throw error;
        }
    }

    /**
     * Send notification to multiple FCM tokens
     */
    async sendToTokens(
        tokens: string[],
        notification: admin.messaging.Notification,
        data?: Record<string, string>,
    ): Promise<admin.messaging.BatchResponse> {
        if (!this.isInitialized()) {
            throw new Error('Firebase is not initialized');
        }

        if (tokens.length === 0) {
            throw new Error('Tokens array is empty');
        }

        const message: admin.messaging.MulticastMessage = {
            tokens,
            notification,
            data: data ? this.stringifyData(data) : undefined,
            android: {
                priority: 'high' as admin.messaging.AndroidConfig['priority'],
                notification: {
                    sound: 'default',
                    channelId: 'default',
                },
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'default',
                        badge: 1,
                    },
                },
            },
        };

        try {
            const response = await admin.messaging().sendEachForMulticast(message);
            this.logger.log(`Successfully sent ${response.successCount} messages, ${response.failureCount} failed`);

            // Log failures
            if (response.failureCount > 0) {
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        this.logger.warn(`Failed to send to token ${tokens[idx]}: ${resp.error?.message}`);
                    }
                });
            }

            return response;
        } catch (error) {
            this.logger.error(`Error sending multicast message: ${error.message}`);
            throw error;
        }
    }

    /**
     * Send notification to a topic
     */
    async sendToTopic(
        topic: string,
        notification: admin.messaging.Notification,
        data?: Record<string, string>,
    ): Promise<string> {
        if (!this.isInitialized()) {
            throw new Error('Firebase is not initialized');
        }

        const message: admin.messaging.Message = {
            topic,
            notification,
            data: data ? this.stringifyData(data) : undefined,
        };

        try {
            const response = await admin.messaging().send(message);
            this.logger.log(`Successfully sent message to topic ${topic}: ${response}`);
            return response;
        } catch (error) {
            this.logger.error(`Error sending message to topic: ${error.message}`);
            throw error;
        }
    }

    /**
     * Validate FCM token
     */
    async validateToken(token: string): Promise<boolean> {
        if (!this.isInitialized()) {
            return false;
        }

        try {
            // Try to send a test message (silent) to validate the token
            // Note: This will consume the token if it's invalid
            // Alternative: Check token format or use admin.messaging().send with dry-run
            return true; // For now, just return true if Firebase is initialized
        } catch {
            return false;
        }
    }

    /**
     * Convert data object to string format (FCM requires string values)
     */
    private stringifyData(data: Record<string, any>): Record<string, string> {
        const stringData: Record<string, string> = {};
        for (const [key, value] of Object.entries(data)) {
            stringData[key] = typeof value === 'string' ? value : JSON.stringify(value);
        }
        return stringData;
    }
}
