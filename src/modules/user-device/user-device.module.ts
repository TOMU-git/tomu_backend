import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { UserDevice } from './entities/user-device.entity';
import { DeviceRepository } from './repositories/device.repository';
import { DeviceService } from './services/device.service';
import { DeviceController } from './controllers/device.controller';
import { DeviceCleanupService } from './services/device-cleanup.service';
import { DeviceAnalyticsService } from './services/device-analytics.service';
import { UserModule } from '../user/user.module';

/**
 * User Device Module
 * 
 * Manages device registration, validation, and cleanup
 * Provides device management capabilities for users
 * 
 * Features:
 * - Device registration and validation
 * - Device limit enforcement
 * - Device cleanup and maintenance
 * - Security level management
 * - Device statistics and analytics
 */
@Module({
    imports: [
        TypeOrmModule.forFeature([UserDevice]),
        ScheduleModule.forRoot(), // Enable cron jobs
        UserModule, // Import UserModule for user service access
    ],
    controllers: [DeviceController],
    providers: [
        {
            provide: 'IDeviceRepository',
            useClass: DeviceRepository,
        },
        {
            provide: 'IDeviceService',
            useClass: DeviceService,
        },
        DeviceCleanupService,
        DeviceAnalyticsService,
    ],
    exports: [
        {
            provide: 'IDeviceService',
            useClass: DeviceService,
        },
        {
            provide: 'IDeviceRepository',
            useClass: DeviceRepository,
        },
    ],
})
export class UserDeviceModule { }
