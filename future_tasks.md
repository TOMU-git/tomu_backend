Online Dars Moduli - Kelgusi Rejalar 🚀
Quyida backend tomondan qilinishi kerak bo'lgan vazifalar ro'yxati keltirilgan.

1. O'qituvchi To'lovlari (Teacher Payments) 💰
 TeacherPayment Entity: teacherId, lectureId, amount, status, paidAt maydonlari bilan entity yaratish.
 To'lov Hisoblash Logikasi: Har bir dars uchun o'qituvchiga to'lanadigan summani hisoblash (dars davomiyligi yoki qat'iy summa asosida).
 Avtomatik Hisoblash: Dars yakunlanganda (LectureStatus.COMPLETED) tizim avtomatik ravishda to'lovni hisoblab, PENDING statusida saqlashi kerak.
 Admin Tasdiqlash: Admin to'lovni tasdiqlagandan keyin status PAID ga o'zgarishi kerak.
2. Dars Yakunlash va Guruh Tozalash (Cleanup) 🧹
 O'quvchilarni Chiqarish: Dars tugagach, Telegram bot guruhdagi barcha o'quvchilarni chiqarib yuborishi kerak (banChatMember + unbanChatMember).
 Havolani Yangilash: Dars tugagach, eski taklif havolasi (inviteLink) bekor qilinishi (revokeChatInviteLink) va yangisi yaratilishi (createChatInviteLink) kerak.
 Yangilangan Havolani Saqlash: Yangi havola keyingi dars uchun database'ga saqlanishi kerak.
3. Guruhni Avtomatik Boshlash (Group Start Automation) ⏳
 Guruh To'lishini Tekshirish: Guruhda o'quvchilar soni maxStudents (12) ga yetganda, fillAt vaqti belgilanadi.
 3 Kunlik Delay: Cron job har kuni tekshiradi: agar fillAt dan 3 kun o'tgan bo'lsa, darslar jadvalini generatsiya qiladi.
 Birinchi Dars: Birinchi dars har doim 15:00 ga belgilanadi.
4. Xabarnoma va Eslatmalar (Notifications) 🔔
 Birinchi Dars Xabarnomasi: Darslar jadvali tuzilganda, faqat birinchi dars haqida o'qituvchilar guruhiga xabar yuborilishi kerak.
 Eslatmalar (Reminders):
 Dars boshlanishidan 1 soat oldin o'qituvchiga va o'quvchilarga eslatma.
 Dars boshlanishidan 15 daqiqa oldin "Dars boshlanmoqda" xabari va link.
 Jadval Bo'yicha Xabarlar: Keyingi darslar uchun xabarlar Cron job orqali dars kuni ertalab yoki belgilangan vaqtda yuborilishi kerak.
5. Dars Statuslarini Boshqarish (Lecture Lifecycle) 🔄
 Status O'zgarishi:
SCHEDULED -> IN_PROGRESS (Dars vaqti kirganda).
IN_PROGRESS -> COMPLETED (Dars vaqti tugaganda).
 Cron Job: Har minutda darslarni tekshirib, statuslarni yangilab turadigan job yozish.
6. Qo'shimcha (Misc) 🛠️
 Manual Override: Admin kerak bo'lganda darsni qo'lda boshlashi yoki tugatishi uchun API.
 Hisobotlar: O'qituvchilar uchun o'tilgan darslar va to'lovlar tarixi.
Tavsiya: Ishni "2. Dars Yakunlash va Guruh Tozalash" va "4. Xabarnoma va Eslatmalar" qismlaridan boshlash maqsadga muvofiq, chunki ular asosiy o'quv jarayoniga bevosita ta'sir qiladi.