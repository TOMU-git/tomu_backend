import { Injectable } from "@nestjs/common";
import { promises as fs } from "fs";
import * as path from "path";

/**
 * ChromaService
 * -------------------------------------------------------
 * Maqsad: Lesson materiallari bo'yicha semantic qidiruv va kontekst yig'ish.
 * 
 * TODO: ChromaDB client ulash va kolleksiyalarni boshqarish
 * Hozircha stub implementatsiya, keyin real ChromaDB bilan almashtiriladi.
 */
@Injectable()
export class ChromaService {
    // In-memory index: language -> chunks
    private readonly memoryIndex = new Map<string, Array<IndexedChunk>>();

    private buildChunkId(language: string, moduleNumber: number, lessonOrder: number, turnIndex: number): string {
        return `${language}_m${moduleNumber}_l${lessonOrder}_t${turnIndex}`;
    }

    private upsertChunks(chunks: IndexedChunk[]): number {
        let count = 0;
        for (const ch of chunks) {
            const key = ch.language;
            const arr = this.memoryIndex.get(key) ?? [];
            const idx = arr.findIndex((c) => c.id === ch.id);
            if (idx >= 0) arr[idx] = ch; else arr.push(ch);
            this.memoryIndex.set(key, arr);
            count++;
        }
        return count;
    }

    private async parseLessonJson(filePath: string): Promise<ParsedLesson | null> {
        try {
            const raw = await fs.readFile(filePath, "utf-8");
            const json = JSON.parse(raw);
            const language: string = json.language;
            const moduleNumber: number = json.moduleNumber;
            const lessonOrder: number = json.lessonNumber ?? json.lessonOrder;
            const title: string = json.title ?? "";
            const dialogue: any[] = Array.isArray(json.dialogue) ? json.dialogue : [];

            const chunks: IndexedChunk[] = dialogue.map((turn) => ({
                id: this.buildChunkId(language, moduleNumber, lessonOrder, turn.turnIndex ?? 0),
                language,
                moduleNumber,
                lessonOrder,
                turnIndex: turn.turnIndex ?? 0,
                speaker: turn.speaker ?? null,
                text: String(turn.text ?? ""),
                translationUz: turn.translationUz ?? null,
                audioUrl: turn.audioUrl ?? null,
                title,
            }));

            return { language, moduleNumber, lessonOrder, title, chunks };
        } catch (e) {
            console.warn(`ChromaService: parse failed for ${filePath}: ${(e as Error).message}`);
            return null;
        }
    }

    /**
     * Kurs materiallaridan kontekst qidirish (foydalanuvchi darajasiga mos)
     */
    async searchContext(params: {
        userId: number;
        courseId: number;
        moduleLimit?: number;
    }): Promise<any[]> {
        // Hozircha language = 'ar' deb olinadi; keyinchalik profile/sessiondan keladi
        const language = 'ar';
        const all = this.memoryIndex.get(language) ?? [];
        const limited = typeof params.moduleLimit === 'number'
            ? all.filter((c) => c.moduleNumber <= (params.moduleLimit as number))
            : all;
        return limited.sort((a, b) => (a.lessonOrder - b.lessonOrder) || (a.turnIndex - b.turnIndex));
    }

    /**
     * Kurs bo'yicha barcha darslarni indekslash (backfill)
     */
    async indexCourse(params: { courseId: number }): Promise<{ indexed: number }> {
        const baseDir = path.resolve(process.cwd(), 'data', 'ar', 'module_1');
        const files = await fs.readdir(baseDir);
        let total = 0;
        for (const f of files) {
            if (!f.endsWith('.json')) continue;
            const parsed = await this.parseLessonJson(path.join(baseDir, f));
            if (!parsed) continue;
            total += this.upsertChunks(parsed.chunks);
        }
        return { indexed: total };
    }

    /**
     * Bitta darsni indekslash yoki reindekslash
     */
    async indexLesson(params: { lessonId: number }): Promise<{ indexed: number }> {
        const file = path.resolve(process.cwd(), 'data', 'ar', 'module_1', `lesson_${params.lessonId}.json`);
        const parsed = await this.parseLessonJson(file);
        if (!parsed) return { indexed: 0 };
        const cnt = this.upsertChunks(parsed.chunks);
        return { indexed: cnt };
    }

    /**
     * Darsni indeksdan o'chirish
     */
    async removeLesson(params: { lessonId: number }): Promise<{ removed: boolean }> {
        const language = 'ar';
        const arr = this.memoryIndex.get(language) ?? [];
        const filtered = arr.filter((c) => c.lessonOrder !== params.lessonId);
        this.memoryIndex.set(language, filtered);
        return { removed: true };
    }
}

interface IndexedChunk {
    id: string;
    language: string;
    moduleNumber: number;
    lessonOrder: number;
    turnIndex: number;
    speaker: string | null;
    text: string;
    translationUz: string | null;
    audioUrl: string | null;
    title: string;
}

interface ParsedLesson {
    language: string;
    moduleNumber: number;
    lessonOrder: number;
    title: string;
    chunks: IndexedChunk[];
}