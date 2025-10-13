import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AIChatSession } from './entities/ai-chat-session.entity';
import { AIChatMessage } from './entities/ai-chat-message.entity';
import { UserAIProfile } from './entities/user-ai-profile.entity';
import { UserCourseProgress } from './entities/user-course-progress.entity';

// Repository imports
import { UserAIProfileRepository } from './repositories/user-ai-profile.repository';
import { UserCourseProgressRepository } from './repositories/user-course-progress.repository';
import { AIChatSessionRepository } from './repositories/ai-chat-session.repository';
import { AIChatMessageRepository } from './repositories/ai-chat-message.repository';

// Interface imports
import { IUserAIProfileRepository } from './interfaces/user-ai-profile.repository';
import { IUserCourseProgressRepository } from './interfaces/user-course-progress.repository';
import { IAIChatSessionRepository } from './interfaces/ai-chat-session.repository';
import { IAIChatMessageRepository } from './interfaces/ai-chat-message.repository';

// Service imports
import { AIChatService } from './services/ai-chat.service';
import { GPTService } from './services/gpt.service';
import { TTSService } from './services/tts.service';
import { WhisperService } from './services/whisper.service';
import { ChromaService } from './services/chroma.service';
import { TranslationService } from './services/translation.service';
import { LessonProgressModule } from '../lesson-progress/lesson-progress.module';
import { IndexLessonsCommand } from './commands/index-lessons.command';

// Controller imports
import { AiChatController } from './controllers/ai-chat.controller';
import { AiAdminController } from './controllers/ai-admin.controller';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [
    SharedModule,
    LessonProgressModule,
    TypeOrmModule.forFeature([
      AIChatSession,
      AIChatMessage,
      UserAIProfile,
      UserCourseProgress,
    ]),
  ],
  controllers: [AiChatController, AiAdminController],
  providers: [
    // Repository providers - Interface va Implementation ni bog'laydi
    {
      provide: 'IUserAIProfileRepository',
      useClass: UserAIProfileRepository,
    },
    {
      provide: 'IUserCourseProgressRepository',
      useClass: UserCourseProgressRepository,
    },
    {
      provide: 'IAIChatSessionRepository',
      useClass: AIChatSessionRepository,
    },
    {
      provide: 'IAIChatMessageRepository',
      useClass: AIChatMessageRepository,
    },
    // Servislar
    AIChatService,
    GPTService,
    TTSService,
    WhisperService,
    ChromaService,
    TranslationService,
    IndexLessonsCommand,
  ],
  exports: [
    TypeOrmModule, // shu moduldagi repo'larni tashqariga berish uchun
    // Repository interface'larni export qilish
    'IUserAIProfileRepository',
    'IUserCourseProgressRepository',
    'IAIChatSessionRepository',
    'IAIChatMessageRepository',
    // Servislar exporti (ixtiyoriy, boshqa modullarda ishlatish uchun)
    AIChatService,
    GPTService,
    TTSService,
    WhisperService,
    ChromaService,
    TranslationService,
  ],
})
export class AiModule { }