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

@Injectable()
export class GoogleTTSProvider {
    private readonly logger = new Logger(GoogleTTSProvider.name);
    private readonly serviceAccountPath: string;
    private readonly apiKey: string; // Fallback (lekin REST API'da ishlamaydi)
    private readonly voice: string;
    private readonly languageCode: string;
    private readonly speakingRate: number;

    constructor(private readonly configService: ConfigService) {
        // Service Account JSON file path (tavsiya)
        this.serviceAccountPath = this.configService.get<string>('GOOGLE_TTS_SERVICE_ACCOUNT_PATH', '');
        
        // API Key (fallback, lekin REST API'da ishlamaydi - OAuth2 kerak)
        this.apiKey = this.configService.get<string>('GOOGLE_TTS_API_KEY', '');
        
        // Voice configuration
        this.voice = this.configService.get<string>('GOOGLE_TTS_VOICE', 'ar-XA-Wavenet-A');
        this.languageCode = this.configService.get<string>('GOOGLE_TTS_LANGUAGE', 'ar-XA');
        this.speakingRate = Number(this.configService.get<string>('GOOGLE_TTS_SPEED', '0.9'));

        if (this.serviceAccountPath || this.apiKey) {
            this.logger.log(`🔊 Google TTS enabled: ${this.voice} (${this.languageCode})`);
            if (this.apiKey && !this.serviceAccountPath) {
                this.logger.warn(`⚠️  Google TTS API key ishlatilmoqda, lekin REST API uchun Service Account JSON tavsiya qilinadi`);
            }
        }
    }

    /**
     * OAuth2 access token olish (Service Account JSON orqali)
     */
    private async getAccessToken(): Promise<string> {
        if (!this.serviceAccountPath) {
            throw new Error('GOOGLE_TTS_SERVICE_ACCOUNT_PATH not configured. Service Account JSON file path kerak.');
        }

        try {
            // Service Account JSON file'ni o'qish
            const serviceAccount = JSON.parse(await fs.readFile(this.serviceAccountPath, 'utf-8'));
            
            // JWT yaratish va OAuth2 token olish
            const jwt = require('jsonwebtoken');
            const now = Math.floor(Date.now() / 1000);
            
            const token = jwt.sign(
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

            // OAuth2 token olish
            const response = await axios.post<{ access_token: string }>('https://oauth2.googleapis.com/token', {
                grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                assertion: token,
            });

            return response.data.access_token;
        } catch (error: any) {
            throw new Error(`Failed to get access token: ${error.message}`);
        }
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

            const response = await axios.post(
                url,
                {
                    input: { text: params.text },
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

            this.logger.log(`✅ Google TTS generated: ${characters} chars -> ${audioUrl}`);

            return { audioUrl, characters };
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
     */
    isAvailable(): boolean {
        return !!(this.serviceAccountPath || this.apiKey);
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

