/**
 * Script to clear ChromaDB collection cache and force re-indexing
 * This will create a new collection with a different name
 */

const axios = require('axios');

const CHROMA_URL = process.env.CHROMA_URL || 'http://localhost:8000';
const CHROMA_TENANT = process.env.CHROMA_TENANT || 'default_tenant';
const CHROMA_DATABASE = process.env.CHROMA_DATABASE || 'default_database';
const COLLECTION_NAME = process.env.CHROMA_COLLECTION || 'lessons';

const API_BASE = `${CHROMA_URL}/api/v2/tenants/${CHROMA_TENANT}/databases/${CHROMA_DATABASE}`;

async function clearAndReindex() {
    try {
        console.log(`🔍 Connecting to ChromaDB: ${API_BASE}`);
        
        // Get collections
        const listRes = await axios.get(`${API_BASE}/collections`);
        const collections = listRes.data || [];
        const oldCollection = collections.find(c => c.name === COLLECTION_NAME);
        
        if (oldCollection) {
            console.log(`📋 Found old collection: ${COLLECTION_NAME} (${oldCollection.id.substring(0, 8)}...)`);
            console.log(`💡 Old collection will be ignored. New collection will be created on next indexing.`);
        } else {
            console.log(`✅ No old collection found.`);
        }
        
        // Create new collection with timestamp to avoid conflicts
        const newCollectionName = `${COLLECTION_NAME}_new_${Date.now()}`;
        console.log(`\n🆕 Creating new collection: ${newCollectionName}`);
        
        const createRes = await axios.post(`${API_BASE}/collections`, {
            name: newCollectionName,
            metadata: { description: 'Lesson materials for RAG (new structure)' }
        });
        
        const newCollectionId = createRes.data?.id;
        if (newCollectionId) {
            console.log(`✅ New collection created: ${newCollectionName} (${newCollectionId.substring(0, 8)}...)`);
            console.log(`\n💡 Next steps:`);
            console.log(`   1. Update .env: CHROMA_COLLECTION=${newCollectionName}`);
            console.log(`   2. Run: npm run ai:index-lessons`);
            console.log(`   3. Or restart server - it will use new collection`);
        } else {
            console.error(`❌ Failed to create new collection`);
        }
        
    } catch (error) {
        console.error(`❌ Error:`, error.message);
        if (error.response) {
            console.error(`   Status: ${error.response.status}`);
            console.error(`   Data:`, JSON.stringify(error.response.data, null, 2));
        }
    }
}

clearAndReindex();



