import { Injectable } from "@nestjs/common";
import { promises as fs } from "fs";
import * as path from "path";
import { IndexedChunk } from "./types/chroma.types";

/**
 * MemoryIndexService
 * -------------------------------------------------------
 * Maqsad: In-memory index boshqaruvi va diskda saqlash.
 */
@Injectable()
export class MemoryIndexService {
    // In-memory index: language -> chunks
    private readonly memoryIndex = new Map<string, Array<IndexedChunk>>();
    // Memory index persistence file path
    private readonly memoryIndexPath = path.resolve(process.cwd(), 'data', '.memory-index.json');

    /**
     * Get all chunks for a language
     */
    getChunks(language: string): IndexedChunk[] {
        return this.memoryIndex.get(language) ?? [];
    }

    /**
     * Upsert chunks into memory index
     */
    upsertChunks(chunks: IndexedChunk[]): number {
        let count = 0;
        for (const ch of chunks) {
            const key = ch.language;
            const arr = this.memoryIndex.get(key) ?? [];
            const idx = arr.findIndex((c) => c.id === ch.id);
            if (idx >= 0) arr[idx] = ch; else arr.push(ch);
            this.memoryIndex.set(key, arr);
            count++;
        }

        // Persist to disk (async, non-blocking)
        this.saveMemoryIndexToDisk().catch(() => { });

        return count;
    }

    /**
     * Remove chunks by lesson order
     */
    removeChunksByLesson(language: string, lessonOrder: number): void {
        const arr = this.memoryIndex.get(language) ?? [];
        const filtered = arr.filter((c) => c.lessonOrder !== lessonOrder);
        this.memoryIndex.set(language, filtered);

        // Persist to disk (async, non-blocking)
        this.saveMemoryIndexToDisk().catch(() => { });
    }

    /**
     * Save Memory Index to disk for persistence
     */
    private async saveMemoryIndexToDisk(): Promise<void> {
        try {
            const data: Record<string, IndexedChunk[]> = {};
            for (const [key, value] of this.memoryIndex.entries()) {
                data[key] = value;
            }
            await fs.writeFile(this.memoryIndexPath, JSON.stringify(data, null, 2), 'utf-8');
        } catch (e) {
            // Silent fail
        }
    }

    /**
     * Load Memory Index from disk on startup
     */
    async loadMemoryIndexFromDisk(): Promise<void> {
        try {
            const raw = await fs.readFile(this.memoryIndexPath, 'utf-8');
            const data: Record<string, IndexedChunk[]> = JSON.parse(raw);
            for (const [key, value] of Object.entries(data)) {
                this.memoryIndex.set(key, value);
            }
            const totalChunks = Object.values(data).reduce((sum, arr) => sum + arr.length, 0);
            // console.log(`✅ Loaded ${totalChunks} chunks from Memory Index`);
        } catch (e) {
            // Silent fail - file doesn't exist on first run
        }
    }

    /**
     * Get Memory Index statistics
     */
    getStats(): { languages: number; chunks: number } {
        const languages = this.memoryIndex.size;
        const chunks = Array.from(this.memoryIndex.values()).reduce((sum, arr) => sum + arr.length, 0);
        return { languages, chunks };
    }

    /**
     * Filter chunks by module limit
     */
    filterByModule(chunks: IndexedChunk[], moduleLimit: number): IndexedChunk[] {
        return chunks.filter((c) => c.moduleNumber <= moduleLimit);
    }

    /**
     * Filter chunks by lesson order (strict mode)
     */
    filterByLessonOrder(chunks: IndexedChunk[], maxLessonOrder: number): IndexedChunk[] {
        return chunks.filter((c) => c.lessonOrder <= maxLessonOrder);
    }

    /**
     * Sort chunks by lesson and turn index
     */
    sortChunks(chunks: IndexedChunk[]): IndexedChunk[] {
        return chunks.sort((a, b) => (a.lessonOrder - b.lessonOrder) || (a.turnIndex - b.turnIndex));
    }
}

