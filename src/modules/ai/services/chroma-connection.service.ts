import { Injectable } from "@nestjs/common";
import axios from "axios";

/**
 * ChromaConnectionService
 * -------------------------------------------------------
 * Maqsad: ChromaDB connection boshqaruvi va configuration.
 */
@Injectable()
export class ChromaConnectionService {
    // Chroma collection id cache
    private chromaCollectionId: string | null = null;

    /**
     * Get Chroma URL from environment
     */
    private getChromaUrl(): string {
        return process.env.CHROMA_URL || 'http://localhost:8000';
    }

    /**
     * Get tenant name from environment
     * ChromaDB 1.0.0+ default tenant is 'default_tenant'
     */
    private getTenant(): string {
        return process.env.CHROMA_TENANT || 'default_tenant';
    }

    /**
     * Get database name from environment
     * ChromaDB 1.0.0+ default database is 'default_database'
     */
    private getDatabase(): string {
        return process.env.CHROMA_DATABASE || 'default_database';
    }

    /**
     * Get API prefix based on version
     * ChromaDB 1.0.0+ uses /api/v2 with tenant/database in URL path
     */
    private getApiPrefix(): string {
        const ver = (process.env.CHROMA_API_VERSION || '').trim();
        if (ver === '2') {
            // ChromaDB 1.0.0+ format: /api/v2/tenants/{tenant}/databases/{database}
            const tenant = this.getTenant();
            const database = this.getDatabase();
            return `/api/v2/tenants/${tenant}/databases/${database}`;
        }
        // Old v1 API (deprecated in ChromaDB 1.0+)
        return '/api/v1';
    }

    /**
     * Get API base URL
     */
    getApiBase(): string {
        const base = `${this.getChromaUrl()}${this.getApiPrefix()}`;
        return base;
    }

    /**
     * Get ChromaDB headers for authentication
     * Note: ChromaDB 1.0.0+ uses tenant/database in URL path, not headers
     */
    getChromaHeaders(): any {
        const headers: any = {
            'Content-Type': 'application/json'
        };
        // Legacy v1 API header support (if needed)
        // In ChromaDB 1.0+, tenant and database are in URL path, not headers
        return headers;
    }

    /**
     * Ensure ChromaDB collection exists and cache ID
     * ChromaDB 1.0.0+ compatible
     */
    async ensureChromaCollectionId(): Promise<string | null> {
        if (this.chromaCollectionId) return this.chromaCollectionId;
        const apiBase = this.getApiBase();
        const collectionName = process.env.CHROMA_COLLECTION || 'lessons';
        const headers = this.getChromaHeaders();

        try {
            console.log(`🔍 ChromaConnectionService: Trying to connect to ${apiBase}/collections`);

            // Try to get existing collections
            const listRes = await axios.get(`${apiBase}/collections`, { headers });
            console.log(`📋 ChromaConnectionService: GET /collections response:`, listRes.status);

            const list = (listRes.data as any[]) || [];
            const found = list.find((c: any) => c?.name === collectionName);
            if (found?.id) {
                this.chromaCollectionId = String(found.id);
                console.log(`✅ ChromaConnectionService: Found existing collection: ${collectionName} (${this.chromaCollectionId.substring(0, 8)}...)`);
                return this.chromaCollectionId;
            }

            // Collection doesn't exist, create it
            console.log(`🆕 ChromaConnectionService: Creating new collection: ${collectionName}`);
            const createBody = {
                name: collectionName,
                metadata: { description: 'Lesson materials for RAG' },
            };

            const createRes = await axios.post(`${apiBase}/collections`, createBody, { headers });
            console.log(`📋 ChromaConnectionService: POST /collections response:`, createRes.status);

            const createdId = (createRes.data as any)?.id;
            if (createdId) {
                this.chromaCollectionId = String(createdId);
                console.log(`✅ ChromaConnectionService: Created collection: ${collectionName} (${this.chromaCollectionId.substring(0, 8)}...)`);
                return this.chromaCollectionId;
            } else {
                console.warn(`⚠️ ChromaConnectionService: No collection ID in response`);
            }
        } catch (e: any) {
            console.error(`❌ ChromaConnectionService: ensureChromaCollectionId failed: ${e?.message || String(e)}`);
            console.error(`❌ ChromaConnectionService: API Base: ${apiBase}, Collection: ${collectionName}`);
            if (e.response) {
                console.error(`❌ ChromaConnectionService: Response status: ${e.response.status}`);
                console.error(`❌ ChromaConnectionService: Response data:`, JSON.stringify(e.response.data));
            }
            console.error(`⚠️  Falling back to Memory Index - this is fine for development`);
        }
        return null;
    }

    /**
     * Test ChromaDB connection
     */
    async testConnection(): Promise<{ success: boolean; message: string; data?: any }> {
        try {
            const apiBase = this.getApiBase();
            const headers = this.getChromaHeaders();

            console.log(`🔍 Testing ChromaDB connection to: ${apiBase}`);

            const response = await axios.get(`${apiBase}/collections`, {
                headers,
                timeout: 5000
            });

            const collections = (response.data as any[]) || [];
            return {
                success: true,
                message: `ChromaDB connection successful: ${collections.length} collections found`,
                data: collections
            };
        } catch (error: any) {
            return {
                success: false,
                message: `ChromaDB connection failed: ${error.message}`,
                data: error.response?.data
            };
        }
    }

    /**
     * Get ChromaDB stats
     */
    async getStats(): Promise<{ collectionId: string | null; status: string }> {
        const collectionId = await this.ensureChromaCollectionId();
        return {
            collectionId,
            status: collectionId ? 'connected' : 'disconnected'
        };
    }
}

