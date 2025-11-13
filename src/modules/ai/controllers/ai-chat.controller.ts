import { Body, Controller, Get, Param, Post, Query, UploadedFile, UseGuards, UseInterceptors, UsePipes, ValidationPipe, BadRequestException, Inject, CallHandler, ExecutionContext, NestInterceptor } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Observable } from "rxjs";
import { AIChatService } from "../services/ai-chat.service";
import { VoiceRequestDto } from "../dto/voice-request.dto";
import { ChatResponseDto, ChatMessageDto } from "../dto/chat-response.dto";
import { AuthGuard } from "src/modules/shared/guards/auth.guard";
import { PaymentGuard } from "../guards/payment.guard";
import { CurrentUser } from "src/common/decorator/CurrentUser.decorator";
import { AudioUtils } from "../utils/audio.util";
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags, ApiBadRequestResponse } from "@nestjs/swagger";
import { LimitExceededException } from "../exceptions/limit-exceeded.exception";
import { AIErrorResponseDto } from "../dto/error-response.dto";
import { IUserCourseService } from "src/modules/user-courses/interfaces/user-course.service";

/**
 * OptionalFileInterceptor
 * -------------------------------------------------------
 * FileInterceptor'ni shartli qilish - faqat multipart/form-data uchun ishlaydi
 * ValidationPipe'dan oldin ishlaydi - file property'sini o'chiradi
 * 
 * Eslatma: Interceptor'lar teskari tartibda ishlaydi, shuning uchun bu birinchi ishlaydi
 */
class OptionalFileInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const contentType = request.headers['content-type'] || '';

        // application/json uchun file property'sini o'chirish (validation'dan oldin)
        // Bu global ValidationPipe'dan oldin ishlaydi
        if (!contentType.includes('multipart/form-data')) {
            // Request body'ni parse qilish (agar hali parse qilinmagan bo'lsa)
            if (request.body && typeof request.body === 'object') {
                // file property'sini o'chirish
                if (request.body.file !== undefined) {
                    delete request.body.file;
                }
            }

            // Request body'ni yangilash - ValidationPipe uchun
            // Bu global ValidationPipe'dan oldin ishlaydi
            if (request.body && typeof request.body === 'object') {
                // Body'ni yangilash
                request.body = { ...request.body };
                delete request.body.file;
            }
        }

        return next.handle();
    }
}

/**
 * AiChatController
 * -------------------------------------------------------
 * Maqsad: Voice/Text chat endpointlari.
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
     * 
     * History: Agar body'da history='history' bo'lsa, AI ga so'rov yuborilmaydi, faqat message'lar qaytariladi.
     */
    @UseGuards(AuthGuard, PaymentGuard)
    @Post('voice')
    @ApiOperation({ summary: 'Ovoz yuborish va AI javobini olish (courseId va language sessiondan olinadi)' })
    @ApiConsumes('multipart/form-data', 'application/json')
    @ApiBadRequestResponse({
        description: 'Error response',
        type: AIErrorResponseDto
    })
    @ApiBody({
        schema: {
            type: 'object',
            required: ['sessionId'],
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
                history: {
                    type: 'string',
                    example: 'history',
                    description: 'History so\'rovi (agar "history" bo\'lsa, faqat message\'lar qaytariladi)'
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
    @UseInterceptors(
        OptionalFileInterceptor, // Birinchi ishlaydi (validation'dan oldin) - file property'sini o'chiradi
        FileInterceptor('file', {
            limits: { fileSize: 15 * 1024 * 1024 },
            fileFilter: (req, file, cb) => {
                // File optional - agar file bo'lmasa, ruxsat berish
                cb(null, true);
            }
        })
    )
    // Controller'dagi ValidationPipe global ValidationPipe'ni override qiladi
    @UsePipes(new ValidationPipe({
        transform: true,
        skipMissingProperties: true,
        whitelist: false, // Whitelist'ni o'chirish - barcha property'larni qabul qilish
        forbidNonWhitelisted: false, // File property'sini qabul qilish uchun
        skipUndefinedProperties: true, // Undefined property'larni o'tkazib yuborish
    }))
    async sendVoice(@CurrentUser('id') userId: number, @UploadedFile() file: Express.Multer.File | undefined, @Body() body: VoiceRequestDto): Promise<{ message: string; data: ChatResponseDto } | { message: string; error: string; data: { message: string; errorCode: string } }> {

        const { sessionId, history } = body || ({} as VoiceRequestDto);

        if (!sessionId || Number.isNaN(Number(sessionId))) {
            throw new BadRequestException('sessionId noto\'g\'ri yoki yo\'q');
        }

        // History so'rovi - faqat message'larni qaytarish
        if (history === 'history') {
            const messages = await this.chat.getMessages(sessionId, userId);
            // Oxirgi 20 ta message'ni qaytarish
            const limitedMessages = messages.slice(0, 20).map(msg => ({
                id: msg.id,
                sessionId: msg.sessionId,
                senderType: msg.senderType,
                originalText: msg.originalText || undefined,
                aiResponseText: msg.aiResponseText || undefined,
                aiResponseUzbek: msg.aiResponseUzbek || undefined,
                audioUrl: msg.audioUrl || undefined,
                isWithinLimit: msg.isWithinLimit ?? true,
                createdAt: msg.createdAt,
            }));

            const res: ChatResponseDto = {
                messageId: 0,
                sessionId: sessionId,
                text: '',
                textUz: '',
                audioUrl: undefined,
                isWithinLimit: true,
                createdAt: new Date(),
                messages: limitedMessages,
            };
            return { message: 'ok', data: res };
        }

        // File validatsiyasi
        if (!file) {
            throw new BadRequestException('Audio fayl yuborish kerak');
        }

        let msg: any;

        try {
            // Audio fayl validatsiyasi (MIME/size)
            AudioUtils.validateUpload(file);
            msg = await this.chat.sendVoiceMessage({
                userId,
                sessionId,
                audioBuffer: file?.buffer,
                mimetype: file?.mimetype
            });

            // Message'larni olish (oxirgi 20 ta)
            const messages = await this.chat.getMessages(sessionId, userId);
            const limitedMessages = messages.slice(0, 20).map(m => ({
                id: m.id,
                sessionId: m.sessionId,
                senderType: m.senderType,
                originalText: m.originalText || undefined,
                aiResponseText: m.aiResponseText || undefined,
                aiResponseUzbek: m.aiResponseUzbek || undefined,
                audioUrl: m.audioUrl || undefined,
                isWithinLimit: m.isWithinLimit ?? true,
                createdAt: m.createdAt,
            }));

            const res: ChatResponseDto = {
                messageId: msg.id,
                sessionId: msg.sessionId,
                text: msg.aiResponseText || '',
                textUz: msg.aiResponseUzbek || '',
                audioUrl: msg.audioUrl || '',
                isWithinLimit: msg.isWithinLimit ?? true,
                createdAt: msg.createdAt,
                messages: limitedMessages,
            };
            return { message: 'ok', data: res };
        } catch (error: any) {
            // Limit exceeded exception'ni to'g'ri handle qilish
            if (error instanceof LimitExceededException) {
                return {
                    message: 'error',
                    error: 'LIMIT_EXCEEDED',
                    data: {
                        message: error.message,
                        errorCode: 'LIMIT_EXCEEDED',
                    },
                };
            }

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
