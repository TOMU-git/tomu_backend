-- FIX: Migration Issue - Nullable sessionId
-- =====================================================
-- Muammo: TypeORM synchronize mode'da nullable: false constraint qo'sha olmayapti
-- Sabab: Database'da null qiymatlar mavjud (yoki table structure eski)

-- VARIANT 1: Barcha null qiymatlarni o'chirish (agar kerak bo'lsa)
-- ⚠️ Bu orphan messages (sessiyasi yo'q xabarlar)ni o'chiradi
DELETE FROM ai_chat_messages WHERE session_id IS NULL;

-- VARIANT 2: Barcha xabarlarni o'chirish (test data uchun)
-- ⚠️ EHTIYOT: Hamma xabarlar o'chib ketadi!
-- TRUNCATE TABLE ai_chat_messages CASCADE;

-- VARIANT 3: Table'ni butunlay qayta yaratish
-- ⚠️ EHTIYOT: Hamma ma'lumotlar yo'qoladi!
-- DROP TABLE IF EXISTS ai_chat_messages CASCADE;
-- DROP TABLE IF EXISTS ai_chat_sessions CASCADE;
-- -- TypeORM qayta yaratadi (synchronize: true)

-- =====================================================
-- QANDAY ISHLATISH:
-- 1. Database'ga ulanish:
--    psql -h localhost -p 5433 -U postgres -d tomu_lms
-- 
-- 2. Orphan messages'ni o'chirish (tavsiya):
--    \i fix-migration-issue.sql
--
-- 3. Backend'ni qayta ishga tushirish
-- =====================================================

-- Database statistikasini ko'rish:
SELECT 
    'ai_chat_sessions' as table_name,
    COUNT(*) as total_rows
FROM ai_chat_sessions
UNION ALL
SELECT 
    'ai_chat_messages' as table_name,
    COUNT(*) as total_rows
FROM ai_chat_messages
UNION ALL
SELECT 
    'messages_with_null_session' as table_name,
    COUNT(*) as total_rows
FROM ai_chat_messages
WHERE session_id IS NULL;


