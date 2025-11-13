# Fonetik TTS Konvertatsiya Qo'llanmasi

## Umumiy ma'lumot

Bu xizmat arabcha matnni fonetik formatga (IPA - International Phonetic Alphabet) o'tkazish orqali TTS talaffuzini yaxshilash uchun yaratilgan.

## Muammo

OpenAI TTS API arabcha matnlarni inglizcha aksent bilan talaffuz qiladi, chunki:
- TTS API `language` parametrini qo'llab-quvvatlamaydi
- "Shimmer" kabi ovoz modellari asosan ingliz tiliga moslashtirilgan
- Arabcha harflar inglizcha fonetika qoidalari bilan talaffuz qilinadi

## Yechim

Fonetik konvertatsiya xizmati arabcha matnni IPA formatiga o'tkazadi, bu esa TTS uchun to'g'ri talaffuzni ta'minlaydi.

## Qo'shilgan fayllar

1. **`src/modules/ai/services/phonetic.service.ts`** - Fonetik konvertatsiya xizmati
2. **`src/modules/ai/services/tts.service.ts`** - TTS xizmatiga fonetik konvertatsiya qo'shildi
3. **`src/modules/ai/ai.module.ts`** - PhoneticService module'ga qo'shildi
4. **`docker-compose.yml`** - Environment variable'lar qo'shildi

## Environment Variable'lar

### `.env` faylida qo'shish kerak:

```env
# TTS Fonetik Konvertatsiya
TTS_USE_PHONETIC=false          # true/false - fonetik konvertatsiyani yoqish/o'chirish
TTS_PHONETIC_MODE=ipa           # "ipa" yoki "english" - konvertatsiya rejimi
```

### Qadamlari:

1. **Fonetik konvertatsiyani yoqish:**
   ```env
   TTS_USE_PHONETIC=true
   TTS_PHONETIC_MODE=ipa
   ```

2. **Fonetik konvertatsiyani o'chirish:**
   ```env
   TTS_USE_PHONETIC=false
   ```

## Konvertatsiya rejimlari

### 1. IPA rejimi (tavsiya etiladi)
- Arabcha harflarni IPA (International Phonetic Alphabet) formatiga o'tkazadi
- Aniq fonetik belgilar ishlatiladi
- Masalan: `ب` → `b`, `ث` → `θ`, `خ` → `x`

**Misol:**
```
Input:  "مَا هَذَا يَا فَرِيد؟"
Output: "maː haðaː jaː fariːd?"
```

### 2. English rejimi
- Arabcha harflarni inglizcha talaffuzga yaqin formatga o'tkazadi
- IPA belgilar o'rniga inglizcha harflar ishlatiladi
- Masalan: `ب` → `b`, `ث` → `th`, `خ` → `kh`

**Misol:**
```
Input:  "مَا هَذَا يَا فَرِيد؟"
Output: "ma haza ya farid?"
```

## Qanday ishlaydi?

1. TTS xizmati matnni qabul qiladi
2. Agar `TTS_USE_PHONETIC=true` va `language='ar'` bo'lsa:
   - Matn fonetik formatga o'tkaziladi
   - Konvertatsiya qilingan matn TTS API'ga yuboriladi
3. Agar fonetik konvertatsiya o'chirilgan bo'lsa:
   - Asl matn o'zgartirilmasdan TTS API'ga yuboriladi

## Qo'llab-quvvatlanadigan arabcha harflar

### Undoshlar (Consonants):
- ب → b, t, θ, d͡ʒ, ħ, x, d, ð, r, z, s, ʃ, sˤ, dˤ, tˤ, ðˤ, ʕ, ɣ, f, q, k, l, m, n, h, w, j

### Unlilar (Vowels):
- ا → a, أ → ʔa, إ → ʔi, آ → ʔaː, ء → ʔ

### Harakatlar (Diacritics):
- َ → a (fatha)
- ُ → u (damma)
- ِ → i (kasra)
- ً → an (tanwin fatha)
- ٌ → un (tanwin damma)
- ٍ → in (tanwin kasra)
- ْ → (sukun - no vowel)
- ّ → (shadda - gemination)

## Sinov

### 1. Fonetik konvertatsiyani yoqish:
```bash
# .env faylida
TTS_USE_PHONETIC=true
TTS_PHONETIC_MODE=ipa
```

### 2. Dasturni qayta ishga tushirish:
```bash
npm run start:dev
```

### 3. TTS orqali audio yaratish va talaffuzni tekshirish

## Eslatmalar

1. **IPA rejimi** aniqroq talaffuz beradi, lekin ba'zi TTS xizmatlari IPA belgilarni to'liq qo'llab-quvvatlamasligi mumkin
2. **English rejimi** ko'proq TTS xizmatlari bilan mos keladi, lekin talaffuz aniqligi biroz pastroq bo'lishi mumkin
3. Agar fonetik konvertatsiya ishlamasa, uni o'chirib, boshqa yechimlarni sinab ko'ring:
   - TTS_VOICE ni o'zgartirish (masalan, `alloy`, `nova`)
   - Boshqa TTS xizmatidan foydalanish (Google Cloud TTS, Azure Speech)

## Muammolarni hal qilish

### Talaffuz yaxshilanmagan:
1. `TTS_USE_PHONETIC=true` ekanligini tekshiring
2. `TTS_PHONETIC_MODE` ni o'zgartirib sinab ko'ring
3. TTS_VOICE ni o'zgartirib sinab ko'ring

### Xatolar:
1. Log'larni tekshiring
2. Environment variable'larni tekshiring
3. PhoneticService kodini tekshiring

## Keyingi qadamlar

1. IPA mapping'ni yanada aniqroq qilish
2. Kontekstga asoslangan talaffuz tuzatishlari
3. Harakat belgilarini (tashkeel) yanada to'g'ri qayta ishlash
4. Boshqa TTS xizmatlari bilan integratsiya

