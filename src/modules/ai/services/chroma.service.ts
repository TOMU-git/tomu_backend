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

    private getChromaUrl(): string {
        return process.env.CHROMA_URL || 'http://localhost:8000';
    }

    private getApiPrefix(): string {
        const ver = (process.env.CHROMA_API_VERSION || '').trim();
        if (ver === '2') {
            return '/api/v2';
        }
        return '/api/v1';
    }

    private getApiBase(): string {
        return `${this.getChromaUrl()}${this.getApiPrefix()}`;
    }

    private async ensureChromaCollectionId(): Promise<string | null> {
        if (this.chromaCollectionId) return this.chromaCollectionId;
        const apiBase = this.getApiBase();
        const collectionName = process.env.CHROMA_COLLECTION || 'lessons';

        try {
            // v2 API uchun tenant/database headerlari
            const headers: any = {};
            if (process.env.CHROMA_API_VERSION === '2') {
                headers['X-Chroma-Tenant'] = process.env.CHROMA_TENANT || 'default';
                headers['X-Chroma-Database'] = process.env.CHROMA_DATABASE || 'default';
            }

            const listRes = await axios.get(`${apiBase}/collections`, { headers });
            const list = (listRes.data as any[]) || [];
            const found = list.find((c: any) => c?.name === collectionName);
            if (found?.id) {
                this.chromaCollectionId = String(found.id);
                return this.chromaCollectionId;
            }
            // Create if not exists
            const createRes = await axios.post(`${apiBase}/collections`, {
                name: collectionName,
                metadata: { description: 'Lesson materials for RAG' },
            }, { headers });
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
        console.log(`💾 Memory Index updated: language="${chunks[0]?.language}", total chunks for this language: ${this.memoryIndex.get(chunks[0]?.language)?.length || 0}`);
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
            const apiBase = this.getApiBase();
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

            // v2 API uchun tenant/database headerlari
            const headers: any = {};
            if (process.env.CHROMA_API_VERSION === '2') {
                headers['X-Chroma-Tenant'] = process.env.CHROMA_TENANT || 'default';
                headers['X-Chroma-Database'] = process.env.CHROMA_DATABASE || 'default';
            }

            // ChromaDB'ga add (v1 va v2 uchun yo'l bir xil bo'lishi mumkin)
            await axios.post(`${apiBase}/collections/${collectionId}/add`, {
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
            }, { headers });

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
        maxLessonOrder?: number;
        strict?: boolean;
    }): Promise<any[]> {
        console.log('🔍 ===== RAG SEARCH STARTED =====');
        console.log(`📝 User ID: ${params.userId}, Course ID: ${params.courseId}`);
        console.log(`🎯 Language: ${params.language || 'ar'}`);
        console.log(`📊 Module Limit: ${params.moduleLimit || 'none'}`);
        console.log(`🔒 Strict Mode: ${params.strict ? 'ON' : 'OFF'}`);
        if (params.strict) {
            console.log(`📚 Max Lesson Order: ${params.maxLessonOrder}`);
        }

        const language = params.language || 'ar';
        const useRag = process.env.USE_RAG === '1';

        if (useRag) {
            console.log('🌐 Using ChromaDB for RAG search...');
            try {
                const topK = Number(process.env.RAG_TOP_K || 12);
                const apiBase = this.getApiBase();
                const collectionId = await this.ensureChromaCollectionId();
                if (!collectionId) {
                    console.warn('⚠️ ChromaService: collection id not available, falling back to memory');
                } else {
                    console.log(`🔗 ChromaDB URL: ${apiBase}`);
                    console.log(`📦 Collection ID: ${collectionId}`);

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

                    // v2 API uchun tenant/database headerlari
                    const headers: any = {};
                    if (process.env.CHROMA_API_VERSION === '2') {
                        headers['X-Chroma-Tenant'] = process.env.CHROMA_TENANT || 'default';
                        headers['X-Chroma-Database'] = process.env.CHROMA_DATABASE || 'default';
                    }

                    // Strict mode uchun where condition
                    const whereCondition: any = { language };
                    if (params.strict && params.maxLessonOrder) {
                        whereCondition.lessonOrder = { $lte: params.maxLessonOrder };
                    }

                    const res = await axios.post(`${apiBase}/collections/${collectionId}/query`, {
                        query_embeddings: [queryEmbedding],
                        n_results: topK,
                        where: whereCondition,
                    }, { headers });

                    const documents = (res.data as any)?.documents?.[0] || [];
                    const metadatas = (res.data as any)?.metadatas?.[0] || [];

                    console.log(`📄 Found ${documents.length} documents from ChromaDB`);

                    if (documents.length > 0) {
                        const results = documents.map((doc: string, i: number) => ({
                            id: `chroma_${i}`,
                            text: doc,
                            language: metadatas[i]?.language || 'ar',
                            moduleNumber: metadatas[i]?.moduleNumber || 1,
                            lessonOrder: metadatas[i]?.lessonOrder || 1,
                            turnIndex: metadatas[i]?.turnIndex || 0,
                            speaker: metadatas[i]?.speaker || 'unknown',
                            translationUz: metadatas[i]?.translationUz || '',
                            audioUrl: metadatas[i]?.audioUrl || null,
                            title: metadatas[i]?.title || '',
                        }));

                        console.log('✅ ChromaDB search successful');
                        console.log('🔍 ===== RAG SEARCH COMPLETED =====\n');
                        return results;
                    }
                }
            } catch (e) {
                console.warn(`❌ ChromaService: search failed, falling back to memory: ${(e as Error).message}`);
            }
        } else {
            console.log('💾 Using Memory Index for search...');
        }

        const all = this.memoryIndex.get(language) ?? [];
        console.log(`💾 Memory Index lookup: language="${language}", found ${all.length} chunks`);
        console.log(`💾 Memory Index keys: ${Array.from(this.memoryIndex.keys()).join(', ')}`);
        let limited = all;

        // Module limit filter
        if (typeof params.moduleLimit === 'number') {
            limited = limited.filter((c) => c.moduleNumber <= params.moduleLimit);
        }

        // Strict mode filter
        if (params.strict && params.maxLessonOrder) {
            limited = limited.filter((c) => c.lessonOrder <= params.maxLessonOrder);
        }

        const sorted = limited.sort((a, b) => (a.lessonOrder - b.lessonOrder) || (a.turnIndex - b.turnIndex));

        console.log(`📄 Found ${sorted.length} documents from Memory Index`);
        console.log('🔍 ===== RAG SEARCH COMPLETED =====\n');

        return sorted;
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