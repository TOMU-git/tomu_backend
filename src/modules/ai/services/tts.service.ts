import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { promises as fs } from "fs";
import * as path from "path";
import { AudioUtils } from "../utils/audio.util";

// Environment variables (OpenAI TTS - fallback)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const TTS_MODEL = process.env.TTS_MODEL || "tts-1-hd"; // tts-1-hd (high quality) or tts-1 (faster)
const TTS_VOICE = process.env.TTS_VOICE || "shimmer"; // alloy, echo, fable, onyx, nova, shimmer
const TTS_SPEED = Number(process.env.TTS_SPEED || 0.85); // ✅ 0.85 arabcha uchun yaxshiroq (0.25-4.0 range)

// Console verification
// console.log("🔊 TTS Configuration:");
// console.log(`   TTS_MODEL: ${TTS_MODEL}`);
// console.log(`   TTS_VOICE: ${TTS_VOICE}`);
// console.log(`   TTS_SPEED: ${TTS_SPEED}`);

/**
 * TTS usage ma'lumotlari
 */
export interface TTSUsage {
    characters: number;
    audioUrl: string;
}

/**
 * TTS response with usage
 */
export interface TTSResponse {
    audioUrl: string;
    characters?: number;
    duration?: number; // Audio davomiyligi (soniyalarda)
}

/**
 * TTSService
 * -------------------------------------------------------
 * Maqsad: Matndan audio yaratish (adapter pattern).
 * 
 * Provider'lar:
 * - Google Cloud TTS (tavsiya - arab tiliga native)
 * - OpenAI TTS (fallback - universal voice)
 */
@Injectable()
export class TTSService implements OnModuleInit {
    private readonly logger = new Logger(TTSService.name);
    private provider: 'google' | 'openai';
    private googleTTS: any; // GoogleTTSProvider
    private initialized = false;

    constructor(private readonly configService: ConfigService) {
        // Provider tanlash (environment variable orqali)
        this.provider = this.configService.get<string>('TTS_PROVIDER', 'openai') as 'google' | 'openai';
    }

    /**
     * Module initialization - log'larni chiqarish
     */
    async onModuleInit() {
        await this.initializeProvider();
    }

    /**
     * Provider'ni initialize qilish va log chiqarish
     */
    private async initializeProvider() {
        if (this.initialized) return;

        const configuredProvider = this.configService.get<string>('TTS_PROVIDER', 'openai');
        this.logger.log(`🔊 [TTS] Initializing TTS provider (configured: ${configuredProvider})...`);

        // Google TTS ni lazy load qilish (optional dependency)
        if (this.provider === 'google') {
            try {
                const { GoogleTTSProvider } = require('./tts-providers/google-tts.provider');
                this.googleTTS = new GoogleTTSProvider(this.configService);

                if (this.googleTTS.isAvailable()) {
                    const info = this.googleTTS.getInfo();
                    this.logger.log(`✅ [TTS] Provider: Google Cloud TTS`);
                    this.logger.log(`   Voice: ${info.voice}`);
                    this.logger.log(`   Language: ${info.language}`);
                    this.logger.log(`   Speed: ${info.speed}`);
                } else {
                    this.logger.warn(`⚠️  [TTS] Google TTS not available, falling back to OpenAI`);
                    this.provider = 'openai';
                    this.logProviderInfo();
                }
            } catch (error: any) {
                this.logger.error(`❌ [TTS] Google TTS load error, falling back to OpenAI: ${error.message}`);
                this.provider = 'openai';
                this.logProviderInfo();
            }
        } else {
            this.logProviderInfo();
        }

        this.initialized = true;
    }

