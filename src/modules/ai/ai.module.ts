import { Module, forwardRef } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AIChatSession } from './entities/ai-chat-session.entity';
import { AIChatMessage } from './entities/ai-chat-message.entity';
import { UserAIProfile } from './entities/user-ai-profile.entity';
import { UserCourseProgress } from './entities/user-course-progress.entity';
import { AIUsageCost } from './entities/ai-usage-cost.entity';

// Repository imports
import { UserAIProfileRepository } from './repositories/user-ai-profile.repository';
import { UserCourseProgressRepository } from './repositories/user-course-progress.repository';
import { AIChatSessionRepository } from './repositories/ai-chat-session.repository';
import { AIChatMessageRepository } from './repositories/ai-chat-message.repository';
import { AIUsageCostRepository } from './repositories/ai-usage-cost.repository';

// Interface imports
import { IUserAIProfileRepository } from './interfaces/user-ai-profile.repository';
import { IUserCourseProgressRepository } from './interfaces/user-course-progress.repository';
import { IAIChatSessionRepository } from './interfaces/ai-chat-session.repository';
import { IAIChatMessageRepository } from './interfaces/ai-chat-message.repository';
import { IAIUsageCostRepository } from './interfaces/ai-usage-cost.repository';

// Service imports
import { AIChatService } from './services/ai-chat.service';
import { GPTService } from './services/gpt.service';
import { TTSService } from './services/tts.service';
import { WhisperService } from './services/whisper.service';
import { ChromaService } from './services/chroma.service';
import { TranslationService } from './services/translation.service';
import { ChromaConnectionService } from './services/chroma-connection.service';
import { ChromaEmbeddingService } from './services/chroma-embedding.service';
import { ChromaSearchService } from './services/chroma-search.service';
import { MemoryIndexService } from './services/memory-index.service';
import { LessonIndexingService } from './services/lesson-indexing.service';
import { LessonProgressModule } from '../lesson-progress/lesson-progress.module';
import { IndexLessonsCommand } from './commands/index-lessons.command';
import { AIChatMessageFactory } from './services/ai-chat-message-factory.service';
import { VoiceProcessingPipeline } from './services/voice-processing-pipeline.service';
import { UserCourseProgressService } from './services/user-course-progress.service';
import { UserProgressCalculator } from './utils/user-progress-calculator.util';
import { CostCalculationService } from './services/cost-calculation.service';
import { LimitCheckService } from './services/limit-check.service';
import { RetryHelperService } from './services/retry-helper.service';
import { TokenCounterService } from './services/token-counter.service';
import { RerankService } from './services/rerank.service';
import { GPTPromptBuilderService } from './services/gpt-prompt-builder.service';
// Pipeline services
import { GPTStep } from './services/pipeline/gpt-step.service';
import { STTStep } from './services/pipeline/stt-step.service';
import { ValidationStep } from './services/pipeline/validation-step.service';
import { ContextStep } from './services/pipeline/context-step.service';
import { ResponseStep } from './services/pipeline/response-step.service';
import { ConversationTopicExtractorService } from './services/pipeline/extractors/conversation-topic-extractor.service';
import { ConversationEntityExtractorService } from './services/pipeline/extractors/conversation-entity-extractor.service';
import { DialogueCorrectionService } from './services/pipeline/correctors/dialogue-correction.service';
import { SimilarityCalculatorService } from './services/pipeline/correctors/similarity-calculator.service';
import { NameValidationService } from './services/pipeline/validators/name-validation.service';
import { VocabularyValidationService } from './services/pipeline/validators/vocabulary-validation.service';
import { TranslationLookupService } from './services/pipeline/extractors/translation-lookup.service';
import { ContextFilterService } from './services/pipeline/filters/context-filter.service';
import { MaterialMatchingService } from './services/pipeline/matchers/material-matching.service';
import { ResponseValidationService } from './services/pipeline/validators/response-validation.service';
import { FallbackResponseService } from './services/pipeline/builders/fallback-response.service';
import { MaterialFollowUpService } from './services/pipeline/builders/material-followup.service';
import { AIFollowUpService } from './services/pipeline/builders/ai-followup.service';
import { MaterialSequentialFollowUpService } from './services/pipeline/builders/material-sequential-followup.service';
import { UserLastMessageFollowUpService } from './services/pipeline/builders/user-last-message-followup.service';
import { HybridFollowUpService } from './services/pipeline/builders/hybrid-followup.service';
import { ResponseCacheService } from './services/response-cache.service';
import { GoogleTTSProvider } from './services/tts-providers/google-tts.provider';

