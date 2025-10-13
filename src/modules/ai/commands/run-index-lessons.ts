import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../../app.module';
import { ChromaService } from '../services/chroma.service';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule, {
        logger: ['error', 'warn', 'log'],
    });
    try {
        const chroma = app.get(ChromaService);
        const res = await chroma.indexCourse({ courseId: 1 });
        console.log(`Indexed chunks: ${res.indexed}`);
    } catch (e: any) {
        console.error('Indexing failed:', e?.message || e);
        process.exitCode = 1;
    } finally {
        await app.close();
    }
}

bootstrap();


