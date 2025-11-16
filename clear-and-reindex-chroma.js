/**
 * ChromaDB'ni tozalash va qaytadan indekslash script
 * 
 * Bu script:
 * 1. ChromaDB collection'ni o'chiradi
 * 2. Memory index faylini o'chiradi
 * 3. Qaytadan indekslaydi
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const CHROMA_URL = process.env.CHROMA_URL || 'http://localhost:8000';
const CHROMA_TENANT = process.env.CHROMA_TENANT || 'default_tenant';
const CHROMA_DATABASE = process.env.CHROMA_DATABASE || 'default_database';
const COLLECTION_NAME = process.env.CHROMA_COLLECTION || 'lessons';
const CHROMA_API_KEY = process.env.CHROMA_API_KEY || '';

const API_BASE = `${CHROMA_URL}/api/v2/tenants/${CHROMA_TENANT}/databases/${CHROMA_DATABASE}`;

function getHeaders() {
    const headers = {
        'Content-Type': 'application/json',
    };
    if (CHROMA_API_KEY) {
        headers['X-Chroma-Token'] = CHROMA_API_KEY;
    }
    return headers;
}

async function deleteCollection() {
    try {
        console.log(`🔍 ChromaDB'ga ulanish: ${API_BASE}`);
        
        const headers = getHeaders();
        
        // Collection'larni olish
        const listRes = await axios.get(`${API_BASE}/collections`, { headers });
        const collections = listRes.data || [];
        const collection = collections.find(c => c.name === COLLECTION_NAME);
        
        if (!collection) {
            console.log(`✅ Collection topilmadi: ${COLLECTION_NAME}`);
            return true;
        }
        
        console.log(`📋 Topilgan collection: ${COLLECTION_NAME} (${collection.id.substring(0, 8)}...)`);
        
        // Collection'ni o'chirish
        console.log(`🗑️  Collection o'chirilmoqda...`);
        const deleteRes = await axios.delete(`${API_BASE}/collections/${collection.id}`, { headers });
        
        if (deleteRes.status === 200 || deleteRes.status === 204) {
            console.log(`✅ Collection muvaffaqiyatli o'chirildi!`);
            return true;
        } else {
            console.log(`⚠️  Collection o'chirish natijasi: ${deleteRes.status}`);
            return false;
        }
    } catch (error) {
        if (error.response?.status === 404) {
            console.log(`✅ Collection allaqachon o'chirilgan yoki topilmadi`);
            return true;
        }
        console.error(`❌ Collection o'chirishda xato: ${error.message}`);
        if (error.response?.data) {
            console.error(`   Xato ma'lumotlari:`, JSON.stringify(error.response.data, null, 2));
        }
        return false;
    }
}

async function deleteMemoryIndex() {
    try {
        const memoryIndexPath = path.resolve(process.cwd(), 'data', '.memory-index.json');
        
        try {
            await fs.access(memoryIndexPath);
            await fs.unlink(memoryIndexPath);
            console.log(`✅ Memory index fayli o'chirildi: ${memoryIndexPath}`);
            return true;
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log(`✅ Memory index fayli topilmadi (bu normal)`);
                return true;
            }
            throw error;
        }
    } catch (error) {
        console.error(`❌ Memory index o'chirishda xato: ${error.message}`);
        return false;
    }
}

async function reindex() {
    try {
        console.log(`\n🔄 Qaytadan indekslash boshlandi...`);
        console.log(`   Bu biroz vaqt olishi mumkin...\n`);
        
        // NestJS application context yaratish
        const { NestFactory } = require('@nestjs/core');
        const { AppModule } = require('./dist/app.module');
        
        const app = await NestFactory.createApplicationContext(AppModule, {
            logger: ['error', 'warn', 'log'],
        });
        
        try {
            // ChromaService'ni olish - class sifatida
            const { ChromaService } = require('./dist/modules/ai/services/chroma.service');
            const chroma = app.get(ChromaService);
            
            if (!chroma) {
                console.error(`❌ ChromaService topilmadi!`);
                return false;
            }
            
            console.log(`✅ ChromaService topildi, indekslash boshlandi...`);
            
            // Kursni indekslash
            const result = await chroma.indexCourse({ courseId: 1 });
            
            console.log(`\n✅ Indekslash yakunlandi!`);
            console.log(`   - Indekslangan chunks: ${result.indexed}`);
            console.log(`   - ChromaDB muvaffaqiyatli: ${result.chromaSuccess ? 'Ha' : 'Yo\'q'}`);
            
            if (result.indexed === 0) {
                console.warn(`⚠️  Hech qanday chunk indekslanmadi!`);
            }
            
            return true;
        } finally {
            await app.close();
        }
    } catch (error) {
        console.error(`❌ Indekslashda xato: ${error.message}`);
        if (error.stack) {
            console.error(error.stack);
        }
        return false;
    }
}

async function main() {
    console.log(`🚀 ChromaDB tozalash va qaytadan indekslash\n`);
    console.log(`📋 Parametrlar:`);
    console.log(`   - ChromaDB URL: ${CHROMA_URL}`);
    console.log(`   - Collection: ${COLLECTION_NAME}`);
    console.log(`   - Tenant: ${CHROMA_TENANT}`);
    console.log(`   - Database: ${CHROMA_DATABASE}\n`);
    
    // 1. ChromaDB collection'ni o'chirish
    console.log(`1️⃣  ChromaDB collection o'chirilmoqda...`);
    const deleted = await deleteCollection();
    if (!deleted) {
        console.log(`⚠️  Collection o'chirilmadi, lekin davom etamiz...\n`);
    }
    
    // 2. Memory index'ni o'chirish
    console.log(`\n2️⃣  Memory index o'chirilmoqda...`);
    await deleteMemoryIndex();
    
    // 3. Qaytadan indekslash
    console.log(`\n3️⃣  Qaytadan indekslash...`);
    const reindexed = await reindex();
    
    if (reindexed) {
        console.log(`\n✅ Barcha jarayonlar muvaffaqiyatli yakunlandi!`);
        process.exit(0);
    } else {
        console.log(`\n❌ Indekslashda muammo bo'ldi`);
        process.exit(1);
    }
}

main().catch(error => {
    console.error(`❌ Umumiy xato:`, error);
    process.exit(1);
});

