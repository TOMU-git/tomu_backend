import { Injectable } from "@nestjs/common";
import axios from "axios";
import { ChromaConnectionService } from "./chroma-connection.service";
import { SearchContextParams } from "./types/chroma.types";
import { RerankService } from "./rerank.service";

/**
 * ChromaSearchService
 * -------------------------------------------------------
 * Maqsad: ChromaDB'da semantic qidiruv amalga oshirish.
 */
@Injectable()
export class ChromaSearchService {
    constructor(
        private readonly connectionService: ChromaConnectionService,
        private readonly rerankService: RerankService,
    ) { }

    /**
     * Generate query embedding using OpenAI API
     */
    private async generateQueryEmbedding(queryText: string): Promise<number[]> {
        const openaiKey = process.env.OPENAI_API_KEY;
        const embedModel = process.env.EMBED_MODEL || 'text-embedding-3-small';

        if (!openaiKey) {
            console.warn(`⚠️  OPENAI_API_KEY not found, using empty query embedding`);
            return [];
        }

        // console.log(`🧠 Generating query embedding...`);
        const embedRes = await axios.post('https://api.openai.com/v1/embeddings', {
            model: embedModel,
            input: [queryText],
        }, {
            headers: { 'Authorization': `Bearer ${openaiKey}` },
            timeout: 15000
        });
        const queryEmbedding = (embedRes.data as any).data[0].embedding;
        // console.log(`✅ Query embedding generated: ${queryEmbedding.length} dimensions`);
        return queryEmbedding;
    }

