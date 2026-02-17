import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { IGroupService } from '../interfaces/group.service';

/**
 * Guruhlarni avtomatik boshlash uchun cron job
 * Har kuni yarim tunda ishlaydi:
 * - WAITING statusdagi va fillAt dan 3 kun o'tgan guruhlarni topadi
 * - Darslar jadvalini generatsiya qiladi
 * - Guruh statusini ACTIVE ga o'zgartiradi
 */
@Injectable()
export class GroupCronService {
    private readonly logger = new Logger(GroupCronService.name);

    constructor(
        @Inject('IGroupService')
        private readonly groupService: IGroupService,
    ) { }

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleGroupAutoStart(): Promise<void> {
        try {
            this.logger.log('🔄 Checking for groups ready to start...');
            const result = await this.groupService.startGroupsIfReady();
            this.logger.log(`✅ ${result.message}`);
        } catch (error) {
            this.logger.error(`❌ Error in group auto-start: ${error.message}`);
        }
    }
}
