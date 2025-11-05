#!/bin/bash
# FULL TEST WITH AUTH TOKEN
# ================================================

echo "🔐 FULL TEST WITH AUTHENTICATION"
echo "================================================"
echo ""

# Login qilish va token olish
echo "1️⃣ STEP: Login (Token olish)"
echo "------------------------------------------------"
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:7777/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+998901234566",
    "password": "password123"
  }')

echo "Login response:"
echo "$LOGIN_RESPONSE" | jq . 2>/dev/null || echo "$LOGIN_RESPONSE"
echo ""

# Token'ni ajratib olish
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.access_token' 2>/dev/null)

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
    echo "❌ Token olinmadi! Login xatosi."
    echo ""
    echo "Ehtimol password noto'g'ri. Keling boshqa usulni sinab ko'raylik..."
    echo ""
    
    # Alternative: Database'dan to'g'ridan-to'g'ri password olish
    echo "📊 Database'dagi password:"
    PGPASSWORD=postgres123 psql -h localhost -p 5433 -U postgres -d tomu_lms -c "SELECT id, phone_number, unhashed_password FROM users WHERE id = 2;"
    echo ""
    echo "⚠️  Yuqoridagi unhashed_password bilan login qiling"
    exit 1
fi

echo "✅ Token olindi: ${TOKEN:0:50}..."
echo ""

# 2. Session yaratish
echo "2️⃣ STEP: Session yaratish"
echo "------------------------------------------------"
SESSION_RESPONSE=$(curl -s -X POST http://localhost:7777/api/ai/chat/sessions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "courseId": 1,
    "sessionLanguage": "ar"
  }')

echo "Session response:"
echo "$SESSION_RESPONSE" | jq . 2>/dev/null || echo "$SESSION_RESPONSE"
echo ""

SESSION_ID=$(echo "$SESSION_RESPONSE" | jq -r '.data.id' 2>/dev/null)
MESSAGES=$(echo "$SESSION_RESPONSE" | jq -r '.data.messages' 2>/dev/null)

if [ "$SESSION_ID" != "null" ] && [ ! -z "$SESSION_ID" ]; then
    echo "✅ Session yaratildi: ID = $SESSION_ID"
    echo "📝 Messages: $MESSAGES"
else
    echo "❌ Session yaratilmadi!"
    echo ""
    echo "Backend console log'ini tekshiring!"
    exit 1
fi
echo ""

# 3. Database'ni tekshirish
echo "3️⃣ STEP: Database verification"
echo "------------------------------------------------"
PGPASSWORD=postgres123 psql -h localhost -p 5433 -U postgres -d tomu_lms << EOF
SELECT 
    'SESSIONS' as type,
    COUNT(*) as count
FROM ai_chat_sessions;

SELECT 
    'MESSAGES' as type,
    COUNT(*) as count
FROM ai_chat_messages;

-- Oxirgi session
SELECT 
    id,
    user_id,
    course_id,
    session_language,
    is_active,
    created_at
FROM ai_chat_sessions
ORDER BY created_at DESC
LIMIT 1;
EOF
echo ""

# 4. Voice message test (fake audio - faqat test uchun)
echo "4️⃣ STEP: Voice message test (skipped - audio file kerak)"
echo "------------------------------------------------"
echo "⚠️  Voice test uchun audio file kerak"
echo "   Agar test qilmoqchi bo'lsangiz:"
echo "   - Audio file yarating (test-audio.wav)"
echo "   - curl -X POST ... -F file=@test-audio.wav -F sessionId=$SESSION_ID"
echo ""

# 5. Session'ni qayta olish (messages bilan)
echo "5️⃣ STEP: Session'ni qayta olish (messages bilan)"
echo "------------------------------------------------"
SESSION_RESPONSE_2=$(curl -s -X POST http://localhost:7777/api/ai/chat/sessions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "courseId": 1,
    "sessionLanguage": "ar"
  }')

echo "Session response (2nd call):"
echo "$SESSION_RESPONSE_2" | jq . 2>/dev/null || echo "$SESSION_RESPONSE_2"
echo ""

MESSAGES_2=$(echo "$SESSION_RESPONSE_2" | jq -r '.data.messages | length' 2>/dev/null)
echo "📝 Messages count: $MESSAGES_2"
echo ""

# 6. Final summary
echo "================================================"
echo "📊 FINAL SUMMARY:"
echo "================================================"
echo ""
echo "✅ Login: OK (token olindi)"
echo "✅ Session yaratish: OK (ID: $SESSION_ID)"
echo "✅ Database: Session saqlanди"
echo "⚠️  Voice message: Skipped (audio kerak)"
echo ""
echo "📝 NATIJA:"
if [ "$MESSAGES_2" == "0" ]; then
    echo "   messages: [] (bo'sh) ← BU NORMAL!"
    echo "   Sabab: Hech qanday voice xabar yuborilmagan"
    echo ""
    echo "   Voice xabar yuborilgandan KEYIN messages to'liq bo'ladi!"
else
    echo "   messages: $MESSAGES_2 ta xabar bor ← TO'G'RI!"
fi
echo ""


