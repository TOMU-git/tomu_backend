#!/bin/bash
# Real-time API test - Backend console'ni kuzatish bilan
# =======================================================

echo "🧪 REAL-TIME API TEST"
echo "======================================================="
echo ""

# Backend console log fayliga yozish uchun
LOG_FILE="./test-output.log"
> $LOG_FILE

echo "1️⃣ TEST: Health Check"
echo "-------------------------------------------------------"
HEALTH=$(curl -s http://localhost:7777/)
echo "Response: $HEALTH"
echo ""

echo "2️⃣ TEST: Session Creation (WITHOUT AUTH)"
echo "-------------------------------------------------------"
echo "Request: POST /api/ai/chat/sessions"
echo "Body: {}"
echo ""

RESPONSE=$(curl -s -X POST http://localhost:7777/api/ai/chat/sessions \
  -H "Content-Type: application/json" \
  -d '{}' 2>&1)

echo "Response:"
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo ""

# Check if auth error
if echo "$RESPONSE" | grep -q "401\|Unauthorized\|Token topilmadi"; then
    echo "⚠️  RESULT: Auth token kerak!"
    echo ""
    echo "📝 KEYINGI QADAM:"
    echo "   1. Test user yarating yoki mavjud user'dan token oling"
    echo "   2. Token bilan qayta test qiling"
    echo ""
    echo "   TOKEN OLISH:"
    echo "   - POST /api/auth/login (username, password)"
    echo "   - Yoki database'dan to'g'ridan-to'g'ri:"
    echo ""
    echo "   PGPASSWORD=postgres123 psql -h localhost -p 5433 -U postgres -d tomu_lms -c \"SELECT id, username FROM users LIMIT 5;\""
    echo ""
else
    echo "✅ RESULT: Response received (check above)"
fi

echo "======================================================="
echo "📊 DATABASE AFTER TEST:"
echo "-------------------------------------------------------"
PGPASSWORD=postgres123 psql -h localhost -p 5433 -U postgres -d tomu_lms -c "SELECT COUNT(*) as sessions FROM ai_chat_sessions; SELECT COUNT(*) as messages FROM ai_chat_messages;"

echo ""
echo "======================================================="
echo "💡 NEXT STEPS:"
echo "======================================================="
echo ""
echo "Agar auth error bo'lsa:"
echo "  1. User yarating: node create-test-user.js"
echo "  2. Token oling: POST /api/auth/login"
echo "  3. Token bilan test qiling"
echo ""
echo "Agar boshqa error bo'lsa:"
echo "  - Backend console log'larini tekshiring (terminal'da)"
echo "  - Xato stacktrace'ni ko'ring"
echo ""