    /**
     * Search ChromaDB using semantic query
     */
    async searchInChroma(params: SearchContextParams): Promise<any[]> {
        const language = params.language || 'ar';
        const useRag = process.env.USE_RAG === '1';

        // ✅ IMPROVED: Aniqroq query text
        const queryText = params.query || "arabic language learning lesson dialogue conversation";

        if (!useRag) {
            // console.log(`🔕 RAG disabled, falling back to Memory Index`);
            return [];
        }

        try {
            // ChromaDB dan ko'proq documents olish (rerank uchun)
            const initialTopK = Number(process.env.RAG_TOP_K || 50); // Top-50 for reranking
            const finalTopK = Number(process.env.RERANK_TOP_K || 10); // Final top-10 after rerank

            const apiBase = this.connectionService.getApiBase();
            const collectionId = await this.connectionService.ensureChromaCollectionId();

            // console.log(`\n🔍 RAG Search:`);
            // console.log(`   - USE_RAG: ${useRag ? '1 (enabled)' : '0 (disabled)'}`);
            // console.log(`   - Collection ID: ${collectionId ? collectionId.substring(0, 8) + '...' : 'NOT FOUND'}`);
            // console.log(`   - Query: "${queryText}"`);
            // console.log(`   - Language: ${language}`);
            // console.log(`   - Initial Top K: ${initialTopK} (for reranking)`);
            // console.log(`   - Final Top K: ${finalTopK} (after rerank)`);
            // console.log(`   - Rerank enabled: ${this.rerankService.isEnabled()}`);

            if (!collectionId) {
                // console.log(`⚠️  ChromaDB not available, falling back to Memory Index`);
                return [];
            }

            // console.log(`✅ ChromaDB connection: ${apiBase}`);

            // Query text uchun embedding yaratish
            const queryEmbedding = await this.generateQueryEmbedding(queryText);

            if (queryEmbedding.length === 0) {
                console.warn(`⚠️  Empty query embedding, falling back to Memory Index`);
                return [];
            }

            const headers = this.connectionService.getChromaHeaders();

            // Where condition - faqat language bilan qidirish
            // lessonOrder filterni ChromaDB natijalaridan keyin qo'llaymiz (client-side)
            // Bu ChromaDB versiyasiga bog'liq emas va xatolarni oldini oladi
            const whereCondition: any = { language };

            // console.log(`📡 Querying ChromaDB...`);
            const queryPayload = {
                query_embeddings: [queryEmbedding],
                n_results: initialTopK, // More results for reranking
                where: whereCondition,
                include: ['metadatas', 'documents', 'distances']
            };

            const res = await axios.post(
                `${apiBase}/collections/${collectionId}/query`,
                queryPayload,
                {
                    headers,
                    timeout: 15000
                }
            );

            const documents = (res.data as any)?.documents?.[0] || [];
            const metadatas = (res.data as any)?.metadatas?.[0] || [];
            const distances = (res.data as any)?.distances?.[0] || [];

            if (documents.length > 0) {
                // console.log(`✅ ChromaDB query successful: ${documents.length} documents found`);

                // Build initial results from ChromaDB
                let initialResults = documents.map((doc: string, i: number) => ({
                    id: metadatas[i]?.id || `chroma_${i}`,
                    text: doc,
                    language: metadatas[i]?.language || 'ar',
                    moduleNumber: metadatas[i]?.moduleNumber || 1,
                    lessonOrder: metadatas[i]?.lessonOrder || 1,
                    turnIndex: metadatas[i]?.turnIndex || 0,
                    speaker: metadatas[i]?.speaker || 'unknown',
                    translationUz: metadatas[i]?.translationUz || '',
                    audioUrl: metadatas[i]?.audioUrl || null,
                    title: metadatas[i]?.title || '',
                    next: metadatas[i]?.next || null,
                    nextTranslationUz: metadatas[i]?.nextTranslationUz || null,
                    nextNext: metadatas[i]?.nextNext || null,
                    nextNextTranslationUz: metadatas[i]?.nextNextTranslationUz || null,
                    distance: distances[i] || 0,
                    source: 'chroma'
                }));

                // Client-side filtering: lessonOrder filterni qo'llash (strict mode)
                // Bu ChromaDB where clause'da $lte operatori muammosini hal qiladi
                if (params.strict && params.maxLessonOrder) {
                    const beforeFilter = initialResults.length;
                    initialResults = initialResults.filter(
                        (result) => result.lessonOrder <= params.maxLessonOrder!
                    );
                    // console.log(`   - Strict mode filter: ${beforeFilter} → ${initialResults.length} documents (lessonOrder <= ${params.maxLessonOrder})`);
                }

                // Module limit filter (client-side)
                if (typeof params.moduleLimit === 'number') {
                    const beforeModuleFilter = initialResults.length;
                    initialResults = initialResults.filter(
                        (result) => result.moduleNumber <= params.moduleLimit!
                    );
                    // console.log(`   - Module filter: ${beforeModuleFilter} → ${initialResults.length} documents (moduleNumber <= ${params.moduleLimit})`);
                }

                // Apply reranking if enabled
                let finalResults = initialResults;
                if (this.rerankService.isEnabled() && initialResults.length > finalTopK) {
                    // console.log(`🔄 Applying reranking: ${initialResults.length} → ${finalTopK} documents...`);
                    const reranked = await this.rerankService.rerank(queryText, initialResults, finalTopK);
                    finalResults = reranked.map((r) => r.document);
                    // console.log(`✅ Reranking completed: selected top ${finalResults.length} most relevant documents`);
                } else if (initialResults.length > finalTopK) {
                    // If rerank disabled, just take top-K by distance
                    finalResults = initialResults.slice(0, finalTopK);
                    // console.log(`📊 Using top ${finalTopK} documents by distance (rerank disabled)`);
                }

                // console.log(`📚 Context: ChromaDB → Filter → Rerank (${finalResults.length} lessons)`);
                return finalResults;
            } else {
                // console.log(`⚠️  ChromaDB query returned 0 documents, falling back to Memory Index`);
                return [];
            }
        } catch (e: any) {
            console.error(`❌ ChromaDB search failed: ${e?.message || String(e)}`);
            if (e.response) {
                console.error(`❌ Response status: ${e.response.status}`);
                console.error(`❌ Response data:`, e.response.data);
            }
            return [];
        }
    }
}