    /**
     * Provider ma'lumotlarini log qilish
     */
    private logProviderInfo() {
        if (this.provider === 'openai') {
            this.logger.log(`✅ [TTS] Provider: OpenAI`);
            this.logger.log(`   Model: ${TTS_MODEL}`);
            this.logger.log(`   Voice: ${TTS_VOICE}`);
            this.logger.log(`   Speed: ${TTS_SPEED}`);
        }
    }
    /**
     * Text -> Speech (backward compatible)
     * @deprecated Use textToSpeechWithUsage() for cost tracking
     */
    async textToSpeech(params: { text: string; language: string; }): Promise<string> {
        if (!OPENAI_API_KEY) {
            return "/upload/audio/placeholder.mp3";
        }

        try {
            const res = await axios.post(
                "https://api.openai.com/v1/audio/speech",
                {
                    model: TTS_MODEL,
                    voice: TTS_VOICE,
                    input: params.text,
                    speed: TTS_SPEED,
                    response_format: "mp3",
                },
                { responseType: "arraybuffer", headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } }
            );

            const outDir = path.resolve(process.cwd(), "upload", "audio");
            await fs.mkdir(outDir, { recursive: true });
            const filename = `tts_${Date.now()}.mp3`;
            const full = path.join(outDir, filename);
            await fs.writeFile(full, Buffer.from(res.data as any));

            const audioUrl = `/upload/audio/${filename}`;
            return audioUrl;
        } catch (e: any) {
            // console.log(`❌ TTS Error: ${e.message}`);
            return "/upload/audio/placeholder.mp3";
        }
    }

    /**
     * Qaysi TTS provider ishlatilayotganini qaytarish
     * Bu SSML qo'llab-quvvatlashni aniqlash uchun kerak
     */
    getProvider(): 'google' | 'openai' {
        return this.provider;
    }

    /**
     * SSML qo'llab-quvvatlanishini tekshirish
     * Google TTS SSML'ni to'liq qo'llab-quvvatlaydi
     * OpenAI TTS SSML'ni qo'llab-quvvatlamaydi
     */
    supportsSSML(): boolean {
        return this.provider === 'google';
    }

    /**
     * Text -> Speech (usage ma'lumotlari bilan)
     * @param params - Text va language
     * @returns Audio URL va character count (cost tracking uchun)
     */
    async textToSpeechWithUsage(params: { text: string; language: string; }): Promise<TTSResponse> {
        // Agar hali initialize bo'lmagan bo'lsa, initialize qilish
        if (!this.initialized) {
            await this.initializeProvider();
        }

        // Provider'ga qarab to'g'ri method'ni chaqirish
        if (this.provider === 'google' && this.googleTTS) {
            return await this.generateWithGoogle(params);
        } else {
            return await this.generateWithOpenAI(params);
        }
    }

    /**
     * Google Cloud TTS orqali audio yaratish
     */
    private async generateWithGoogle(params: { text: string; language: string }): Promise<TTSResponse> {
        try {
            return await this.googleTTS.generateSpeech(params);
        } catch (error: any) {
            this.logger.error(`❌ Google TTS failed, falling back to OpenAI: ${error.message}`);
            return await this.generateWithOpenAI(params);
        }
    }

    /**
     * SSML tag'larini olib tashlash (OpenAI TTS uchun)
     * OpenAI TTS SSML ni qo'llab-quvvatlamaydi
     */
    private cleanSSMLForOpenAI(text: string): string {
        // SSML opening tag'larini olib tashlash
        text = text.replace(/<[^>]*>/g, '');
        // Speak tag'larini olib tashlash
        text = text.replace(/<\/speak>/gi, '');
        // Qolgan SSML elementlarini olib tashlash
        text = text.replace(/<\/?[^>]+(>|$)/g, '');
        // Ko'p bo'shliqlarni bitta bo'shliqqa almashtirish
        text = text.replace(/\s+/g, ' ').trim();
        return text;
    }

    /**
     * OpenAI TTS orqali audio yaratish (fallback)
     */
    private async generateWithOpenAI(params: { text: string; language: string }): Promise<TTSResponse> {
        if (!OPENAI_API_KEY) {
            return { audioUrl: "/upload/audio/placeholder.mp3", characters: 0 };
        }

        // OpenAI TTS SSML ni qo'llab-quvvatlamaydi, shuning uchun SSML tag'larini olib tashlash
        const cleanText = this.cleanSSMLForOpenAI(params.text);

        // Log for debugging
        if (params.text !== cleanText) {
            this.logger.debug(`🧹 [TTS] SSML cleaned for OpenAI: ${params.text.length} -> ${cleanText.length} chars`);
        }

        try {
            const res = await axios.post(
                "https://api.openai.com/v1/audio/speech",
                {
                    model: TTS_MODEL,
                    voice: TTS_VOICE,
                    input: cleanText,
                    speed: TTS_SPEED,
                    response_format: "mp3",
                },
                { responseType: "arraybuffer", headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } }
            );

            const outDir = path.resolve(process.cwd(), "upload", "audio");
            await fs.mkdir(outDir, { recursive: true });
            const filename = `tts_openai_${Date.now()}.mp3`;
            const full = path.join(outDir, filename);
            const audioBuffer = Buffer.from(res.data as any);
            await fs.writeFile(full, audioBuffer);

            const audioUrl = `/upload/audio/${filename}`;
            const characters = params.text.length;

            // Audio duration'ni hisoblash
            const duration = await AudioUtils.getAudioDuration(full, audioBuffer.length);

            return { audioUrl, characters, duration };
        } catch (e: any) {
            this.logger.error(`❌ OpenAI TTS Error: ${e.message}`);
            return { audioUrl: "/upload/audio/placeholder.mp3", characters: 0 };
        }
    }
}

