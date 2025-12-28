/**
 * Google Cloud Text-to-Speech Provider
 * -------------------------------------------------------
 * Arab tiliga maxsus native voice'lar bilan
 * 
 * Voice options:
 * - ar-XA-Standard-A (Female, Standard)
 * - ar-XA-Standard-B (Male, Standard)
 * - ar-XA-Standard-C (Male, Standard)
 * - ar-XA-Standard-D (Female, Standard)
 * - ar-XA-Wavenet-A (Female, High quality)
 * - ar-XA-Wavenet-B (Male, High quality)
 * - ar-XA-Wavenet-C (Male, High quality)
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { promises as fs } from 'fs';
import * as path from 'path';
import { TTSResponse } from '../tts.service';
import { AudioUtils } from '../../utils/audio.util';

@Injectable()
export class GoogleTTSProvider {
    private readonly logger = new Logger(GoogleTTSProvider.name);
    private readonly serviceAccountPath: string;
    private readonly apiKey: string; // Fallback (lekin REST API'da ishlamaydi)
    private readonly voice: string;
    private readonly languageCode: string;
    private readonly speakingRate: number;
    private serviceAccountValid: boolean = false; // ✅ Validatsiya flag
    private validationError: string | null = null; // ✅ Validatsiya error

    // 🔄 Token caching - har safar yangi token olmaslik
    private cachedToken: { token: string; expiresAt: number } | null = null;

    constructor(private readonly configService: ConfigService) {
        // Service Account JSON file path (tavsiya)
        this.serviceAccountPath = this.configService.get<string>('GOOGLE_TTS_SERVICE_ACCOUNT_PATH', '');

        // API Key (fallback, lekin REST API'da ishlamaydi - OAuth2 kerak)
        this.apiKey = this.configService.get<string>('GOOGLE_TTS_API_KEY', '');

        // Voice configuration
        this.voice = this.configService.get<string>('GOOGLE_TTS_VOICE', 'ar-XA-Wavenet-A');
        this.languageCode = this.configService.get<string>('GOOGLE_TTS_LANGUAGE', 'ar-XA');
        this.speakingRate = Number(this.configService.get<string>('GOOGLE_TTS_SPEED', '0.9'));

        // ✅ Service Account faylini darhol validatsiya qilish
        if (this.serviceAccountPath) {
            this.validateServiceAccount();
        }

        if (this.serviceAccountPath || this.apiKey) {
            this.logger.log(`🔊 Google TTS configured: ${this.voice} (${this.languageCode})`);
            if (this.apiKey && !this.serviceAccountPath) {
                this.logger.warn(`⚠️  Google TTS API key ishlatilmoqda, lekin REST API uchun Service Account JSON tavsiya qilinadi`);
            }
            // ✅ Validation natijasini ko'rsatish
            if (this.serviceAccountPath && !this.serviceAccountValid) {
                this.logger.error(`❌ Google TTS Service Account validation failed: ${this.validationError}`);
                this.logger.warn(`⚠️  Google TTS ishlamaydi, OpenAI TTS ishlatiladi (fallback)`);
            } else if (this.serviceAccountValid) {
                this.logger.log(`✅ Google TTS Service Account validated successfully`);
            }
        }
    }

    /**
     * ✅ Service Account JSON faylini validatsiya qilish (constructor'da)
     * Bu muammolarni runtime'dan oldin aniqlash imkonini beradi
     */
    private validateServiceAccount(): void {
        try {
            // 1. Faylning mavjudligini tekshirish (sync, chunki constructor'da)
            const fs_sync = require('fs');
            if (!fs_sync.existsSync(this.serviceAccountPath)) {
                this.validationError = `Service Account file not found: ${this.serviceAccountPath}`;
                this.serviceAccountValid = false;
                return;
            }

            // 2. Faylni o'qish va JSON parse qilish
            const fileContent = fs_sync.readFileSync(this.serviceAccountPath, 'utf-8');
            const serviceAccount = JSON.parse(fileContent);

            // 3. Kerakli maydonlarni tekshirish
            const requiredFields = ['type', 'project_id', 'private_key', 'client_email', 'client_id'];
            const missingFields = requiredFields.filter(field => !serviceAccount[field]);

            if (missingFields.length > 0) {
                this.validationError = `Service Account JSON missing required fields: ${missingFields.join(', ')}`;
                this.serviceAccountValid = false;
                return;
            }

            // 4. Type tekshirish
            if (serviceAccount.type !== 'service_account') {
                this.validationError = `Invalid Service Account type: ${serviceAccount.type} (expected: service_account)`;
                this.serviceAccountValid = false;
                return;
            }

            // 5. Private key formatini tekshirish
            if (!serviceAccount.private_key.includes('BEGIN PRIVATE KEY')) {
                this.validationError = 'Invalid private key format in Service Account JSON';
                this.serviceAccountValid = false;
                return;
            }

            // ✅ Barcha tekshiruvlar o'tdi
            this.serviceAccountValid = true;
            this.validationError = null;

        } catch (error: any) {
            this.validationError = `Service Account validation error: ${error.message}`;
            this.serviceAccountValid = false;
        }
    }

    /**
     * OAuth2 access token olish (Service Account JSON orqali)
     * 🔄 Token caching va retry mexanizmi bilan
     */
    private async getAccessToken(): Promise<string> {
        // ✅ Validatsiyadan o'tmagan bo'lsa, darhol error
        if (!this.serviceAccountValid) {
            throw new Error(`Service Account validation failed: ${this.validationError}`);
        }

        if (!this.serviceAccountPath) {
            throw new Error('GOOGLE_TTS_SERVICE_ACCOUNT_PATH not configured. Service Account JSON file path kerak.');
        }

        // 🔄 Agar cache'da token bor va hali expired bo'lmagan bo'lsa, qaytarish
        if (this.cachedToken && this.cachedToken.expiresAt > Date.now()) {
            this.logger.debug(`🔄 Using cached OAuth2 token (expires in ${Math.floor((this.cachedToken.expiresAt - Date.now()) / 1000)}s)`);
            return this.cachedToken.token;
        }

        // 🔄 Retry mexanizmi bilan token olish (tezroq)
        const maxRetries = 3;
        const retryDelays = [200, 500, 1000]; // ms - tezroq retry
        let lastError: any;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                this.logger.debug(`🔑 Getting OAuth2 token (attempt ${attempt}/${maxRetries})...`);

                // Service Account JSON file'ni o'qish
                let serviceAccount: any;
                try {
                    serviceAccount = JSON.parse(await fs.readFile(this.serviceAccountPath, 'utf-8'));
                } catch (fileError: any) {
                    this.logger.error(`❌ Failed to read Service Account file: ${fileError.message}`);
                    throw new Error(`Service Account file error: ${fileError.message}`);
                }

                // JWT yaratish
                let jwtToken: string;
                try {
                    const jwt = require('jsonwebtoken');
                    const now = Math.floor(Date.now() / 1000);

                    jwtToken = jwt.sign(
                        {
                            iss: serviceAccount.client_email,
                            sub: serviceAccount.client_email,
                            aud: 'https://oauth2.googleapis.com/token',
                            exp: now + 3600,
                            iat: now,
                            scope: 'https://www.googleapis.com/auth/cloud-platform',
                        },
                        serviceAccount.private_key,
                        { algorithm: 'RS256' }
                    );
                } catch (jwtError: any) {
                    this.logger.error(`❌ Failed to create JWT: ${jwtError.message}`);
                    throw new Error(`JWT creation error: ${jwtError.message}`);
                }

                // OAuth2 token olish (timeout bilan)
                try {
                    const response = await axios.post<{ access_token: string }>(
                        'https://oauth2.googleapis.com/token',
                        {
                            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                            assertion: jwtToken,
                        },
                        {
                            timeout: 5000, // 5 soniya timeout (tezroq)
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded',
                            },
                        }
                    );

                    const accessToken = response.data.access_token;
                    if (!accessToken) {
                        throw new Error('No access_token in response');
                    }

                    // 🔄 Token'ni cache'ga saqlash (30 minut - security uchun)
                    this.cachedToken = {
                        token: accessToken,
                        expiresAt: Date.now() + (30 * 60 * 1000), // 30 minut
                    };

                    this.logger.debug(`✅ OAuth2 token received and cached (expires in 30min)`);
                    return accessToken;

                } catch (axiosError: any) {
                    // Axios error detallari
                    if (axiosError.code === 'ECONNABORTED') {
                        throw new Error(`Request timeout after 5s`);
                    } else if (axiosError.code === 'ENOTFOUND' || axiosError.code === 'ECONNREFUSED') {
                        throw new Error(`Network error: ${axiosError.code}`);
                    } else if (axiosError.response) {
                        throw new Error(`HTTP ${axiosError.response.status}: ${JSON.stringify(axiosError.response.data)}`);
                    } else {
                        throw new Error(`Request failed: ${axiosError.message}`);
                    }
                }

            } catch (error: any) {
                lastError = error;
                this.logger.warn(`❌ OAuth2 token attempt ${attempt}/${maxRetries} failed: ${error.message}`);

                // Agar bu oxirgi urinish bo'lmasa, kutish va qayta urinish
                if (attempt < maxRetries) {
                    const delay = retryDelays[attempt - 1] || 1000;
                    this.logger.debug(`⏳ Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    // Oxirgi urinish - batafsil error log
                    this.logger.error(`❌ All ${maxRetries} OAuth2 token attempts failed`);
                    this.logger.error(`   Final error: ${error.message}`);
                    this.logger.error(`   Error type: ${error.constructor.name}`);
                    if (error.stack) {
                        this.logger.error(`   Stack: ${error.stack.split('\n').slice(0, 3).join('\n')}`);
                    }
                }
            }
        }

        // Barcha urinishlar muvaffaqiyatsiz
        throw new Error(`Failed to get access token after ${maxRetries} attempts: ${lastError.message}`);
    }

    /**
     * Text-to-Speech orqali audio yaratish
     */
    async generateSpeech(params: { text: string; language: string }): Promise<TTSResponse> {
        if (!this.serviceAccountPath && !this.apiKey) {
            this.logger.warn('⚠️  Google TTS credentials not configured');
            throw new Error('Google TTS credentials not configured');
        }

        try {
            let accessToken: string | null = null;

            // Service Account JSON orqali OAuth2 token olish (tavsiya)
            if (this.serviceAccountPath) {
                try {
                    accessToken = await this.getAccessToken();
                } catch (error: any) {
                    this.logger.error(`❌ Failed to get OAuth2 token: ${error.message}`);
                    throw error;
                }
            }

            // Google Cloud TTS API request
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };

            // OAuth2 token yoki API key (lekin API key REST API'da ishlamaydi)
            if (accessToken) {
                headers['Authorization'] = `Bearer ${accessToken}`;
            }

            const url = accessToken
                ? 'https://texttospeech.googleapis.com/v1/text:synthesize'
                : `https://texttospeech.googleapis.com/v1/text:synthesize?key=${this.apiKey}`;

            // SSML yoki oddiy text'ni aniqlash
            // Agar text <speak> tag'i bilan boshlansa, SSML formatida yuborish
            const isSSML = params.text.trim().startsWith('<speak>');
            const inputField = isSSML ? 'ssml' : 'text';

            this.logger.log(`🔊 Google TTS: ${isSSML ? 'SSML' : 'Text'} format`);

            const response = await axios.post(
                url,
                {
                    input: { [inputField]: params.text }, // ssml yoki text
                    voice: {
                        languageCode: this.languageCode,
                        name: this.voice,
                    },
                    audioConfig: {
                        audioEncoding: 'MP3',
                        speakingRate: this.speakingRate,
                        pitch: 0.0, // Neutral pitch
                        volumeGainDb: 0.0, // Neutral volume
                    },
                },
                { headers }
            );

            // Audio content (base64 encoded)
            const responseData = response.data as { audioContent?: string };
            const audioContent = responseData.audioContent;
            if (!audioContent) {
                throw new Error('No audio content in response');
            }

            // Save to file
            const outDir = path.resolve(process.cwd(), 'upload', 'audio');
            await fs.mkdir(outDir, { recursive: true });
            const filename = `tts_google_${Date.now()}.mp3`;
            const fullPath = path.join(outDir, filename);

            // Decode base64 and save
            const buffer = Buffer.from(audioContent, 'base64');
            await fs.writeFile(fullPath, buffer);

            const audioUrl = `/upload/audio/${filename}`;
            const characters = params.text.length;

            // Audio duration'ni hisoblash
            const duration = await AudioUtils.getAudioDuration(fullPath, buffer.length);

            this.logger.log(`✅ Google TTS generated: ${characters} chars -> ${audioUrl} (${duration}s)`);

            return { audioUrl, characters, duration };
        } catch (error: any) {
            this.logger.error(`❌ Google TTS error: ${error.message}`);

            // Detailed error logging
            if (error.response) {
                this.logger.error(`   Status: ${error.response.status}`);
                this.logger.error(`   Data: ${JSON.stringify(error.response.data)}`);
            }

            // ⚠️ Exception throw qilish - fallback uchun
            // TTSService.generateWithGoogle() catch qilib OpenAI'ga o'tadi
            throw error;
        }
    }

    /**
     * Provider availability check
     * ✅ Endi faqat path emas, balki validatsiya ham tekshiriladi
     */
    isAvailable(): boolean {
        // Service Account path bor va validatsiyadan o'tgan bo'lsa
        if (this.serviceAccountPath) {
            return this.serviceAccountValid;
        }
        // Yoki API key bor bo'lsa (lekin bu ishlamaydi Google TTS'da)
        return !!this.apiKey;
    }

    /**
     * Provider info
     */
    getInfo(): {
        provider: string;
        voice: string;
        language: string;
        speed: number;
    } {
        return {
            provider: 'Google Cloud TTS',
            voice: this.voice,
            language: this.languageCode,
            speed: this.speakingRate,
        };
    }
}

