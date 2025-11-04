import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationController } from './notification.controller';
import { NotificationService } from './services/notification.service';
import { FirebaseService } from './services/firebase.service';
import { UserDevice } from '../user-device/entities/user-device.entity';
import { UserDeviceModule } from '../user-device/user-device.module';
import { SharedModule } from '../shared/shared.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([UserDevice]),
        UserDeviceModule, // Import to access device service
        SharedModule, // Import for AuthGuard dependencies
    ],
    controllers: [NotificationController],
    providers: [NotificationService, FirebaseService],
    exports: [NotificationService, FirebaseService], // Export for use in other modules
})
export class NotificationModule { }
