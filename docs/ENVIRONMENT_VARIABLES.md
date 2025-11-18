# 🔧 Environment Variables Configuration






# Materiallarni joylashni boshlaymiz
















## TTS (Text-to-Speech) Settings

### TTS_MODEL
```bash
TTS_MODEL=tts-1-hd
```
**Options:**
- `tts-1-hd` - High quality (recommended for production)
- `tts-1` - Faster, lower quality (for development/testing)

---

### TTS_VOICE
```bash
TTS_VOICE=shimmer
```
**Available voices:**
- `shimmer` - ✅ **Recommended for Arabic** - Clear and smooth
- `nova` - Light and natural
- `alloy` - Clear and neutral
- `echo` - Deep voice
- `fable` - Expressive
- `onyx` - Deep and authoritative

**Best for Arabic:**
1. `shimmer` (most clear)
2. `nova` (natural)
3. `alloy` (neutral)

---

### TTS_SPEED ⭐ **CRITICAL FOR ARABIC**
```bash
TTS_SPEED=0.85
```
**Range:** 0.25 - 4.0 (default: 1.0)

**Why 0.85 is better for Arabic:**
- ✅ Clearer pronunciation of diacritics (تشكيل)
- ✅ Prevents dropping end-of-word sounds
- ✅ Better intonation
- ✅ More time for TTS to process complex Arabic characters

**Recommended values:**
- `0.85` - **Best for Arabic** (clear and accurate)
- `0.90` - Slightly faster (still good)
- `1.00` - Default (may drop endings)
- `0.80` - Very clear (but slower)

---

## How to Update

### 1. Create/Update `.env` file:
```bash
# In project root
cp .env.example .env
nano .env
```

### 2. Add TTS configuration:
```bash
# TTS Configuration
TTS_MODEL=tts-1-hd
TTS_VOICE=shimmer
TTS_SPEED=0.85
```

### 3. Restart server:
```bash
npm run start:dev
```

---

## Testing Different Configurations

### Test Script (optional)
Create a test script to compare different TTS settings:

```bash
# test-tts-settings.sh
#!/bin/bash

# Test different voices
for voice in shimmer nova alloy; do
    echo "Testing voice: $voice"
    TTS_VOICE=$voice TTS_SPEED=0.85 npm run test:tts
done

# Test different speeds
for speed in 0.80 0.85 0.90 1.00; do
    echo "Testing speed: $speed"
    TTS_VOICE=shimmer TTS_SPEED=$speed npm run test:tts
done
```

---

## Monitoring

### Check current TTS settings:
```typescript
// In your code
console.log('TTS Configuration:', {
    model: process.env.TTS_MODEL,
    voice: process.env.TTS_VOICE,
    speed: process.env.TTS_SPEED
});
```

### View in logs:
```bash
# Server will log on startup:
🔊 TTS Configuration:
   TTS_MODEL: tts-1-hd
   TTS_VOICE: shimmer
   TTS_SPEED: 0.85
```

---

## Troubleshooting

### Problem: TTS still drops ending sounds
**Solution:** Lower TTS_SPEED to 0.80 or 0.75

### Problem: TTS sounds robotic
**Solution:** Try different voices (nova, alloy)

### Problem: TTS pronunciation is unclear
**Solution:** 
1. Check diacritics coverage (should be 90%+)
2. Lower TTS_SPEED
3. Ensure GPT responses have full diacritics

---

## Cost Optimization

**TTS Pricing (OpenAI):**
- `tts-1-hd`: $15.00 / 1M characters
- `tts-1`: $15.00 / 1M characters (same price, but lower quality)

**Recommendation:** Always use `tts-1-hd` for production (same cost, better quality)

---

## Next Steps

1. ✅ Update `.env` with optimal settings
2. ✅ Test with different Arabic phrases
3. ✅ Monitor diacritics coverage in logs
4. ✅ Adjust TTS_SPEED based on user feedback

**Need help?** Check `/docs/TTS_ARABIC_PRONUNCIATION_GUIDE.md`

