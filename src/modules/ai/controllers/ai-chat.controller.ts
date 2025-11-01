import { Body, Controller, Get, Param, Post, UploadedFile, UseGuards, UseInterceptors, UsePipes, ValidationPipe, BadRequestException } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AIChatService } from "../services/ai-chat.service";
import { VoiceRequestDto } from "../dto/voice-request.dto";
import { ChatResponseDto } from "../dto/chat-response.dto";
import { AuthGuard } from "src/modules/shared/guards/auth.guard";
import { PaymentGuard } from "../guards/payment.guard";
import { CurrentUser } from "src/common/decorator/CurrentUser.decorator";
import { AudioUtils } from "../utils/audio.util";
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";

/**
 * AiChatController
 * -------------------------------------------------------
 * Maqsad: Voice chat endpointlari (faqat ovoz orqali muloqot).
 */
@ApiTags('AI Chat')
@ApiBearerAuth()
@Controller('ai/chat')
export class AiChatController {
    constructor(private readonly chat: AIChatService) { }

    /**
     * Yangi sessiya yaratish
     * PaymentGuard: Faqat to'lov qilgan foydalanuvchilar uchun
     */
    @UseGuards(AuthGuard, PaymentGuard)
    @Post('sessions')
    @ApiOperation({ summary: 'Yangi AI chat sessiyasi yaratish' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                courseId: { type: 'number', example: 1, nullable: true },
                sessionLanguage: { type: 'string', example: 'ar', nullable: true },
                sessionTitle: { type: 'string', example: "Yangi suhbat", nullable: true },
            },
        },
    })
    @ApiOkResponse({
        description: 'Sessiya yaratildi', schema: {
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
            console.log('[AI Chat Session] Incoming request:', {
                userId,
                body: {
                    courseId: body?.courseId,
                    sessionLanguage: body?.sessionLanguage,
                    sessionTitle: body?.sessionTitle,
                },
            });
        } catch (_) { }

        const { courseId, sessionLanguage, sessionTitle } = body || {};
        const session = await this.chat.createSession(userId, courseId, sessionLanguage, sessionTitle);
        try {
            console.log('[AI Chat Session] Created:', {
                id: session?.id,
                userId: session?.userId,
                courseId: session?.courseId,
                sessionLanguage: session?.sessionLanguage,
                sessionTitle: session?.sessionTitle,
            });
        } catch (_) { }
        return { message: 'ok', data: session };
    }

    /**
     * Voice chat (foydalanuvchi ovoz yuboradi, AI ham ovozli javob beradi)
     * PaymentGuard: Faqat to'lov qilgan foydalanuvchilar uchun
     */
    @UseGuards(AuthGuard, PaymentGuard)
    @Post('voice')
    @ApiOperation({ summary: 'Ovoz yuborish va AI javobini olish' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            required: ['file', 'sessionId'],
            properties: {
                file: { type: 'string', format: 'binary' },
                sessionId: { type: 'number', example: 123 },
                courseId: { type: 'number', example: 1, nullable: true },
                language: { type: 'string', example: 'ar', nullable: true },
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
    async sendVoice(@CurrentUser('id') userId: number, @UploadedFile() file: Express.Multer.File, @Body() body: VoiceRequestDto): Promise<{ message: string; data: ChatResponseDto }> {
        // Debug: Request'dan kelayotgan ma'lumotlarni log qilish
        try {
            const safeFileInfo = file ? {
                originalname: (file as any).originalname,
                mimetype: file.mimetype,
                size: file.size ?? file.buffer?.length,
            } : null;
            console.log("[AI Chat Voice] Incoming request:", {
                userId,
                body: {
                    sessionId: body?.sessionId,
                    courseId: body?.courseId,
                    language: body?.language,
                },
                file: safeFileInfo,
            });
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
                textUz: '', // O'zbekcha olib tashlandi - faqat arabcha
                audioUrl: msg.audioUrl || '',
                isWithinLimit: msg.isWithinLimit ?? true,
                createdAt: msg.createdAt,
            };
            return { message: 'ok', data: res };
        } catch (error: any) {
            console.error('[AI Chat Voice] Error in sendVoiceMessage:', error.message);
            console.error('[AI Chat Voice] Error stack:', error.stack);
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
        // Izoh: AIChatService sessiya egasini tekshiradi, guard esa tokenni tekshiradi
        const list = await this.chat.getMessages(Number(id));
        return { message: 'ok', data: list };
    }
}

