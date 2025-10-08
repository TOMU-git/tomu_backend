import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AIChatSession } from './entities/ai-chat-session.entity';
import { AIChatMessage } from './entities/ai-chat-message.entity';
import { UserAIProfile } from './entities/user-ai-profile.entity';
import { UserCourseProgress } from './entities/user-course-progress.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AIChatSession,
      AIChatMessage,
      UserAIProfile,
      UserCourseProgress,
    ]),
  ],
  controllers: [],
  providers: [],
  exports: [
    TypeOrmModule, // shu moduldagi repo'larni tashqariga berish uchun
  ],
})
export class AiModule { }