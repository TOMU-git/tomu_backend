/**
 * Script to clear all documents from ChromaDB collection by getting all IDs and deleting them
 */

const axios = require('axios');

const CHROMA_URL = process.env.CHROMA_URL || 'http://localhost:8000';
const CHROMA_TENANT = process.env.CHROMA_TENANT || 'default_tenant';
const CHROMA_DATABASE = process.env.CHROMA_DATABASE || 'default_database';
const COLLECTION_NAME = process.env.CHROMA_COLLECTION || 'lessons';

const API_BASE = `${CHROMA_URL}/api/v2/tenants/${CHROMA_TENANT}/databases/${CHROMA_DATABASE}`;

async function getAllIds(collectionId) {
    const allIds = [];
    const limit = 10000; // Large limit to get all at once
    
    try {
        const response = await axios.post(
            `${API_BASE}/collections/${collectionId}/get`,
            { limit },
            { headers: { 'Content-Type': 'application/json' } }
        );
        
        const ids = response.data.ids || [];
        allIds.push(...ids);
    } catch (error) {
        // If limit is too large, try with smaller batches
        const batchLimit = 1000;
        let fetched = 0;
        
        while (true) {
            try {
                const response = await axios.post(
                    `${API_BASE}/collections/${collectionId}/get`,
                    { limit: batchLimit, offset: fetched },
                    { headers: { 'Content-Type': 'application/json' } }
                );
                
                const ids = response.data.ids || [];
                if (ids.length === 0) break;
                
                allIds.push(...ids);
                fetched += ids.length;
                
                if (ids.length < batchLimit) break;
            } catch (e) {
                // If offset doesn't work, just get what we can
                break;
            }
        }
    }
    
    return allIds;
}

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
        
        // Get all IDs
        console.log(`📥 Fetching all document IDs...`);
        const allIds = await getAllIds(collectionId);
        console.log(`📥 Found ${allIds.length} documents to delete`);
        
        // Delete in batches
        const batchSize = 100;
        console.log(`🗑️  Deleting documents in batches of ${batchSize}...`);
        
        for (let i = 0; i < allIds.length; i += batchSize) {
            const batch = allIds.slice(i, i + batchSize);
            await axios.post(
                `${API_BASE}/collections/${collectionId}/delete`,
                { ids: batch },
                { headers: { 'Content-Type': 'application/json' } }
            );
            console.log(`   Deleted ${Math.min(i + batchSize, allIds.length)}/${allIds.length} documents...`);
        }
        
        console.log(`✅ All documents deleted successfully!`);
        
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
