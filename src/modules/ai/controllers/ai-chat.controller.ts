import { Body, Controller, Get, Param, Post, Query, UploadedFile, UseGuards, UseInterceptors, UsePipes, ValidationPipe, BadRequestException, Inject } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AIChatService } from "../services/ai-chat.service";
import { VoiceRequestDto } from "../dto/voice-request.dto";
import { ChatResponseDto } from "../dto/chat-response.dto";
import { AuthGuard } from "src/modules/shared/guards/auth.guard";
import { PaymentGuard } from "../guards/payment.guard";
import { CurrentUser } from "src/common/decorator/CurrentUser.decorator";
import { AudioUtils } from "../utils/audio.util";
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags, ApiBadRequestResponse } from "@nestjs/swagger";
import { LimitExceededException } from "../exceptions/limit-exceeded.exception";
import { AIErrorResponseDto } from "../dto/error-response.dto";
import { IUserCourseService } from "src/modules/user-courses/interfaces/user-course.service";

/**
 * AiChatController
 * -------------------------------------------------------
 * Maqsad: Voice chat endpointlari (faqat ovoz orqali muloqot).
 */
@ApiTags('AI Chat')
@ApiBearerAuth()
@Controller('ai/chat')
export class AiChatController {
    constructor(
        private readonly chat: AIChatService,
        @Inject('IUserCourseService')
        private readonly userCourseService: IUserCourseService,
    ) { }

