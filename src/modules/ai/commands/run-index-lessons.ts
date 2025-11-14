/**
 * Bu script kurs darslarini vektorli ma'lumotlar bazasiga (ChromaDB) indekslash uchun ishlatiladi.
 * 
 * Nima uchun kerak:
 * - AI tizimi darslar bilan ishlash uchun ularni vektorli formatda saqlash kerak
 * - Bu script kurs materiallarini qismlarga bo'lib, har bir qismni embedding qilib saqlaydi
 * - Indekslangan ma'lumotlar keyinchalik semantic search va AI javoblar uchun ishlatiladi
 */

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../../app.module';
import { ChromaService } from '../services/chroma.service';

/**
 * NestJS application context yaratib, kursni indekslaydi
 * Application context - to'liq server ishga tushirmasdan faqat servislarni ishlatish uchun
 */
async function bootstrap() {
    // NestJS application context yaratiladi (to'liq HTTP server emas, faqat servislar)
    const app = await NestFactory.createApplicationContext(AppModule, {
        logger: ['error', 'warn', 'log'], // Faqat muhim loglar ko'rsatiladi
    });
    try {
        // ChromaService olinadi - vektorli ma'lumotlar bazasi bilan ishlash uchun
        const chroma = app.get(ChromaService);

        // Kurs ID=1 bo'lgan kursning barcha darslarini indekslaydi
        // Bu jarayon darslarni qismlarga bo'lib, har birini embedding qiladi
        const res = await chroma.indexCourse({ courseId: 1 });
    } catch (e: any) {
        console.error('Indexing failed:', e?.message || e);
        process.exitCode = 1;
    } finally {
        // Har doim application context yopiladi (resurslarni tozalash)
        await app.close();
    }
}

bootstrap();


