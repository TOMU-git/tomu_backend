import { Injectable } from "@nestjs/common";
import { promises as fs } from "fs";
import * as path from "path";
import { ChromaConnectionService } from "./chroma-connection.service";
import { ChromaEmbeddingService } from "./chroma-embedding.service";
import { ChromaSearchService } from "./chroma-search.service";
import { MemoryIndexService } from "./memory-index.service";
import { LessonIndexingService } from "./lesson-indexing.service";
import { IndexedChunk, ParsedLesson, SearchContextParams } from "./types/chroma.types";

/**
 * ChromaService (Refactored)
 * -------------------------------------------------------
 * Maqsad: Lesson materiallari bo'yicha semantic qidiruv va kontekst yig'ish.
 * 
 * Bu servis endi orchestration qiladi va quyidagi servislarga tayangan:
 * - ChromaConnectionService: ChromaDB connection management
 * - ChromaEmbeddingService: OpenAI embedding generation
 * - ChromaSearchService: Semantic search operations
 * - MemoryIndexService: In-memory index management
 * - LessonIndexingService: Lesson parsing and indexing
 */
@Injectable()
export class ChromaService {
    constructor(
        private readonly connectionService: ChromaConnectionService,
        private readonly embeddingService: ChromaEmbeddingService,
        private readonly searchService: ChromaSearchService,
        private readonly memoryIndexService: MemoryIndexService,
        private readonly lessonIndexingService: LessonIndexingService,
    ) { }

    /**
     * Load Memory Index from disk on startup
     */
    async loadMemoryIndexFromDisk(): Promise<void> {
        await this.memoryIndexService.loadMemoryIndexFromDisk();
    }

    /**
     * Kurs materiallaridan kontekst qidirish (foydalanuvchi darajasiga mos)
     */
    async searchContext(params: SearchContextParams): Promise<any[]> {
        const language = params.language || 'ar';
        const useRag = process.env.USE_RAG === '1';

        // Try ChromaDB search first if RAG is enabled
        if (useRag) {
            try {
                const chromaResults = await this.searchService.searchInChroma(params);
                if (chromaResults.length > 0) {
                    return chromaResults;
                }
            } catch (e: any) {
                console.error(`❌ ChromaDB search failed: ${e?.message || String(e)}`);
                // console.log(`💾 Falling back to Memory Index`);
            }
        }

        // Memory Index fallback
        const useRagEnabled = process.env.USE_RAG === '1';
        // console.log(`💾 Using Memory Index fallback (RAG=${useRagEnabled ? 'enabled but ChromaDB failed/empty' : 'disabled'})`);

        const all = this.memoryIndexService.getChunks(language);
        // console.log(`   - Total chunks in memory: ${all.length}`);
        let limited = all;

        // Module limit filter
        if (typeof params.moduleLimit === 'number') {
            const beforeModuleFilter = limited.length;
            limited = this.memoryIndexService.filterByModule(limited, params.moduleLimit);
            // console.log(`   - After module filter (<=${params.moduleLimit}): ${limited.length} (was ${beforeModuleFilter})`);
        }

        // Strict mode filter
        if (params.strict && params.maxLessonOrder) {
            const beforeLessonFilter = limited.length;
            limited = this.memoryIndexService.filterByLessonOrder(limited, params.maxLessonOrder);
            // console.log(`   - After lesson filter (<=${params.maxLessonOrder}): ${limited.length} (was ${beforeLessonFilter})`);
        }

        const sorted = this.memoryIndexService.sortChunks(limited);

        // console.log(`📚 Context: Memory Index (${sorted.length} chunks)`);
        if (sorted.length > 0) {
            const lessonOrders = [...new Set(sorted.map(s => s.lessonOrder))].sort((a, b) => a - b);
            // console.log(`   - Lesson orders in context: ${lessonOrders.join(', ')}`);
        } else {
            // console.log(`   ⚠️  WARNING: No chunks found! This might be why AI can't find lesson materials.`);
        }

        return sorted.map(item => ({ ...item, source: 'memory' }));
    }

    /**
     * ChromaDB connection test
     */
    async testChromaConnection(): Promise<{ success: boolean; message: string; data?: any }> {
        return await this.connectionService.testConnection();
    }

    /**
     * Kurs bo'yicha barcha darslarni indekslash (backfill)
     */
    async indexCourse(params: { courseId: number }): Promise<{ indexed: number; chromaSuccess: boolean }> {
        const baseDir = path.resolve(process.cwd(), 'data', 'ar', 'module_1');
        const files = await fs.readdir(baseDir);
        let total = 0;
        const allChunks: IndexedChunk[] = [];

        // console.log(`📁 Indexing course from: ${baseDir}`);
        // console.log(`📄 Found ${files.filter(f => f.endsWith('.json')).length} JSON files`);

        for (const f of files) {
            if (!f.endsWith('.json')) continue;
            const parsed = await this.lessonIndexingService.parseLessonJson(path.join(baseDir, f));
            if (!parsed) continue;

            // Memory index'ga qo'shish
            total += this.memoryIndexService.upsertChunks(parsed.chunks);
            allChunks.push(...parsed.chunks);
            // console.log(`✅ Indexed ${parsed.chunks.length} chunks from ${f}`);
        }

        // ChromaDB'ga ham yozish
        let chromaSuccess = false;
        if (allChunks.length > 0) {
            chromaSuccess = await this.embeddingService.upsertToChroma(allChunks);
        }

        return { indexed: total, chromaSuccess };
    }

    /**
     * Bitta darsni indekslash yoki reindekslash
     */
    async indexLesson(params: { lessonId: number }): Promise<{ indexed: number; chromaSuccess: boolean }> {
        const file = path.resolve(process.cwd(), 'data', 'ar', 'module_1', `lesson_${params.lessonId}.json`);
        // console.log(`📝 Indexing lesson from: ${file}`);

        const parsed = await this.lessonIndexingService.parseLessonJson(file);
        if (!parsed) return { indexed: 0, chromaSuccess: false };

        // Memory index'ga qo'shish
        const cnt = this.memoryIndexService.upsertChunks(parsed.chunks);

        // ChromaDB'ga ham yozish
        const chromaSuccess = await this.embeddingService.upsertToChroma(parsed.chunks);

        return { indexed: cnt, chromaSuccess };
    }

    /**
     * Darsni indeksdan o'chirish
     */
    async removeLesson(params: { lessonId: number }): Promise<{ removed: boolean }> {
        const language = 'ar';
        this.memoryIndexService.removeChunksByLesson(language, params.lessonId);

        // TODO: ChromaDB dan ham o'chirish kerak
        // console.log(`🗑️ Removed lesson ${params.lessonId} from Memory Index`);

        return { removed: true };
    }

    /**
     * Memory Index statistikalarini olish
     */
    getMemoryIndexStats(): { languages: number; chunks: number } {
        return this.memoryIndexService.getStats();
    }

    /**
     * ChromaDB statistikalarini olish
     */
    async getChromaStats(): Promise<{ collectionId: string | null; status: string }> {
        return await this.connectionService.getStats();
    }
}