    /**
     * Sessiya olish yoki yaratish (Smart Session)
     * PaymentGuard: Faqat to'lov qilgan foydalanuvchilar uchun
     * 
     * Bu endpoint har safar AI button bosilganda chaqiriladi.
     * Backend avtomatik aniqlaydi:
     * - Agar mavjud faol sessiya bo'lsa (bir xil courseId va sessionLanguage bilan) → mavjud sessiyani qaytaradi
     * - Agar mavjud sessiya bo'lmasa → yangi yaratadi
     * 
     * Faqat courseId va sessionLanguage yuborish kifoya - backend o'zi aniqlaydi.
     */
    @UseGuards(AuthGuard, PaymentGuard)
    @Post('sessions')
    @ApiOperation({ summary: 'Sessiya olish yoki yaratish (Smart Session - avtomatik aniqlaydi)' })
    @ApiBadRequestResponse({
        description: 'Error response',
        type: AIErrorResponseDto
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                courseId: { type: 'number', example: 1, nullable: true, description: 'Kurs ID (ixtiyoriy)' },
                sessionLanguage: { type: 'string', example: 'ar', nullable: true, description: 'Sessiya tili (default: ar)' },
                sessionTitle: { type: 'string', example: "Yangi suhbat", nullable: true, description: 'Sessiya sarlavhasi (ixtiyoriy)' },
            },
        },
    })
    @ApiOkResponse({
        description: 'Sessiya (mavjud yoki yangi)', schema: {
            type: 'object',
            properties: {
                message: { type: 'string', example: 'ok' },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'number', example: 123 },
                        userId: { type: 'number', example: 456 },
                        courseId: { type: 'number', example: 1, nullable: true },
                        sessionLanguage: { type: 'string', example: 'ar' },
                        sessionTitle: { type: 'string', example: 'Yangi suhbat', nullable: true },
                        createdAt: { type: 'string', example: '2024-01-01T12:00:00.000Z' },
                        lastUpdatedAt: { type: 'string', example: '2024-01-01T12:00:00.000Z' },
                    }
                }
            }
        }
    })
    async createSession(@CurrentUser('id') userId: number, @Body() body: any) {
        // Debug: Session yaratish request logi
        try {
            console.log(`[AI Chat Controller] Create session request for user ${userId}, course ${body?.courseId}`);
        } catch (_) { }

        const { courseId, sessionLanguage, sessionTitle } = body || {};

        // Limit tekshiruvi - session yaratishdan OLDIN
        // Bu foydalanuvchiga limit holatini oldindan ko'rsatadi
        // Har bir kurs uchun alohida limit tekshiriladi
        try {
            const limitStatus = await this.chat.checkUserLimitStatus(userId, courseId || null);
            if (!limitStatus.canProceed) {
                // Limit oshib ketgan bo'lsa, error response qaytarish
                const courseInfo = courseId ? `kurs ${courseId}` : "umumiy chat";
                return {
                    message: 'error',
                    error: 'LIMIT_EXCEEDED',
                    data: {
                        message: `Oylik limit tugagan (${courseInfo}). Limit: $${limitStatus.limit}, Sarflangan: $${limitStatus.currentCost.toFixed(2)}, Qolgan: $${limitStatus.remaining.toFixed(2)}`,
                        currentCost: limitStatus.currentCost,
                        limit: limitStatus.limit,
                        remaining: limitStatus.remaining,
                        errorCode: 'LIMIT_EXCEEDED',
                    },
                };
            }
        } catch (error: any) {
            // Limit check xatosi - log qilish, lekin session yaratishni davom ettirish
            // (xatolik bo'lsa ham, session yaratishga ruxsat berish - defensive approach)
            // console.warn('⚠️  Limit check xatosi (session yaratish davom etadi):', error.message);
        }

        // Smart Session: Backend avtomatik aniqlaydi - mavjud faol sessiyani qaytaradi yoki yangi yaratadi
        const session = await this.chat.getOrCreateSession(userId, courseId, sessionLanguage, sessionTitle);

        try {
            console.log(`[AI Chat Controller] Session created/found with id ${session?.id}`);
        } catch (_) { }
        return { message: 'ok', data: session };
    }

    /**
     * Voice chat (foydalanuvchi ovoz yuboradi, AI ham ovozli javob beradi)
     * PaymentGuard: Faqat to'lov qilgan foydalanuvchilar uchun
     * 
     * Eslatma: courseId va language session'dan olinadi (session yaratilganda berilgan).
     * Bu parametrlarni yuborish shart emas - session'dan avtomatik olinadi.
     */
    @UseGuards(AuthGuard, PaymentGuard)
    @Post('voice')
    @ApiOperation({ summary: 'Ovoz yuborish va AI javobini olish (courseId va language sessiondan olinadi)' })
    @ApiConsumes('multipart/form-data')
    @ApiBadRequestResponse({
        description: 'Error response',
        type: AIErrorResponseDto
    })
    @ApiBody({
        schema: {
            type: 'object',
            required: ['file', 'sessionId'],
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                    description: 'Audio fayl (majburiy)'
                },
                sessionId: {
                    type: 'number',
                    example: 123,
                    description: 'Sessiya ID (majburiy)'
                },
                courseId: {
                    type: 'number',
                    example: 1,
                    nullable: true,
                    description: 'Kurs ID (ixtiyoriy - session\'dan avtomatik olinadi, yuborish shart emas)'
                },
                language: {
                    type: 'string',
                    example: 'ar',
                    nullable: true,
                    description: 'Til (ixtiyoriy - session\'dan avtomatik olinadi, default: ar, yuborish shart emas)'
                },
            },
        },
    })
    @ApiOkResponse({
        description: 'AI javobi', schema: {
            type: 'object',
            properties: {
                message: { type: 'string', example: 'ok' },
                data: {
                    $ref: '#/components/schemas/ChatResponseDto'
                }
            }
        }
    })
    @UseInterceptors(FileInterceptor('file'))
    @UsePipes(new ValidationPipe({ transform: true }))
    async sendVoice(@CurrentUser('id') userId: number, @UploadedFile() file: Express.Multer.File, @Body() body: VoiceRequestDto): Promise<{ message: string; data: ChatResponseDto } | { message: string; error: string; data: { message: string; errorCode: string } }> {
        // Debug: Request'dan kelayotgan ma'lumotlarni log qilish
        try {
            console.log(`[AI Chat Controller] Voice message request for user ${userId}, session ${body?.sessionId}`);
        } catch (e) {
            // Agar log qilishda xato bo'lsa, davom etamiz
        }
        // Audio fayl validatsiyasi (MIME/size)
        AudioUtils.validateUpload(file);
        const { sessionId, courseId, language } = body || ({} as VoiceRequestDto);
        if (!sessionId || Number.isNaN(Number(sessionId))) {
            throw new BadRequestException('sessionId noto\'g\'ri yoki yo\'q');
        }

        try {
            const msg = await this.chat.sendVoiceMessage({ userId, sessionId, audioBuffer: file?.buffer, courseId, language });
            const res: ChatResponseDto = {
                messageId: msg.id,
                sessionId: msg.sessionId,
                text: msg.aiResponseText || '',
                textUz: msg.aiResponseUzbek || '',
                audioUrl: msg.audioUrl || '',
                isWithinLimit: msg.isWithinLimit ?? true,
                createdAt: msg.createdAt,
            };
            return { message: 'ok', data: res };
        } catch (error: any) {
            // Limit exceeded exception'ni to'g'ri handle qilish
            if (error instanceof LimitExceededException) {
                // Limit oshib ketgan holat uchun aniq xabar qaytarish
                return {
                    message: 'error',
                    error: 'LIMIT_EXCEEDED',
                    data: {
                        message: error.message,
                        errorCode: 'LIMIT_EXCEEDED',
                    },
                };
            }

            // Boshqa xatolar uchun log va re-throw
            // console.error('[AI Chat Voice] Error in sendVoiceMessage:', error.message);
            // console.error('[AI Chat Voice] Error stack:', error.stack);
            throw error;
        }
    }

    /**
     * Sessiya xabarlarini olish
     */
    @UseGuards(AuthGuard)
    @ApiOperation({ summary: 'Sessiya xabarlarini olish' })
    @ApiParam({ name: 'id', type: Number, example: 123 })
    @ApiOkResponse({
        description: 'Sessiya xabarlari', schema: {
            type: 'object',
            properties: {
                message: { type: 'string', example: 'ok' },
                data: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'number', example: 789 },
                            sessionId: { type: 'number', example: 123 },
                            originalText: { type: 'string', example: 'مَا هَٰذَا؟' },
                            aiResponseText: { type: 'string', example: 'هَذَا بُرْتُقَالٌ.' },
                            audioUrl: { type: 'string', example: '/upload/audio/tts_1761595335910.mp3' },
                            isWithinLimit: { type: 'boolean', example: true },
                            createdAt: { type: 'string', example: '2024-01-01T12:05:00.000Z' }
                        }
                    }
                }
            }
        }
    })
    @Get('sessions/:id/messages')
    async getMessages(@CurrentUser('id') userId: number, @Param('id') id: string) {
        console.log(`[AI Chat Controller] Get messages request for user ${userId}, session ${id}`);
        // Sessiya mavjudligini va egasini tekshiradi
        const list = await this.chat.getMessages(Number(id), userId);
        return { message: 'ok', data: list };
    }

    /**
     * User'ning o'qiyotgan kurslarini olish
     */
    @UseGuards(AuthGuard)
    @Get('courses')
    @ApiOperation({ summary: "User'ning o'qiyotgan kurslarini olish" })
    @ApiOkResponse({
        description: "User'ning kurslari",
        schema: {
            type: 'object',
            properties: {
                message: { type: 'string', example: 'ok' },
                data: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            courseId: { type: 'number', example: 1 },
                            lang: { type: 'string', example: 'ar', nullable: true },
                            title: { type: 'string', example: 'Russian language' },
                            imageUrl: { type: 'string', example: '/upload/image.jpg', nullable: true },
                        }
                    }
                }
            }
        }
    })
    async getUserCourses(@CurrentUser('id') userId: number) {
        const { data: userCourses } = await this.userCourseService.findOneByUserId(userId);

        // Har bir UserCourse uchun course ma'lumotlarini olish
        const courses = userCourses.map(userCourse => ({
            courseId: userCourse.course.id,
            lang: userCourse.course.lang || null,
            title: userCourse.course.title,
            imageUrl: userCourse.course.imageUrl || null,
        }));

        return { message: 'ok', data: courses };
    }

    /**
     * Foydalanuvchi limit holatini tekshirish
     * Har bir kurs uchun alohida limit (2$) tekshiriladi
     * 
     * @param courseId - Kurs ID (ixtiyoriy - agar berilmasa, umumiy chat uchun limit ko'rsatiladi)
     */
    @UseGuards(AuthGuard)
    @Get('limit-status')
    @ApiOperation({
        summary: 'Foydalanuvchi limit holatini tekshirish',
        description: 'Har bir kurs uchun alohida oylik limit (2$) tekshiriladi. Agar courseId berilmasa, umumiy chat uchun limit ko\'rsatiladi.'
    })
    @ApiQuery({
        name: 'courseId',
        required: false,
        type: Number,
        description: 'Kurs ID (ixtiyoriy - agar berilmasa, umumiy chat uchun limit ko\'rsatiladi)',
        example: 1
    })
    @ApiOkResponse({
        description: 'Limit holati',
        schema: {
            type: 'object',
            properties: {
                message: { type: 'string', example: 'ok' },
                data: {
                    type: 'object',
                    properties: {
                        canProceed: {
                            type: 'boolean',
                            example: true,
                            description: 'Limit hali oshib ketmaganmi (true bo\'lsa, davom etish mumkin)'
                        },
                        currentCost: {
                            type: 'number',
                            example: 0.5,
                            description: 'Hozirgi oyda sarflangan summa (USD)'
                        },
                        limit: {
                            type: 'number',
                            example: 2.0,
                            description: 'Oylik limit (USD)'
                        },
                        remaining: {
                            type: 'number',
                            example: 1.5,
                            description: 'Qolgan limit (USD)'
                        },
                        courseId: {
                            type: 'number',
                            nullable: true,
                            example: 1,
                            description: 'Kurs ID (agar null bo\'lsa, umumiy chat uchun)'
                        }
                    }
                }
            }
        }
    })
    async getLimitStatus(
        @CurrentUser('id') userId: number,
        @Query('courseId') courseId?: string
    ) {
        const courseIdNumber = courseId ? Number(courseId) : null;

        // courseId validatsiyasi
        if (courseId && (isNaN(courseIdNumber) || courseIdNumber <= 0)) {
            throw new BadRequestException('courseId noto\'g\'ri formatda');
        }

        const limitStatus = await this.chat.checkUserLimitStatus(userId, courseIdNumber);

        return {
            message: 'ok',
            data: {
                ...limitStatus,
                courseId: courseIdNumber,
            }
        };
    }
}
