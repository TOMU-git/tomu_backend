import { Body, Controller, Get, Param, Post, UploadedFile, UseGuards, UseInterceptors, UsePipes, ValidationPipe, BadRequestException } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AIChatService } from "../services/ai-chat.service";
import { VoiceRequestDto } from "../dto/voice-request.dto";
import { ChatResponseDto } from "../dto/chat-response.dto";
import { AuthGuard } from "src/modules/shared/guards/auth.guard";
import { CurrentUser } from "src/common/decorator/CurrentUser.decorator";
import { AudioUtils } from "../utils/audio.util";

/**
 * AiChatController
 * -------------------------------------------------------
 * Maqsad: Voice chat endpointlari (faqat ovoz orqali muloqot).
 */
@Controller('ai/chat')
export class AiChatController {
    constructor(private readonly chat: AIChatService) { }

    /**
     * Yangi sessiya yaratish
     */
    @UseGuards(AuthGuard)
    @Post('sessions')
    async createSession(@CurrentUser('id') userId: number, @Body() body: any) {
        const { courseId, sessionLanguage, sessionTitle } = body || {};
        const session = await this.chat.createSession(userId, courseId, sessionLanguage, sessionTitle);
        return { message: 'ok', data: session };
    }

    /**
     * Voice chat (foydalanuvchi ovoz yuboradi, AI ham ovozli javob beradi)
     */
    @UseGuards(AuthGuard)
    @Post('voice')
    @UseInterceptors(FileInterceptor('file'))
    @UsePipes(new ValidationPipe({ transform: true }))
    async sendVoice(@CurrentUser('id') userId: number, @UploadedFile() file: Express.Multer.File, @Body() body: VoiceRequestDto): Promise<{ message: string; data: ChatResponseDto }> {
        // Audio fayl validatsiyasi (MIME/size)
        AudioUtils.validateUpload(file);
        const { sessionId, courseId, language } = body || ({} as VoiceRequestDto);
        if (!sessionId || Number.isNaN(Number(sessionId))) {
            throw new BadRequestException('sessionId noto\'g\'ri yoki yo\'q');
        }
        const msg = await this.chat.sendVoiceMessage({ userId, sessionId, audioBuffer: file?.buffer, courseId, language });
        const res: ChatResponseDto = {
            messageId: msg.id,
            sessionId: msg.sessionId,
            text: msg.aiResponseText,
            textUz: '', // O'zbekcha olib tashlandi - faqat arabcha
            audioUrl: msg.audioUrl,
            isWithinLimit: msg.isWithinLimit,
            createdAt: msg.createdAt,
        };
        return { message: 'ok', data: res };
    }

    /**
     * Sessiya xabarlarini olish
     */
    @UseGuards(AuthGuard)
    @Get('sessions/:id/messages')
    async getMessages(@CurrentUser('id') userId: number, @Param('id') id: string) {
        // Izoh: AIChatService sessiya egasini tekshiradi, guard esa tokenni tekshiradi
        const list = await this.chat.getMessages(Number(id));
        return { message: 'ok', data: list };
    }
}

