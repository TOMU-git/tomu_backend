import { Injectable } from "@nestjs/common";
import axios from "axios";
import { ChromaConnectionService } from "./chroma-connection.service";
import { IndexedChunk } from "./types/chroma.types";

/**
 * ChromaEmbeddingService
 * -------------------------------------------------------
 * Maqsad: OpenAI embedding'lar yaratish va ChromaDB'ga upsert qilish.
 */
@Injectable()
export class ChromaEmbeddingService {
    constructor(
        private readonly connectionService: ChromaConnectionService,
    ) { }

    /**
     * Generate embeddings using OpenAI API
     */
    private async generateEmbeddings(texts: string[]): Promise<number[][]> {
        const openaiKey = process.env.OPENAI_API_KEY;
        const embedModel = process.env.EMBED_MODEL || 'text-embedding-3-small';

        if (!openaiKey) {
            throw new Error('OPENAI_API_KEY not found');
        }

        // console.log(`🧠 Generating embeddings for ${texts.length} texts using ${embedModel}`);

        const embedRes = await axios.post('https://api.openai.com/v1/embeddings', {
            model: embedModel,
            input: texts,
        }, {
            headers: { 'Authorization': `Bearer ${openaiKey}` },
            timeout: 30000
        });

        const embeddings = (embedRes.data as any).data.map((item: any) => item.embedding);
        // console.log(`✅ Generated embeddings: ${embeddings.length} vectors, each ${embeddings[0]?.length} dimensions`);

        return embeddings;
    }

    /**
     * Upsert chunks to ChromaDB
     */
    async upsertToChroma(chunks: IndexedChunk[]): Promise<boolean> {
        const useRag = process.env.USE_RAG === '1';
        if (!useRag) {
            // console.log(`🔕 RAG disabled, skipping ChromaDB upsert`);
            return false;
        }

        try {
            const apiBase = this.connectionService.getApiBase();
            const collectionId = await this.connectionService.ensureChromaCollectionId();
            if (!collectionId) {
                console.warn('ChromaEmbeddingService: collection id not available, skipping Chroma upsert');
                return false;
            }

            // console.log(`📝 ChromaEmbeddingService: Upserting ${chunks.length} chunks to ChromaDB`);

            // Embedding'lar uchun OpenAI API chaqirish
            const openaiKey = process.env.OPENAI_API_KEY;
            const embedModel = process.env.EMBED_MODEL || 'text-embedding-3-small';

            if (!openaiKey) {
                console.warn('ChromaEmbeddingService: OPENAI_API_KEY not found, skipping embedding generation');
                return false;
            }

            // Text'larni embedding'ga aylantirish
            const texts = chunks.map(c => c.text);
            const embeddings = await this.generateEmbeddings(texts);

            const headers = this.connectionService.getChromaHeaders();

            // ChromaDB'ga upsert qilish
            const upsertPayload = {
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
                    next: c.next || null,
                    nextTranslationUz: c.nextTranslationUz || null,
                    nextNext: c.nextNext || null,
                    nextNextTranslationUz: c.nextNextTranslationUz || null,
                }))
            };

            // ChromaDB 1.0.0+ always uses 'upsert' endpoint
            // console.log(`🚀 Sending upsert to ChromaDB: ${apiBase}/collections/${collectionId}/upsert`);

            const upsertRes = await axios.post(
                `${apiBase}/collections/${collectionId}/upsert`,
                upsertPayload,
                {
                    headers,
                    timeout: 30000
                }
            );

            // console.log(`✅ ChromaDB upsert successful: ${upsertRes.status}`);
            return true;
        } catch (e: any) {
            console.error(`❌ ChromaEmbeddingService: upsert to ChromaDB failed: ${e?.message || String(e)}`);
            if (e.response) {
                console.error(`❌ Response status: ${e.response.status}`);
                console.error(`❌ Response data:`, e.response.data);
            }
            return false;
        }
    }
}

