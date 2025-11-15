/**
 * Script to clear ChromaDB collection
 * Run: node clear-chroma.js
 */

const axios = require('axios');

const CHROMA_URL = process.env.CHROMA_URL || 'http://localhost:8000';
const CHROMA_TENANT = process.env.CHROMA_TENANT || 'default_tenant';
const CHROMA_DATABASE = process.env.CHROMA_DATABASE || 'default_database';
const COLLECTION_NAME = process.env.CHROMA_COLLECTION || 'lessons';

const API_BASE = `${CHROMA_URL}/api/v2/tenants/${CHROMA_TENANT}/databases/${CHROMA_DATABASE}`;

async function clearCollection() {
    try {
        console.log(`🔍 Connecting to ChromaDB: ${API_BASE}`);
        
        // Get collections
        const listRes = await axios.get(`${API_BASE}/collections`);
        const collections = listRes.data || [];
        const collection = collections.find(c => c.name === COLLECTION_NAME);
        
        if (!collection) {
            console.log(`⚠️  Collection "${COLLECTION_NAME}" not found. Nothing to clear.`);
            return;
        }
        
        const collectionId = collection.id;
        console.log(`📋 Found collection: ${COLLECTION_NAME} (${collectionId.substring(0, 8)}...)`);
        
        // Delete collection
        console.log(`🗑️  Deleting collection...`);
        await axios.delete(`${API_BASE}/collections/${collectionId}`);
        
        console.log(`✅ Collection "${COLLECTION_NAME}" deleted successfully!`);
        console.log(`💡 Now run: npm run ai:index-lessons`);
        
    } catch (error) {
        console.error(`❌ Error:`, error.message);
        if (error.response) {
            console.error(`   Status: ${error.response.status}`);
            console.error(`   Data:`, error.response.data);
        }
        process.exit(1);
    }
}

clearCollection();



