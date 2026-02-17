import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { TelegramBotService } from './services/telegram-bot.service';
import { TelegramBotConfig } from './config/telegram-bot.config';
import { TelegramBotListener } from './listeners/telegram-bot.listener';
import { User } from '../user/entities/user.entity';
import { Lecture } from '../lecture/entities/lecture.entity';
import { LectureRepository } from '../lecture/lecture.repository';
import { EventProcessingTracker } from './entities/event-processing-tracker.entity';
import { GroupTelegramMember } from '../group/entities/group-telegram-member.entity';

@Module({
    imports: [
        ConfigModule,
        TypeOrmModule.forFeature([User, Lecture, EventProcessingTracker, GroupTelegramMember]),
    ],
    providers: [
        TelegramBotService,
        TelegramBotConfig,
        TelegramBotListener,
        {
            provide: 'ILectureRepository',
            useClass: LectureRepository,
        },
    ],
    exports: [TelegramBotService, TelegramBotConfig],
})
export class TelegramBotModule { }

