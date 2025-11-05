#!/bin/bash
# FULL DIAGNOSTIC - Barcha muammolarni topish
# ================================================

echo "🔍 FULL SYSTEM DIAGNOSTIC"
echo "================================================"
echo ""

# 1. Backend holati
echo "📊 1. BACKEND PROCESS:"
echo "------------------------------------------------"
BACKEND_PID=$(lsof -ti :7777)
if [ -z "$BACKEND_PID" ]; then
    echo "❌ Backend ishlamayapti (port 7777 bo'sh)"
else
    echo "✅ Backend ishlamoqda (PID: $BACKEND_PID)"
    echo "   Process: $(ps -p $BACKEND_PID -o cmd= | head -c 100)"
fi
echo ""

# 2. Database ulanish
echo "📊 2. DATABASE CONNECTION:"
echo "------------------------------------------------"
PGPASSWORD=postgres123 psql -h localhost -p 5433 -U postgres -d tomu_lms -c "SELECT 1" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Database ulanishi ishlayapti"
else
    echo "❌ Database ulanishi ishlamayapti"
fi
echo ""

# 3. Database holati
echo "📊 3. DATABASE STATE:"
echo "------------------------------------------------"
PGPASSWORD=postgres123 psql -h localhost -p 5433 -U postgres -d tomu_lms << 'EOF'
-- Sessions
SELECT 
    'SESSIONS' as type,
    COUNT(*) as total,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active
FROM ai_chat_sessions;

-- Messages
SELECT 
    'MESSAGES' as type,
    COUNT(*) as total,
    COUNT(CASE WHEN session_id IS NOT NULL THEN 1 END) as with_session_id,
    COUNT(CASE WHEN session_id IS NULL THEN 1 END) as without_session_id
FROM ai_chat_messages;

-- Session-Message relationship
SELECT 
    'SESSION-MESSAGE JOIN' as type,
    COUNT(DISTINCT m.id) as messages_with_valid_session
FROM ai_chat_messages m
INNER JOIN ai_chat_sessions s ON m.session_id = s.id;
EOF
echo ""

# 4. TypeORM synchronize config
echo "📊 4. TYPEORM CONFIG:"
echo "------------------------------------------------"
if grep -q "synchronize.*true" src/common/config/database.config.ts; then
    echo "✅ TypeORM synchronize: true"
else
    echo "⚠️  TypeORM synchronize: false yoki topilmadi"
fi
echo ""

# 5. Entity file tekshiruvi
echo "📊 5. ENTITY sessionId FIELD:"
echo "------------------------------------------------"
echo "ai-chat-message.entity.ts:"
grep -A 1 "session_id" src/modules/ai/entities/ai-chat-message.entity.ts | head -5
echo ""

# 6. Recent git changes
echo "📊 6. RECENT GIT CHANGES:"
echo "------------------------------------------------"
echo "Modified files:"
git status --short | head -10
echo ""

# 7. Package versions
echo "📊 7. KEY PACKAGE VERSIONS:"
echo "------------------------------------------------"
node --version
npm --version
grep '"typeorm"' package.json
grep '"@nestjs/typeorm"' package.json
echo ""

# 8. Env variables (masking sensitive data)
echo "📊 8. ENV VARIABLES (partial):"
echo "------------------------------------------------"
echo "DATABASE_HOST: ${DATABASE_HOST:-localhost}"
echo "DATABASE_PORT: ${DATABASE_PORT:-5433}"
echo "DATABASE_USER: ${DATABASE_USER:-postgres}"
echo "DATABASE: ${DATABASE:-tomu_lms}"
echo ""

echo "================================================"
echo "✅ DIAGNOSTIC COMPLETE"
echo "================================================"


