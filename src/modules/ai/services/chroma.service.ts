import { Injectable } from "@nestjs/common";
import axios from "axios";
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
    // Chroma collection id cache
    private chromaCollectionId: string | null = null;

    private async ensureChromaCollectionId(): Promise<string | null> {
        if (this.chromaCollectionId) return this.chromaCollectionId;
        const chromaUrl = process.env.CHROMA_URL || 'http://localhost:8000';
        const collectionName = process.env.CHROMA_COLLECTION || 'lessons';

        try {
            const listRes = await axios.get(`${chromaUrl}/api/v1/collections`);
            const list = (listRes.data as any[]) || [];
            const found = list.find((c: any) => c?.name === collectionName);
            if (found?.id) {
                this.chromaCollectionId = String(found.id);
                return this.chromaCollectionId;
            }
            // Create if not exists
            const createRes = await axios.post(`${chromaUrl}/api/v1/collections`, {
                name: collectionName,
                metadata: { description: 'Lesson materials for RAG' },
            });
            const createdId = (createRes.data as any)?.id;
            if (createdId) {
                this.chromaCollectionId = String(createdId);
                return this.chromaCollectionId;
            }
        } catch (e) {
            console.warn(`ChromaService: ensureChromaCollectionId failed: ${(e as Error).message}`);
        }
        return null;
    }

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
     * ChromaDB HTTP API orqali chunk'larni qo'shish/update qilish
     */
    private async upsertToChroma(chunks: IndexedChunk[]): Promise<boolean> {
        const useRag = process.env.USE_RAG === '1';
        if (!useRag) return false;

        try {
            const chromaUrl = process.env.CHROMA_URL || 'http://localhost:8000';
            const collectionId = await this.ensureChromaCollectionId();
            if (!collectionId) {
                console.warn('ChromaService: collection id not available, skipping Chroma upsert');
                return false;
            }

            // Embedding'lar uchun OpenAI API chaqirish
            const openaiKey = process.env.OPENAI_API_KEY;
            const embedModel = process.env.EMBED_MODEL || 'text-embedding-3-small';

            if (!openaiKey) {
                console.warn('ChromaService: OPENAI_API_KEY not found, skipping embedding generation');
                return false;
            }

            // Text'larni embedding'ga aylantirish
            const texts = chunks.map(c => c.text);
            const embedRes = await axios.post('https://api.openai.com/v1/embeddings', {
                model: embedModel,
                input: texts,
            }, {
                headers: { 'Authorization': `Bearer ${openaiKey}` }
            });

            const embeddings = (embedRes.data as any).data.map((item: any) => item.embedding);

            // ChromaDB'ga add (V1 API expects /collections/{id}/add)
            await axios.post(`${chromaUrl}/api/v1/collections/${collectionId}/add`, {
                ids: chunks.map(c => c.id),
                embeddings: embeddings,
                documents: chunks.map(c => c.text),
                metadatas: chunks.map(c => ({
                    language: c.language,
                    moduleNumber: c.moduleNumber,
                    lessonOrder: c.lessonOrder,
                    turnIndex: c.turnIndex,
                    speaker: c.speaker,
                    translationUz: c.translationUz,
                    audioUrl: c.audioUrl,
                    title: c.title,
                }))
            });

            return true;
        } catch (e) {
            console.warn(`ChromaService: upsert to ChromaDB failed: ${(e as Error).message}`);
            return false;
        }
    }

    /**
     * Kurs materiallaridan kontekst qidirish (foydalanuvchi darajasiga mos)
     */
    async searchContext(params: {
        userId: number;
        courseId: number;
        moduleLimit?: number;
        language?: string;
    }): Promise<any[]> {
        const language = params.language || 'ar';
        const useRag = process.env.USE_RAG === '1';

        if (useRag) {
            // Chroma HTTP qidiruv
            try {
                const topK = Number(process.env.RAG_TOP_K || 12);
                const chromaUrl = process.env.CHROMA_URL || 'http://localhost:8000';
                const collectionId = await this.ensureChromaCollectionId();
                if (!collectionId) throw new Error('Collection id not available');

                // Query text uchun embedding yaratish (hozircha bo'sh query)
                const queryText = "dialogue conversation lesson";
                const openaiKey = process.env.OPENAI_API_KEY;
                const embedModel = process.env.EMBED_MODEL || 'text-embedding-3-small';

                let queryEmbedding: number[] = [];
                if (openaiKey) {
                    const embedRes = await axios.post('https://api.openai.com/v1/embeddings', {
                        model: embedModel,
                        input: [queryText],
                    }, {
                        headers: { 'Authorization': `Bearer ${openaiKey}` }
                    });
                    queryEmbedding = (embedRes.data as any).data[0].embedding;
                }

                const res = await axios.post(`${chromaUrl}/api/v1/collections/${collectionId}/query`, {
                    query_embeddings: [queryEmbedding],
                    n_results: topK,
                    where: { language },
                });

                const records: any[] = (res.data as any)?.documents?.flat() || [];
                if (records.length) return records;
            } catch (e) {
                console.warn(`ChromaService: search failed, falling back to memory: ${(e as Error).message}`);
            }
        }

        const all = this.memoryIndex.get(language) ?? [];
        const limited = typeof params.moduleLimit === 'number' ? all.filter((c) => c.moduleNumber <= (params.moduleLimit as number)) : all;
        return limited.sort((a, b) => (a.lessonOrder - b.lessonOrder) || (a.turnIndex - b.turnIndex));
    }

    /**
     * Kurs bo'yicha barcha darslarni indekslash (backfill)
     */
    async indexCourse(params: { courseId: number }): Promise<{ indexed: number }> {
        const baseDir = path.resolve(process.cwd(), 'data', 'ar', 'module_1');
        const files = await fs.readdir(baseDir);
        let total = 0;
        const allChunks: IndexedChunk[] = [];

        for (const f of files) {
            if (!f.endsWith('.json')) continue;
            const parsed = await this.parseLessonJson(path.join(baseDir, f));
            if (!parsed) continue;

            // Memory index'ga qo'shish
            total += this.upsertChunks(parsed.chunks);
            allChunks.push(...parsed.chunks);
        }

        // ChromaDB'ga ham yozish
        if (allChunks.length > 0) {
            await this.upsertToChroma(allChunks);
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

        // Memory index'ga qo'shish
        const cnt = this.upsertChunks(parsed.chunks);

        // ChromaDB'ga ham yozish
        await this.upsertToChroma(parsed.chunks);

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