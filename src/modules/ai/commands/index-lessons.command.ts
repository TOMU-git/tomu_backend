import { Injectable } from "@nestjs/common";
import { Command, CommandRunner } from "nest-commander";
import { ChromaService } from "../services/chroma.service";

/**
 * IndexLessonsCommand
 * -------------------------------------------------------
 * Maqsad: Barcha darslarni ChromaDB ga indekslash (backfill).
 * 
 * Ishlatish:
 * npm run ai:index-lessons
 */
@Command({ name: 'index-lessons', description: 'Index all lessons to ChromaDB' })
@Injectable()
export class IndexLessonsCommand extends CommandRunner {
    constructor(private readonly chromaService: ChromaService) {
        super();
    }

    async run(): Promise<void> {
        try {
            const result = await this.chromaService.indexCourse({ courseId: 1 });
        } catch (error) {
            console.error('❌ Indexing failed:', error.message);
            process.exit(1);
        }
    }
}

