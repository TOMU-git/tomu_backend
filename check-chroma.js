/**
 * Script to check ChromaDB collection contents
 */

const axios = require("axios");

const CHROMA_URL = process.env.CHROMA_URL || "http://localhost:8000";
const CHROMA_TENANT = process.env.CHROMA_TENANT || "default_tenant";
const CHROMA_DATABASE = process.env.CHROMA_DATABASE || "default_database";
const COLLECTION_NAME = process.env.CHROMA_COLLECTION || "lessons";

const API_BASE = `${CHROMA_URL}/api/v2/tenants/${CHROMA_TENANT}/databases/${CHROMA_DATABASE}`;

async function checkCollection() {
  try {
    console.log(`🔍 Connecting to ChromaDB: ${API_BASE}`);

    // Get collections
    const listRes = await axios.get(`${API_BASE}/collections`);
    const collections = listRes.data || [];
    const collection = collections.find((c) => c.name === COLLECTION_NAME);

    if (!collection) {
      console.log(`⚠️  Collection "${COLLECTION_NAME}" not found.`);
      return;
    }

    const collectionId = collection.id;
    console.log(
      `📋 Found collection: ${COLLECTION_NAME} (${collectionId.substring(0, 8)}...)`,
    );

    // Get collection count
    const countRes = await axios.get(
      `${API_BASE}/collections/${collectionId}/count`,
    );
    const count = countRes.data;
    console.log(`📊 Total documents in collection: ${count}`);

    // Get sample documents
    const queryRes = await axios.post(
      `${API_BASE}/collections/${collectionId}/query`,
      {
        query_embeddings: [[0] * 1536], // Dummy embedding
        n_results: 100,
        include: ["metadatas", "documents"],
      },
    );

    const metadatas = queryRes.data?.metadatas?.[0] || [];
    const documents = queryRes.data?.documents?.[0] || [];

    console.log(`\n📝 Sample documents (first 20):`);
    const chunkTypes = {};
    metadatas.forEach((meta, i) => {
      const chunkType = meta.chunkType || "unknown";
      chunkTypes[chunkType] = (chunkTypes[chunkType] || 0) + 1;
    });

    console.log(`\n📊 Chunk types in ChromaDB:`);
    Object.entries(chunkTypes).forEach(([type, count]) => {
      console.log(`   - ${type}: ${count}`);
    });

    console.log(`\n📝 Sample metadata (first 5):`);
    metadatas.slice(0, 5).forEach((meta, i) => {
      console.log(
        `   ${i + 1}. chunkType: ${meta.chunkType || "unknown"}, lessonOrder: ${meta.lessonOrder}, text: ${documents[i]?.substring(0, 50)}...`,
      );
    });
  } catch (error) {
    console.error(`❌ Error:`, error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, JSON.stringify(error.response.data, null, 2));
    }
  }
}

checkCollection();