// Controller imports
import { AiChatController } from './controllers/ai-chat.controller';
import { AiAdminController } from './controllers/ai-admin.controller';

// Filter imports
import { AIExceptionFilter } from './filters/ai-exception.filter';

// Module imports
import { SharedModule } from '../shared/shared.module';
import { UserCoursesModule } from '../user-courses/user-courses.module';

@Module({
  imports: [
    SharedModule,
    forwardRef(() => LessonProgressModule),
    UserCoursesModule, // PaymentGuard uchun UserCourseRepository'ga access
    TypeOrmModule.forFeature([
      AIChatSession,
      AIChatMessage,
      UserAIProfile,
      UserCourseProgress,
      AIUsageCost, // Cost tracking entity
    ]),
  ],
  controllers: [AiChatController, AiAdminController],
  providers: [
    // Global Exception Filter for AI Module
    {
      provide: APP_FILTER,
      useClass: AIExceptionFilter,
    },
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
    {
      provide: 'IAIUsageCostRepository',
      useClass: AIUsageCostRepository,
    },
    // Servislar
    AIChatService,
    GPTService,
    TTSService,
    WhisperService,
    ChromaService,
    TranslationService,
    AIChatMessageFactory,
    VoiceProcessingPipeline,
    UserCourseProgressService,
    UserProgressCalculator,
    IndexLessonsCommand,
    // Cost tracking servislar
    CostCalculationService,
    LimitCheckService,
    // Response caching
    ResponseCacheService,
    // TTS providers
    GoogleTTSProvider,
    // Retry logic
    RetryHelperService,
    // Token management
    TokenCounterService,
    // Re-ranking
    RerankService,
    // GPT prompt building
    GPTPromptBuilderService,
    // Pipeline services
    ConversationTopicExtractorService,
    ConversationEntityExtractorService,
    SimilarityCalculatorService,
    DialogueCorrectionService,
    NameValidationService,
    VocabularyValidationService,
    TranslationLookupService,
    ContextFilterService,
    MaterialMatchingService,
    ResponseValidationService,
    FallbackResponseService,
    MaterialFollowUpService,
    AIFollowUpService,
    MaterialSequentialFollowUpService,
    UserLastMessageFollowUpService,
    HybridFollowUpService,
    STTStep,
    ValidationStep,
    ContextStep,
    ResponseStep,
    GPTStep,
    // Chroma sub-services
    ChromaConnectionService,
    ChromaEmbeddingService,
    ChromaSearchService,
    MemoryIndexService,
    LessonIndexingService,
  ],
  exports: [
    TypeOrmModule, // shu moduldagi repo'larni tashqariga berish uchun
    // Repository interface'larni export qilish
    'IUserAIProfileRepository',
    'IUserCourseProgressRepository',
    'IAIChatSessionRepository',
    'IAIChatMessageRepository',
    'IAIUsageCostRepository',
    // Servislar exporti (ixtiyoriy, boshqa modullarda ishlatish uchun)
    AIChatService,
    GPTService,
    TTSService,
    WhisperService,
    ChromaService,
    TranslationService,
    AIChatMessageFactory,
    VoiceProcessingPipeline,
    UserCourseProgressService,
    UserProgressCalculator,
    // Cost tracking servislar export
    CostCalculationService,
    LimitCheckService,
    // Chroma sub-services export
    ChromaConnectionService,
    ChromaEmbeddingService,
    ChromaSearchService,
    MemoryIndexService,
    LessonIndexingService,
  ],
})
export class AiModule { }