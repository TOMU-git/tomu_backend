#!/bin/bash
# FINAL COMPLETE TEST - To'g'ri credentials bilan
# ================================================

echo "🎯 FINAL COMPLETE TEST"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Database credentials (to'g'ri)
DB_HOST="localhost"
DB_PORT="5432"
DB_USER="postgres"
DB_PASS="postgres"
DB_NAME="lms"

# 1. Login
echo "1️⃣ LOGIN (Token olish)"
echo "------------------------------------------------"
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:7777/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+998901234544",
    "password": "password"
  }')

echo "$LOGIN_RESPONSE" | jq . 2>/dev/null || echo "$LOGIN_RESPONSE"
echo ""

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.access_token' 2>/dev/null)

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ Login FAILED!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Token olindi: ${TOKEN:0:30}...${NC}"
echo ""

# 2. Session yaratish
echo "2️⃣ SESSION YARATISH"
echo "------------------------------------------------"
SESSION_RESPONSE=$(curl -s -X POST http://localhost:7777/api/ai/chat/sessions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "courseId": 1,
    "sessionLanguage": "ar"
  }')

echo "$SESSION_RESPONSE" | jq . 2>/dev/null || echo "$SESSION_RESPONSE"
echo ""

SESSION_ID=$(echo "$SESSION_RESPONSE" | jq -r '.data.id' 2>/dev/null)
MESSAGES_ARRAY=$(echo "$SESSION_RESPONSE" | jq -r '.data.messages' 2>/dev/null)

if [ "$SESSION_ID" == "null" ] || [ -z "$SESSION_ID" ]; then
    echo -e "${RED}❌ Session yaratilmadi!${NC}"
    echo ""
    echo "Backend console log'larni tekshiring!"
    exit 1
fi

echo -e "${GREEN}✅ Session yaratildi: ID = $SESSION_ID${NC}"
echo "📝 Messages array: $MESSAGES_ARRAY"
echo ""

# 3. Database tekshiruvi
echo "3️⃣ DATABASE VERIFICATION"
echo "------------------------------------------------"
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << EOF
-- Sessions
SELECT 
    'SESSIONS' as type,
    COUNT(*) as total,
    COUNT(CASE WHEN is_active THEN 1 END) as active
FROM ai_chat_sessions;

-- Messages
SELECT 
    'MESSAGES' as type,
    COUNT(*) as total,
    COUNT(CASE WHEN session_id IS NOT NULL THEN 1 END) as with_session_id
FROM ai_chat_messages;

-- Last session details
SELECT 
    'LAST SESSION' as info,
    id,
    user_id,
    course_id,
    session_language,
    is_active
FROM ai_chat_sessions
ORDER BY created_at DESC
LIMIT 1;
EOF
echo ""

# 4. GET /sessions/:id/messages API
echo "4️⃣ GET MESSAGES (via API)"
echo "------------------------------------------------"
MESSAGES_RESPONSE=$(curl -s -X GET "http://localhost:7777/api/ai/chat/sessions/$SESSION_ID/messages" \
  -H "Authorization: Bearer $TOKEN")

echo "$MESSAGES_RESPONSE" | jq . 2>/dev/null || echo "$MESSAGES_RESPONSE"
MESSAGES_COUNT=$(echo "$MESSAGES_RESPONSE" | jq -r '.data | length' 2>/dev/null)
echo ""
echo "📊 Messages count: $MESSAGES_COUNT"
echo ""

# 5. Session qayta olish
echo "5️⃣ SESSION QAYTA OLISH (messages bilan)"
echo "------------------------------------------------"
SESSION_RESPONSE_2=$(curl -s -X POST http://localhost:7777/api/ai/chat/sessions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "courseId": 1,
    "sessionLanguage": "ar"
  }')

echo "$SESSION_RESPONSE_2" | jq '.data | {id, sessionLanguage, messages: .messages | length}' 2>/dev/null
echo ""

# 6. Final Summary
echo "================================================"
echo "📊 FINAL RESULT:"
echo "================================================"
echo ""

DB_SESSIONS=$(PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM ai_chat_sessions;" | tr -d ' ')
DB_MESSAGES=$(PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM ai_chat_messages;" | tr -d ' ')

if [ "$DB_SESSIONS" -gt 0 ]; then
    echo -e "${GREEN}✅ Sessions in DB: $DB_SESSIONS${NC}"
else
    echo -e "${RED}❌ Sessions in DB: 0${NC}"
fi

if [ "$DB_MESSAGES" -gt 0 ]; then
    echo -e "${GREEN}✅ Messages in DB: $DB_MESSAGES${NC}"
else
    echo -e "${YELLOW}⚠️  Messages in DB: 0 (normal - voice xabar yuborilmagan)${NC}"
fi

echo ""
echo "💡 XULOSA:"
echo "------------------------------------------------"
if [ "$DB_SESSIONS" -gt 0 ]; then
    echo -e "${GREEN}✅ Session CREATE ishlayapti!${NC}"
    
    if [ "$MESSAGES_COUNT" == "0" ]; then
        echo -e "${YELLOW}📝 messages: [] (bo'sh) ← BU NORMAL!${NC}"
        echo ""
        echo "Sabab: Hech qanday voice xabar yuborilmagan."
        echo "Voice xabar yuborilsa, messages to'liq bo'ladi."
    else
        echo -e "${GREEN}✅ Messages: $MESSAGES_COUNT ta${NC}"
    fi
else
    echo -e "${RED}❌ Session CREATE ishlamayapti!${NC}"
    echo ""
    echo "Backend console log'larni tekshiring:"
    echo "  - Terminal'da backend'ning ishlab turgan consoleni ko'ring"
    echo "  - [AI Chat Session] log'larni qidiring"
    echo "  - Xato stacktrace'ni ko'ring"
fi

echo ""
echo "================================================"


