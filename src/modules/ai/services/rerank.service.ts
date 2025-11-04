import { Injectable, Logger } from "@nestjs/common";
import { CohereClient } from "cohere-ai";

/**
 * RerankService
 * -------------------------------------------------------
 * Cohere Rerank API bilan semantic re-ranking
 * Best practice: ChromaDB natijalarini qayta tartiblash uchun
 */
@Injectable()
export class RerankService {
    private readonly logger = new Logger(RerankService.name);
    private readonly cohereClient: CohereClient | null = null;
    private readonly rerankModel: string;
    private readonly enabled: boolean;
    private readonly maxRetries: number = 2;
    private readonly initialDelay: number = 500;
    private readonly maxDelay: number = 2000;

    constructor() {
        const apiKey = process.env.COHERE_API_KEY || "";
        this.rerankModel = process.env.COHERE_RERANK_MODEL || "rerank-multilingual-v3.0";
        this.enabled = process.env.USE_RERANK === "1" && !!apiKey;

        if (this.enabled) {
            try {
                this.cohereClient = new CohereClient({
                    token: apiKey,
                });
                this.logger.log(`✅ Cohere Rerank initialized with model: ${this.rerankModel}`);
            } catch (error) {
                this.logger.warn(`⚠️  Failed to initialize Cohere client: ${error}`);
            }
        } else {
            this.logger.log(`🔕 Cohere Rerank disabled (USE_RERANK=${process.env.USE_RERANK}, API_KEY=${apiKey ? 'set' : 'not set'})`);
        }
    }

    /**
     * Rerank documents using Cohere Rerank API
     * @param query - User query text
     * @param documents - Array of documents to rerank (from ChromaDB)
     * @param topK - Number of top documents to return (default: 10)
     * @returns Reranked documents with relevance scores
     */
    async rerank(
        query: string,
        documents: Array<{ id: string; text: string;[key: string]: any }>,
        topK: number = 10
    ): Promise<Array<{ document: any; relevanceScore: number; originalIndex: number }>> {
        // Rerank disabled yoki API key yo'q bo'lsa, original documents qaytar
        if (!this.enabled || !this.cohereClient || documents.length === 0) {
            return documents.map((doc, idx) => ({
                document: doc,
                relevanceScore: 0,
                originalIndex: idx,
            }));
        }

        // Agar documents soni topK dan kichik bo'lsa, rerank qilmaslik
        if (documents.length <= topK) {
            this.logger.debug(`Skipping rerank: documents (${documents.length}) <= topK (${topK})`);
            return documents.map((doc, idx) => ({
                document: doc,
                relevanceScore: 1.0,
                originalIndex: idx,
            }));
        }

        try {
            const startTime = Date.now();

            // Prepare documents for Cohere API
            const documentsArray = documents.map((doc) => doc.text);

            // Call Cohere Rerank API with retry logic (simple exponential backoff)
            let rerankResponse: any;
            let lastError: any;

            for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
                try {
                    rerankResponse = await this.cohereClient!.rerank({
                        model: this.rerankModel,
                        query: query,
                        documents: documentsArray,
                        topN: topK,
                        returnDocuments: false, // Faqat scores kerak
                    });
                    break; // Success
                } catch (error: any) {
                    lastError = error;

                    // Retriable errors (rate limit, server errors)
                    const isRetriable = error.status === 429 || error.status >= 500;

                    if (!isRetriable || attempt >= this.maxRetries) {
                        throw error; // Non-retriable or max retries reached
                    }

                    // Exponential backoff
                    const delay = Math.min(
                        this.initialDelay * Math.pow(2, attempt),
                        this.maxDelay
                    );

                    this.logger.warn(`🔄 Retrying rerank (attempt ${attempt + 1}/${this.maxRetries + 1}) after ${delay}ms...`);
                    await this.sleep(delay);
                }
            }

            if (!rerankResponse) {
                throw lastError || new Error("Rerank failed");
            }

            const latency = Date.now() - startTime;

            // Map results back to original documents with metadata
            const rerankedResults = rerankResponse.results.map((result) => {
                const originalIndex = result.index;
                const originalDocument = documents[originalIndex];

                return {
                    document: {
                        ...originalDocument,
                        rerankScore: result.relevanceScore, // Save rerank score for logging
                    },
                    relevanceScore: result.relevanceScore,
                    originalIndex: originalIndex,
                };
            });

            this.logger.log(
                `✅ Reranked ${documents.length} → ${rerankedResults.length} documents in ${latency}ms`
            );

            // Log top 3 relevance scores for monitoring
            if (rerankedResults.length > 0) {
                const topScores = rerankedResults
                    .slice(0, 3)
                    .map((r) => r.relevanceScore.toFixed(3))
                    .join(", ");
                this.logger.debug(`   Top relevance scores: ${topScores}`);
            }

            return rerankedResults;
        } catch (error: any) {
            // Fallback: original documents qaytarish
            this.logger.error(
                `❌ Rerank failed: ${error?.message || String(error)}. Falling back to original order.`
            );

            // Original documents qaytarish (first topK documents by original order)
            return documents.slice(0, topK).map((doc, idx) => ({
                document: doc,
                relevanceScore: 0,
                originalIndex: documents.indexOf(doc),
            }));
        }
    }

    /**
     * Check if rerank is enabled and available
     */
    isEnabled(): boolean {
        return this.enabled && this.cohereClient !== null;
    }

    /**
     * Sleep utility for retry delays
     */
    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

