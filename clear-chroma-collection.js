/**
 * Script to clear all documents from ChromaDB collection
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
        
        // Get count
        const countRes = await axios.get(`${API_BASE}/collections/${collectionId}/count`);
        const count = countRes.data;
        console.log(`📊 Current document count: ${count}`);
        
        if (count === 0) {
            console.log(`✅ Collection is already empty.`);
            return;
        }
        
        // Delete all documents using where clause (empty where = all documents)
        console.log(`🗑️  Deleting all documents...`);
        try {
            // Try to delete with empty where clause
            await axios.post(`${API_BASE}/collections/${collectionId}/delete`, {
                where: {} // Empty where = delete all
            });
            console.log(`✅ All documents deleted successfully!`);
        } catch (deleteError) {
            // If that doesn't work, try deleting collection and recreating
            console.log(`⚠️  Delete with where clause failed, trying to delete and recreate collection...`);
            try {
                await axios.delete(`${API_BASE}/collections/${collectionId}`);
                console.log(`✅ Collection deleted. It will be recreated on next indexing.`);
            } catch (delError) {
                console.error(`❌ Failed to delete collection:`, delError.message);
                throw delError;
            }
        }
        
        // Verify
        const newCountRes = await axios.get(`${API_BASE}/collections/${collectionId}/count`);
        const newCount = newCountRes.data;
        console.log(`📊 New document count: ${newCount}`);
        
        console.log(`\n💡 Now run: npm run ai:index-lessons`);
        
    } catch (error) {
        console.error(`❌ Error:`, error.message);
        if (error.response) {
            console.error(`   Status: ${error.response.status}`);
            console.error(`   Data:`, JSON.stringify(error.response.data, null, 2));
        }
        process.exit(1);
    }
}

clearCollection();



