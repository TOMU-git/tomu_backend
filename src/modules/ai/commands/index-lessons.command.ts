import { Injectable } from "@nestjs/common";
import { Command, CommandRunner } from "nest-commander";
import { ChromaService } from "../services/chroma.service";

/**
 * IndexLessonsCommand
 * -------------------------------------------------------
 * Maqsad: Barcha darslarni ChromaDB ga indekslash (backfill).
 * 
 * Ishlatish:
 * npm run command index-lessons
 */
@Command({ name: 'index-lessons', description: 'Index all lessons to ChromaDB' })
@Injectable()
export class IndexLessonsCommand extends CommandRunner {
    constructor(private readonly chromaService: ChromaService) {
        super();
    }

    async run(): Promise<void> {
        console.log('🚀 Starting lessons indexing...');

        try {
            // Hozircha courseId = 1 ni indekslaymiz
            const result = await this.chromaService.indexCourse({ courseId: 1 });

            console.log(`✅ Successfully indexed ${result.indexed} lessons`);
            console.log('🎉 Indexing completed!');

        } catch (error) {
            console.error('❌ Indexing failed:', error.message);
            process.exit(1);
        }
    }
}

