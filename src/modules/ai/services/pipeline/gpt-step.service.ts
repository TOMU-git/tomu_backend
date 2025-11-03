import { Injectable } from "@nestjs/common";
import { GPTService, GPTResponse } from "../gpt.service";
import { TranslationService } from "../translation.service";
import { PipelineStep, VoiceInput } from "./pipeline.types";
import { ArabicTextUtils } from "../../utils/arabic-text.util";
import { AI_FALLBACK_MESSAGES } from "../../constants/error-messages";

/**
 * GPT Step: AI response generation
 * This is a very large class (1250+ lines) containing all the complex matching and validation logic
 */
@Injectable()
export class GPTStep implements PipelineStep {
    constructor(
        private readonly gpt: GPTService,
        private readonly translation: TranslationService,
    ) { }
    async execute(input: VoiceInput & { validatedText: string; context: any; conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>; lastWatchedLessonOrder?: number }): Promise<VoiceInput> {
        // User input logging
        console.log("\n🧠 GPTStep: Starting execution...");
        console.log(`   Context type: ${Array.isArray(input.context) ? 'array' : typeof input.context}`);
        console.log(`   Context length: ${Array.isArray(input.context) ? input.context.length : 'N/A'}`);
        console.log(`   Conversation history length: ${input.conversationHistory?.length || 0}`);
        console.log(`   Last watched lesson order: ${input.lastWatchedLessonOrder || 0}`);

        const userLatin = ArabicTextUtils.transliterateArabic(input.validatedText || "");

        console.log("\n👤 User:");
        console.log("   Arab: " + input.validatedText);
        console.log("   Lotin: " + userLatin);

        // 0) Conversation history'dan topic/mavzuni aniqlash (bir marta)
        const conversationTopic = this.extractConversationTopic(input.conversationHistory || [], input.context);

        // 1) Kontekstga tayangan leksik tuzatish va echo-avoidance
        // Conversation history'dan topic olib, STT xatolarini tuzatish
        let userTextCorrected = this.applyConversationAwareCorrection(
            input.validatedText || '',
            input.context,
            conversationTopic
        );

        // IMPORTANT: Dialogue gap'larini to'liq qidirish va similarity bilan tuzatish
        // Bu "لَا حَاسَبَيْتٌ" → "لَا، هَذَا بَيْتٌ" kabi STT xatolarini tuzatish uchun
        const originalUserTextBeforeCorrection = userTextCorrected; // Tuzatishdan oldingi text
        userTextCorrected = this.applyDialogueSentenceCorrection(
            userTextCorrected,
            input.context
        );

        // Agar gap tuzatilgan bo'lsa, log qilish
        if (userTextCorrected !== originalUserTextBeforeCorrection) {
            console.log(`   ✏️  User text was corrected: "${originalUserTextBeforeCorrection}" → "${userTextCorrected}"`);
        }

        const userText = userTextCorrected;
        const lastWatchedLessonOrder = input.lastWatchedLessonOrder || 0;

        // Normalization funksiyalari - punctuation va diacritics'ni olib tashlash
        const stripDiacritics = (t: string) => t.replace(/[\u064B-\u065F\u0670\u0640]/g, '');
        const stripPunctuation = (t: string) => t.replace(/[،,\.\?؟!;؛]/g, '').trim();
        const normalize = (t: string) => {
            const cleaned = stripPunctuation(stripDiacritics(t));
            return ArabicTextUtils.normalizeArabic(cleaned);
        };
        const splitSentences = (t: string): string[] => {
            const cleaned = (t || '').trim();
            if (!cleaned) return [];
            return cleaned
                .split(/(?<=[\.\!؟])\s+/)
                .map(s => s.trim())
                .filter(s => s.length > 0);
        };

        const normalizedUser = normalize(userText);
        let nextSentenceFromMaterial = '';
        let materialLessonOrder: number | null = null; // Materialdan olingan javob qaysi darsdan
        let materialTranslationUz: string | null = null; // Materialdan olingan javobning o'zbek tarjimasi
        let bestMatchNextSentence = '';
        let bestMatchNextSentenceTranslationUz: string | null = null; // Best match next sentence'ning translationUz
        let bestMatchSentence = ''; // O'xshash topilgan gap (keyingi gap emas)
        let bestMatchSentenceTranslationUz: string | null = null; // Best match sentence'ning translationUz
        let bestMatchScore = 0;
        let bestMatchLessonOrder: number | null = null;

        const wordSet = (t: string) => new Set(normalize(t).split(/\s+/).filter(Boolean));
        const jaccard = (a: Set<string>, b: Set<string>) => {
            if (a.size === 0 || b.size === 0) return 0;
            let inter = 0;
            for (const w of a) if (b.has(w)) inter++;
            const uni = new Set<string>([...a, ...b]).size;
            return inter / uni;
        };
        const userWords = wordSet(userText);

        // Conversation topic allaqachon aniqlangan (yuqorida)
        console.log(`\n💬 Conversation context:`);
        console.log(`   - Topic detected: ${conversationTopic.topic || 'none'}`);
        if (conversationTopic.keywords.length > 0) {
            console.log(`   - Keywords from history: ${conversationTopic.keywords.join(', ')}`);
        }

        // 1) BIRINCHI NAVBATDA: Materiallardan qidirish
        console.log(`\n🔍 Searching materials for user query: "${userText}"`);
        console.log(`   Context contains ${input.context?.length || 0} lesson chunks`);

        // IMPORTANT: Context'dagi materiallarni lessonOrder bo'yicha guruhlash
        // Har bir lesson uchun barcha turn'larni birlashtirish (dialogue to'liq ko'rinishi uchun)
        const lessonsMap = new Map<number, Array<{ text: string; turnIndex: number; speaker: string | null; translationUz: string | null }>>();
        if (Array.isArray(input.context)) {
            for (const chunk of input.context) {
                const lessonOrder = chunk?.lessonOrder || 0;
                const text: string = (chunk && (chunk.text || chunk.content || '')) as string;
                const turnIndex = chunk?.turnIndex ?? 0;
                const speaker = chunk?.speaker || null;
                const translationUz: string | null = chunk?.translationUz || null;

                if (!text || text.trim().length === 0) continue;

                if (!lessonsMap.has(lessonOrder)) {
                    lessonsMap.set(lessonOrder, []);
                }
                lessonsMap.get(lessonOrder)!.push({ text, turnIndex, speaker, translationUz });
            }
        }

        // Har bir lesson'ni turn'lar tartibida saralash va qidirish
        for (const [lessonOrder, turns] of lessonsMap.entries()) {
            // Turn'larni turnIndex bo'yicha tartiblash
            const sortedTurns = turns.sort((a, b) => a.turnIndex - b.turnIndex);

            // Barcha turn text'larini birlashtirish (dialogue to'liq ko'rinishi uchun)
            const allTurnsText = sortedTurns.map(t => t.text).join(' ');

            console.log(`   📚 Checking lesson ${lessonOrder} (${sortedTurns.length} turns): "${allTurnsText.substring(0, 50)}${allTurnsText.length > 50 ? '...' : ''}"`);

            // Turn'larni sentence'larga bo'lish - har bir turn alohida sentence
            // IMPORTANT: translationUz bilan birga saqlash (text va translationUz)
            const sentences = sortedTurns.map(t => ({ text: t.text, translationUz: t.translationUz }));
            console.log(`      Split into ${sentences.length} sentences (turn-by-turn)`);

            for (let i = 0; i < sentences.length; i++) {
                const sentenceData = sentences[i];
                const s = sentenceData.text;
                if (!s) continue;
                const normalizedSentence = normalize(s);

                // To'liq yoki kuchli moslik (punctuation va diacritics'ni e'tiborsiz qoldirib)
                const isExactMatch = normalizedSentence === normalizedUser;
                const sentenceIncludesUser = normalizedSentence.includes(normalizedUser);
                const userIncludesSentence = normalizedUser.includes(normalizedSentence);

                // Qo'shimcha: User gapining asosiy qismi (faqat so'zlar) material bilan mos keladimi?
                const userWordsArray = normalizedUser.split(/\s+/).filter(Boolean);
                const sentenceWordsArray = normalizedSentence.split(/\s+/).filter(Boolean);
                const userWordsInSentence = userWordsArray.filter(w => sentenceWordsArray.includes(w)).length;
                const wordsMatchRatio = userWordsArray.length > 0 ? userWordsInSentence / userWordsArray.length : 0;
                const isWordsMatch = wordsMatchRatio >= 0.8 && userWordsArray.length >= 3; // 80%+ so'zlar mos va kamida 3 so'z

                // FUZZY WORD MATCHING: Character-level similarity bilan so'zlarni solishtirish
                // STT xatolarini aniqlash uchun (masalan: "مَسْتِد" vs "مَسْجِد")
                let fuzzyWordsMatch = false;
                let fuzzyWordsMatchRatio = 0;
                if (userWordsArray.length >= 3 && sentenceWordsArray.length > 0) {
                    // Har bir user so'zini sentence so'zlari bilan character-level similarity bilan solishtirish
                    let fuzzyMatchedWords = 0;
                    const SIMILARITY_THRESHOLD = 0.75; // 75%+ similarity bo'lsa, so'z mos deb hisoblaymiz

                    for (const userWord of userWordsArray) {
                        if (userWord.length < 3) {
                            // Qisqa so'zlar (harflar, ko'rsatmalar) - exact match kerak
                            if (sentenceWordsArray.includes(userWord)) {
                                fuzzyMatchedWords++;
                            }
                            continue;
                        }

                        // Exact match tekshiruvi
                        if (sentenceWordsArray.includes(userWord)) {
                            fuzzyMatchedWords++;
                            continue;
                        }

                        // Character-level fuzzy matching
                        let bestSimilarity = 0;
                        let bestMatchedWord = '';
                        for (const sentenceWord of sentenceWordsArray) {
                            if (sentenceWord.length < 3) continue;

                            const similarity = this.calculateWordSimilarity(userWord, sentenceWord);
                            if (similarity > bestSimilarity) {
                                bestSimilarity = similarity;
                                bestMatchedWord = sentenceWord;
                            }
                        }

                        // Agar best similarity threshold'dan yuqori bo'lsa, match deb hisoblaymiz
                        if (bestSimilarity >= SIMILARITY_THRESHOLD) {
                            fuzzyMatchedWords++;
                            console.log(`      🔤 Fuzzy word match: "${userWord}" ≈ "${bestMatchedWord}" (similarity: ${(bestSimilarity * 100).toFixed(0)}%)`);
                        }
                    }

                    fuzzyWordsMatchRatio = userWordsArray.length > 0 ? fuzzyMatchedWords / userWordsArray.length : 0;
                    // 80%+ so'zlar fuzzy match bo'lsa va kamida 3 so'z bo'lsa, match deb hisoblaymiz
                    fuzzyWordsMatch = fuzzyWordsMatchRatio >= 0.8 && userWordsArray.length >= 3;
                }

                if (isExactMatch || sentenceIncludesUser || userIncludesSentence || isWordsMatch || fuzzyWordsMatch) {
                    const matchType = isExactMatch
                        ? 'exact'
                        : sentenceIncludesUser
                            ? 'sentence includes user'
                            : userIncludesSentence
                                ? 'user includes sentence'
                                : fuzzyWordsMatch
                                    ? `fuzzy words match (${(fuzzyWordsMatchRatio * 100).toFixed(0)}%)`
                                    : `words match (${(wordsMatchRatio * 100).toFixed(0)}%)`;

                    console.log(`      ✅ Match found at sentence ${i + 1}: "${s}"`);
                    console.log(`         User normalized: "${normalizedUser}"`);
                    console.log(`         Sentence normalized: "${normalizedSentence}"`);
                    console.log(`         Match type: ${matchType}`);

                    // IMPORTANT: Partial match (user includes sentence) bo'lsa, semantik kontekstni tekshirish
                    // Masalan: user "من مصر" (origin) dedi, lekin material "في المسجد" (location) haqida
                    if (userIncludesSentence && !isExactMatch) {
                        const nextSentenceText = sentences[i + 1]?.text || '';
                        const semanticContextMatch = this.validateSemanticContext(userText, s, nextSentenceText);
                        if (!semanticContextMatch) {
                            console.log(`      ⚠️  Semantic context mismatch - user query context doesn't match material context`);
                            console.log(`      💡 Skipping this match and continuing search...`);
                            continue; // Skip this match and continue searching
                        }
                        console.log(`      ✅ Semantic context validated - match is semantically valid`);
                    }

                    const candidateData = sentences[i + 1];
                    const candidate = candidateData?.text || '';
                    const isLastSentence = i === sentences.length - 1; // Bu oxirgi gapmi?

                    if (candidate && candidate.length > 1) {
                        console.log(`      ✅ Next sentence found: "${candidate}" (from lesson ${lessonOrder})`);
                        nextSentenceFromMaterial = candidate;
                        materialLessonOrder = lessonOrder;
                        // TranslationUz ni extract qilish - to'g'ridan-to'g'ri turn'dan
                        materialTranslationUz = candidateData?.translationUz || null;
                        if (materialTranslationUz) {
                            console.log(`      ✅ Found translationUz from material: "${materialTranslationUz}"`);
                        } else {
                            console.log(`      ⚠️  translationUz not found in material, will translate`);
                        }
                        break;
                    } else if (isLastSentence) {
                        // IMPORTANT: Agar user dialogue'dagi oxirgi gapni dedi va keyingi gap yo'q bo'lsa
                        // Bu dialogue tamom bo'lgani degani - tasdiqlash javobi berish kerak
                        console.log(`      ⚠️  No next sentence found after match - dialogue ended`);
                        console.log(`      💡 User spoke the LAST sentence in dialogue (sentence ${i + 1}/${sentences.length}) - this is a completion`);
                        // Material match topilgan, lekin keyingi gap yo'q - bu dialogue oxiri
                        // Bu holatni alohida belgilash uchun special marker qo'yamiz
                        nextSentenceFromMaterial = 'DIALOGUE_END'; // Special marker
                        materialLessonOrder = lessonOrder;
                        break;
                    } else {
                        // Match topilgan, lekin keyingi gap yo'q va bu oxirgi gap ham emas
                        // Bu oddiy holat - materialdan javob topilmadi
                        console.log(`      ⚠️  No next sentence found after match (not the last sentence)`);
                    }
                }

                // Fuzzy moslik: To'liq gap similarity (Levenshtein + word overlap) bilan yaqin gapni eslab qolamiz
                // Bu STT xatolarini ham topa oladi (masalan: "ذَهَبَ" vs "زَحَبَ")
                const sentenceSimilarity = this.calculateSentenceSimilarity(normalizedUser, normalizedSentence);

                // Jaccard score ham qo'shib qo'yamiz (backward compatibility uchun)
                const jaccardScore = jaccard(userWords, wordSet(s));

                // Kombinatsiyalangan score: sentence similarity 70%, jaccard 30%
                // Lekin agar sentence similarity yuqori bo'lsa (0.5+), faqat unga ishonamiz
                const combinedScore = sentenceSimilarity >= 0.5
                    ? sentenceSimilarity  // Yuqori similarity bo'lsa, faqat sentence similarity
                    : sentenceSimilarity * 0.7 + jaccardScore * 0.3; // Kombinatsiyalangan

                if (combinedScore > bestMatchScore) {
                    bestMatchScore = combinedScore;
                    bestMatchSentence = s; // O'xshash topilgan gap
                    bestMatchSentenceTranslationUz = sentenceData.translationUz; // TranslationUz ni saqlash
                    bestMatchNextSentence = sentences[i + 1]?.text || '';
                    bestMatchNextSentenceTranslationUz = sentences[i + 1]?.translationUz || null; // TranslationUz ni saqlash
                    bestMatchLessonOrder = lessonOrder;
                    if (combinedScore > 0.3) {
                        console.log(`      📊 Good fuzzy match (sentence similarity: ${(sentenceSimilarity * 100).toFixed(0)}%, jaccard: ${(jaccardScore * 100).toFixed(0)}%, combined: ${(combinedScore * 100).toFixed(0)}%): "${s}" -> next: "${bestMatchNextSentence}"`);
                    }
                }
            }

            if (nextSentenceFromMaterial) {
                console.log(`   ✅ Material match found in lesson ${lessonOrder}`);
                break;
            }
        }

        // IMPORTANT: Agar bestMatch sentence similarity juda yuqori bo'lsa (0.5+), 
        // bu materialni topgan deb hisoblash mumkin (STT xatoliklari tufayli exact match topilmasa ham)
        // Threshold 0.65 dan 0.5 ga pasaytirildi - katta STT xatolari bilan ham material topilishi uchun
        if (!nextSentenceFromMaterial && bestMatchScore >= 0.5 && bestMatchNextSentence && bestMatchNextSentence.length > 1) {
            console.log(`   ✅ High similarity match found (score: ${bestMatchScore.toFixed(2)}) - treating as material match despite STT errors`);
            nextSentenceFromMaterial = bestMatchNextSentence;
            materialLessonOrder = bestMatchLessonOrder;
            materialTranslationUz = bestMatchNextSentenceTranslationUz; // TranslationUz ni saqlash
            if (materialTranslationUz) {
                console.log(`   ✅ Found translationUz from best match: "${materialTranslationUz}"`);
            } else {
                console.log(`   ⚠️  translationUz not found in best match, will translate`);
            }
        }

        if (!nextSentenceFromMaterial) {
            console.log(`   ⚠️  No exact material match found. Best fuzzy match score: ${bestMatchScore.toFixed(2)}`);
        }

        let aiResponse = '';
        let aiResponseUz = '';
        let gptTime = 0;
        let gptUsage: GPTResponse['usage'] | undefined;

        // 2) AGAR MATERIALDAN TOPILDI - kelgan darslarni tekshirish
        if (nextSentenceFromMaterial) {
            // SPECIAL CASE: User dialogue'dagi oxirgi gapni dedi (keyingi gap yo'q)
            if (nextSentenceFromMaterial === 'DIALOGUE_END') {
                console.log(`✅ User completed the dialogue! Using confirmation response.`);
                aiResponse = AI_FALLBACK_MESSAGES.DIALOGUE_END_CONFIRMATION.arabic;
                aiResponseUz = AI_FALLBACK_MESSAGES.DIALOGUE_END_CONFIRMATION.uzbek;
                gptUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
            }
            // Agar topilgan javob kelmagan darsda bo'lsa
            else if (materialLessonOrder !== null && materialLessonOrder > lastWatchedLessonOrder) {
                console.log(`⚠️  Material topildi, lekin kelmagan darsda (lesson ${materialLessonOrder} > ${lastWatchedLessonOrder})`);
                aiResponse = AI_FALLBACK_MESSAGES.FUTURE_LESSON_RESPONSE.arabic;
                aiResponseUz = AI_FALLBACK_MESSAGES.FUTURE_LESSON_RESPONSE.uzbek;
                gptUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
            } else {
                // Kelgan darslardan - to'g'ri javob
                console.log(`\n🔍 Validating material response...`);
                console.log(`   User (original): "${userText}"`);
                console.log(`   User (normalized): "${normalizedUser}"`);
                console.log(`   Material: "${nextSentenceFromMaterial}"`);

                const materialResponseIsEcho = this.detectEcho(nextSentenceFromMaterial, userText, normalizedUser, userWords);
                const materialIsLogical = this.validateLogicalResponse(nextSentenceFromMaterial, userText, normalizedUser);
                const materialSemanticMatch = this.validateSemanticContext(userText, '', nextSentenceFromMaterial);
                // IMPORTANT: Ism mosligini tekshirish - agar user so'rovida ism bor va javobda boshqa ism bor bo'lsa, rad qilish
                const nameConsistencyMatch = this.validateNameConsistency(userText, nextSentenceFromMaterial);

                if (materialResponseIsEcho || !materialIsLogical || !materialSemanticMatch || !nameConsistencyMatch) {
                    // Materialdan javob echo yoki mantiqsiz bo'lsa
                    if (materialResponseIsEcho) {
                        console.log(`⚠️  Material response is ECHO, rejecting material response`);
                    } else if (!materialIsLogical) {
                        console.log(`⚠️  Material response is not logical (basic validation), rejecting material response`);
                    } else if (!materialSemanticMatch) {
                        console.log(`⚠️  Material response semantic context doesn't match user query, rejecting material response`);
                    } else if (!nameConsistencyMatch) {
                        console.log(`⚠️  Material response name doesn't match user query, rejecting material response`);
                    }
                    console.log(`⚠️  Material response failed validation - using NOT_UNDERSTOOD instead of asking GPT`);
                    aiResponse = AI_FALLBACK_MESSAGES.NOT_UNDERSTOOD.arabic;
                    aiResponseUz = AI_FALLBACK_MESSAGES.NOT_UNDERSTOOD.uzbek;
                    gptUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
                } else {
                    // Materialdan javob to'g'ri va kuchli mantiqiy tekshiruvdan o'tdi
                    console.log(`✅ Material response is valid (no echo, logical, STRONG logical, semantic match, name consistent).`);
                    aiResponse = nextSentenceFromMaterial;
                    // Materialdan translationUz ni olish, agar yo'q bo'lsa tarjima qilish
                    if (materialTranslationUz) {
                        aiResponseUz = materialTranslationUz;
                        console.log(`   ✅ Using translationUz from material: "${materialTranslationUz}"`);
                    } else {
                        // Material'da translationUz yo'q, tarjima qilish
                        try {
                            aiResponseUz = await this.translation.translateToUzbek(aiResponse);
                            console.log(`   ✅ Translated to Uzbek: "${aiResponseUz}"`);
                        } catch (e) {
                            console.warn(`   ⚠️  Translation failed, using empty string`);
                            aiResponseUz = '';
                        }
                    }
                    gptUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
                }
            }
        }
        // 3) AGAR YAQIN MATCH BO'LSA (50%+) - yordamlash
        else if (bestMatchScore >= 0.5 && bestMatchNextSentence && bestMatchNextSentence.length > 1) {
            // Kelmagan darsda bo'lsa ham yordam beramiz (lekin e'tiborli)
            if (bestMatchLessonOrder !== null && bestMatchLessonOrder > lastWatchedLessonOrder) {
                console.log(`⚠️  Yaqin match topildi, lekin kelmagan darsda`);
                aiResponse = AI_FALLBACK_MESSAGES.FUTURE_LESSON_RESPONSE.arabic;
                aiResponseUz = AI_FALLBACK_MESSAGES.FUTURE_LESSON_RESPONSE.uzbek;
                gptUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
            } else {
                // Yordamlash - shunday demoqchimisiz?
                // Bu echo emas, chunki "shunday demoqchimisan" pattern qo'shilgan
                const helpResponse = AI_FALLBACK_MESSAGES.CLOSE_MATCH_HELP.arabic + bestMatchNextSentence;
                const helpIsLogical = this.validateLogicalResponse(bestMatchNextSentence, userText, normalizedUser);

                if (helpIsLogical) {
                    aiResponse = helpResponse;
                    // TranslationUz ni saqlangan translationUz dan yoki tarjima qilish
                    if (bestMatchNextSentenceTranslationUz) {
                        aiResponseUz = AI_FALLBACK_MESSAGES.CLOSE_MATCH_HELP.uzbek + bestMatchNextSentenceTranslationUz;
                        console.log(`   ✅ Using translationUz from best match: "${bestMatchNextSentenceTranslationUz}"`);
                    } else {
                        // Material'da translationUz yo'q, tarjima qilish
                        try {
                            const translatedSentence = await this.translation.translateToUzbek(bestMatchNextSentence);
                            aiResponseUz = AI_FALLBACK_MESSAGES.CLOSE_MATCH_HELP.uzbek + translatedSentence;
                            console.log(`   ✅ Translated best match to Uzbek: "${translatedSentence}"`);
                        } catch (e) {
                            console.warn(`   ⚠️  Translation failed: ${e.message}`);
                            aiResponseUz = AI_FALLBACK_MESSAGES.CLOSE_MATCH_HELP.uzbek + bestMatchNextSentence;
                        }
                    }
                    gptUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
                } else {
                    // Yordamlash ham mantiqsiz - GPT ga so'rov
                    console.log(`⚠️  Yaqin match mantiqsiz, GPT ga so'rov`);
                    const gptStart = Date.now();
                    // Conversation topic'ni GPT'ga yanada aniq context sifatida yuborish
                    const enhancedPrompt = this.enhancePromptWithConversationContext(userText, conversationTopic);
                    // IMPORTANT: Faqat kelgan darsgacha bo'lgan context'ni yuborish
                    const filteredContext = this.filterContextByLessonOrder(input.context, lastWatchedLessonOrder);
                    const gptResult = await this.gpt.generateWithUsage({
                        prompt: enhancedPrompt,
                        context: filteredContext,
                        language: 'ar',
                        strict: false,
                        conversationHistory: input.conversationHistory || [],
                        conversationTopic: conversationTopic, // Conversation topic'ni GPT'ga yuborish
                    });
                    gptTime = Date.now() - gptStart;
                    aiResponse = gptResult.text;
                    gptUsage = gptResult.usage;

                    // GPT javobini o'zbek tiliga tarjima qilish
                    if (aiResponse && aiResponse.trim().length > 0) {
                        try {
                            aiResponseUz = await this.translation.translateToUzbek(aiResponse);
                            console.log(`   ✅ GPT response translated to Uzbek: "${aiResponseUz}"`);
                        } catch (e) {
                            console.warn(`   ⚠️  Translation failed: ${e.message}`);
                            aiResponseUz = ''; // Fallback: empty string
                        }
                    }
                }
            }
        }
        // 3.5) AGAR 30-50% YAQINLIK BO'LSA - yordamlash (pronunciation error bo'lsa)
        else if (bestMatchScore >= 0.3 && bestMatchScore < 0.5 && bestMatchSentence && bestMatchSentence.length > 1) {
            // User xato gapirgan bo'lsa (1-2 harf noto'g'ri), unga o'xshash gapni ko'rsatish
            console.log(`   💡 Moderate similarity found (${(bestMatchScore * 100).toFixed(0)}%) - user might have pronunciation error`);
            console.log(`   💡 Best match sentence: "${bestMatchSentence}"`);
            // Kelmagan darsda bo'lsa ham yordam beramiz (lekin e'tiborli)
            if (bestMatchLessonOrder !== null && bestMatchLessonOrder > lastWatchedLessonOrder) {
                console.log(`⚠️  Yaqin match topildi, lekin kelmagan darsda`);
                aiResponse = AI_FALLBACK_MESSAGES.FUTURE_LESSON_RESPONSE.arabic;
                aiResponseUz = AI_FALLBACK_MESSAGES.FUTURE_LESSON_RESPONSE.uzbek;
                gptUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
            } else {
                // Yordamlash - shunday demoqchimisiz? (o'xshash gapni ko'rsatish)
                const helpResponse = AI_FALLBACK_MESSAGES.CLOSE_MATCH_HELP.arabic + bestMatchSentence;
                aiResponse = helpResponse;
                // TranslationUz ni saqlangan translationUz dan yoki tarjima qilish
                if (bestMatchSentenceTranslationUz) {
                    aiResponseUz = AI_FALLBACK_MESSAGES.CLOSE_MATCH_HELP.uzbek + bestMatchSentenceTranslationUz;
                    console.log(`   ✅ Using translationUz from best match: "${bestMatchSentenceTranslationUz}"`);
                } else {
                    // Material'da translationUz yo'q, tarjima qilish
                    try {
                        const translatedSentence = await this.translation.translateToUzbek(bestMatchSentence);
                        aiResponseUz = AI_FALLBACK_MESSAGES.CLOSE_MATCH_HELP.uzbek + translatedSentence;
                        console.log(`   ✅ Translated best match to Uzbek: "${translatedSentence}"`);
                    } catch (e) {
                        console.warn(`   ⚠️  Translation failed: ${e.message}`);
                        aiResponseUz = AI_FALLBACK_MESSAGES.CLOSE_MATCH_HELP.uzbek + bestMatchSentence;
                    }
                }
                gptUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
                console.log(`   ✅ Using pronunciation help: "${helpResponse}"`);
            }
        }
        // 4) AGAR MATERIALDAN TOPILMADI - GPT ga so'rov
        else {
            const gptStart = Date.now();
            // IMPORTANT: Faqat kelgan darsgacha bo'lgan context'ni yuborish
            const filteredContext = this.filterContextByLessonOrder(input.context, lastWatchedLessonOrder);
            const gptResult = await this.gpt.generateWithUsage({
                prompt: userText,
                context: filteredContext,
                language: 'ar',
                strict: false,
                conversationHistory: input.conversationHistory || [],
                conversationTopic: conversationTopic, // Conversation topic'ni GPT'ga yuborish
            });
            gptTime = Date.now() - gptStart;
            aiResponse = gptResult.text;
            gptUsage = gptResult.usage;

            // GPT javobini o'zbek tiliga tarjima qilish
            if (aiResponse && aiResponse.trim().length > 0) {
                try {
                    aiResponseUz = await this.translation.translateToUzbek(aiResponse);
                    console.log(`   ✅ GPT response translated to Uzbek: "${aiResponseUz}"`);
                } catch (e) {
                    console.warn(`   ⚠️  Translation failed: ${e.message}`);
                    aiResponseUz = ''; // Fallback: empty string
                }
            }

            // GPT javobini tekshirish
            const unsure = (aiResponse || '').includes('لَسْتُ مُتَأَكِّدًا') ||
                (aiResponse || '').toLowerCase().includes('not sure') ||
                (aiResponse || '').toLowerCase().includes('لا أعرف');

            // Echo tekshiruvi - kuchaytirilgan (STRICT MODE)
            console.log(`\n🔍 Validating GPT response for echo...`);
            console.log(`   User: "${userText}"`);
            console.log(`   GPT:  "${aiResponse}"`);
            const responseIsEcho = this.detectEcho(aiResponse, userText, normalizedUser, userWords);
            if (responseIsEcho) {
                console.log(`   ❌ Echo detected! Using fallback message.`);
            } else {
                console.log(`   ✅ No echo detected.`);
            }

            // Mantiqiy validatsiya - javob user so'roviga mantiqan mos keladimi?
            const isLogicalResponse = this.validateLogicalResponse(aiResponse, userText, normalizedUser);
            if (!isLogicalResponse) {
                console.log(`   ⚠️  Response is not logical (basic validation).`);
            }

            // GPT javobida kelmagan materiallardan so'zlarni tekshirish
            const hasFutureLessonWords = this.checkFutureLessonWords(aiResponse, input.context, lastWatchedLessonOrder);
            if (hasFutureLessonWords) {
                console.log(`   ⚠️  Response contains future lesson words.`);
            }

            // IMPORTANT: Vocabulary-based validation (ASOSIY) - GPT gap tuzsa ham, vocabulary'dan foydalanganligini tekshirish
            // Bu material'dan tashqari gapirsa ham, AI mantiqiy javob berishga imkon beradi
            const filteredContextForVocabulary = this.filterContextByLessonOrder(input.context, lastWatchedLessonOrder);
            const materialVocabularySet = this.extractMaterialVocabulary(filteredContextForVocabulary, lastWatchedLessonOrder);
            const responseUsesValidVocabulary = this.checkResponseUsesValidVocabulary(aiResponse, materialVocabularySet);

            if (!responseUsesValidVocabulary) {
                console.log(`   ⚠️  Response does NOT use valid vocabulary (contains words not in materials).`);
            } else {
                console.log(`   ✅ Response uses valid vocabulary from materials.`);
            }

            // FALLBACK CHECK: Exact match validation (qo'shimcha tekshiruv sifatida)
            // Agar vocabulary validation o'tsa, exact match ham qilish mumkin (lekin majburiy emas)
            const responseExistsInMaterials = this.checkResponseExistsInMaterials(aiResponse, filteredContextForVocabulary);
            if (!responseExistsInMaterials) {
                console.log(`   ℹ️  Response does NOT exist as exact match in lesson materials (dialogue), but may be constructed from vocabulary.`);
            } else {
                console.log(`   ✅ Response exists in lesson materials (exact match).`);
            }

            // Conversation context bilan mos kelishini tekshirish
            const matchesConversationContext = this.validateResponseMatchesConversationContext(
                aiResponse,
                conversationTopic
            );
            if (!matchesConversationContext && conversationTopic.topic) {
                console.log(`   ⚠️  Response does NOT match conversation context (topic: ${conversationTopic.topic})`);
            }

            // AGAR TUSHUNMAGAN, ECHO YOKI MANTIQIY EMAS YOKI VOCABULARY'DAN FOYDALANMAGAN YOKI CONTEXT'GA MOS KELMASA
            // IMPORTANT: Vocabulary validation ASOSIY, exact match validation FALLBACK
            // GPT gap tuzsa ham, agar vocabulary'dan foydalansa → ACCEPT!
            if (!aiResponse || unsure || responseIsEcho || !isLogicalResponse || hasFutureLessonWords || !responseUsesValidVocabulary || !matchesConversationContext) {
                // Echo yoki mantiqsiz javob - tushunmadim
                if (responseIsEcho) {
                    console.log(`\n🚫 GPT echoed user text. Using NOT_UNDERSTOOD fallback.`);
                    aiResponse = AI_FALLBACK_MESSAGES.NOT_UNDERSTOOD.arabic;
                    aiResponseUz = AI_FALLBACK_MESSAGES.NOT_UNDERSTOOD.uzbek;
                }
                // Javob vocabulary'dan foydalanmagan - material'dan tashqari so'zlar ishlatilgan
                else if (!responseUsesValidVocabulary) {
                    console.log(`\n⚠️  GPT response does NOT use valid vocabulary (contains words not in materials). Using NO_MATERIAL_RESPONSE fallback.`);
                    // User gapini uzbek tilida qo'shib yuborish
                    try {
                        const userTextUz = await this.translation.translateToUzbek(userText);
                        aiResponse = AI_FALLBACK_MESSAGES.NO_MATERIAL_RESPONSE.arabic;
                        aiResponseUz = `${AI_FALLBACK_MESSAGES.NO_MATERIAL_RESPONSE.uzbek} (${userTextUz})`;
                    } catch (e) {
                        aiResponse = AI_FALLBACK_MESSAGES.NO_MATERIAL_RESPONSE.arabic;
                        aiResponseUz = AI_FALLBACK_MESSAGES.NO_MATERIAL_RESPONSE.uzbek;
                    }
                }
                // Tushunilmagan holat
                else if (unsure || !aiResponse || aiResponse.trim().length < 5) {
                    console.log(`\n⚠️  GPT response is unsure or too short. Using NOT_UNDERSTOOD fallback.`);
                    aiResponse = AI_FALLBACK_MESSAGES.NOT_UNDERSTOOD.arabic;
                    aiResponseUz = AI_FALLBACK_MESSAGES.NOT_UNDERSTOOD.uzbek;
                }
                // Kelmagan materiallardan foydalangan yoki boshqa muammo
                else {
                    console.log(`\n⚠️  GPT response has other issues. Using NO_MATERIAL_RESPONSE fallback.`);
                    // User gapini uzbek tilida qo'shib yuborish
                    try {
                        const userTextUz = await this.translation.translateToUzbek(userText);
                        aiResponse = AI_FALLBACK_MESSAGES.NO_MATERIAL_RESPONSE.arabic;
                        aiResponseUz = `${AI_FALLBACK_MESSAGES.NO_MATERIAL_RESPONSE.uzbek} (${userTextUz})`;
                    } catch (e) {
                        aiResponse = AI_FALLBACK_MESSAGES.NO_MATERIAL_RESPONSE.arabic;
                        aiResponseUz = AI_FALLBACK_MESSAGES.NO_MATERIAL_RESPONSE.uzbek;
                    }
                }
            }
        }

        // IMPORTANT: Agar aiResponseUz bo'sh bo'lsa, tarjima qilish (har doim textUz bo'lishi kerak)
        if (!aiResponseUz && aiResponse && aiResponse.trim().length > 0) {
            try {
                aiResponseUz = await this.translation.translateToUzbek(aiResponse);
                console.log(`   ✅ Final translation to Uzbek (fallback): "${aiResponseUz}"`);
            } catch (e) {
                console.warn(`   ⚠️  Final translation failed: ${e.message}`);
                aiResponseUz = ''; // Fallback: empty string (lekin bu kam uchraydi)
            }
        }

        const aiResponseLatin = ArabicTextUtils.transliterateArabic(aiResponse || "");
        console.log("\n🤖 AI:");
        console.log("   Arab: " + aiResponse);
        console.log("   Lotin: " + aiResponseLatin);
        if (aiResponseUz) {
            console.log("   Uzbek: " + aiResponseUz);
        } else {
            console.warn("   ⚠️  Uzbek translation is missing!");
        }
        console.log("   ⏱️  GPT vaqti: " + gptTime + "ms");

        // Usage ma'lumotlarini to'plash
        const usage = input.usage || {};
        if (gptUsage) {
            usage.gpt = {
                promptTokens: gptUsage.promptTokens || 0,
                completionTokens: gptUsage.completionTokens || 0,
                totalTokens: gptUsage.totalTokens || 0,
            };
        }

        return {
            ...input,
            aiResponse,
            aiResponseUz: aiResponseUz || '', // Uzbek matn
            usage,
        } as VoiceInput & { aiResponse: string; aiResponseUz: string };
    }

    /**
     * GPT javobida kelmagan darslardagi so'zlar borligini tekshirish
     */
    private checkFutureLessonWords(response: string, context: any[], lastWatchedOrder: number): boolean {
        if (!response || !Array.isArray(context)) return false;

        const normalize = (t: string) => ArabicTextUtils.normalizeArabic(t.replace(/[\u064B-\u065F\u0670]/g, ''));
        const normalizedResponse = normalize(response);
        const responseWords = new Set(normalizedResponse.split(/\s+/).filter(Boolean));

        // Har bir kelmagan darsdagi so'zlarni solishtirish
        for (const lesson of context) {
            const lessonOrder = lesson?.lessonOrder || 0;
            if (lessonOrder <= lastWatchedOrder) continue; // Kelgan darslar - skip

            const lessonText = (lesson?.text || lesson?.content || '') as string;
            if (!lessonText) continue;

            const normalizedLesson = normalize(lessonText);
            const lessonWords = new Set(normalizedLesson.split(/\s+/).filter(Boolean));

            // Umumiy so'zlar topilsa
            for (const word of responseWords) {
                if (word.length > 3 && lessonWords.has(word)) { // 3+ harfli so'zlar
                    return true; // Kelmagan darsdan so'z topildi
                }
            }
        }

        return false;
    }

    /**
     * GPT javobini materiallar bilan to'liq solishtirish
     * Agar javob materiallar (dialogue) ichida aniq topilmasa, false qaytaradi
     * Bu GPT'ning materiallarda yo'q javob yaratishini oldini oladi
     */
    private checkResponseExistsInMaterials(response: string, context: any[]): boolean {
        if (!response || !Array.isArray(context) || context.length === 0) {
            return false; // Materiallar yo'q bo'lsa, javob ham materialda yo'q
        }

        const stripDiacritics = (t: string) => t.replace(/[\u064B-\u065F\u0670\u0640]/g, '').replace(/[،,.]/g, '').trim();
        const normalize = (t: string) => ArabicTextUtils.normalizeArabic(stripDiacritics(t));
        const normalizedResponse = normalize(response);

        // Har bir material (dialogue turn) bilan solishtirish
        for (const lesson of context) {
            const lessonText = (lesson?.text || lesson?.content || '') as string;
            if (!lessonText) continue;

            const normalizedLesson = normalize(lessonText);

            // To'liq moslik (punctuation va diacritics'ni e'tiborsiz qoldirib)
            if (normalizedResponse === normalizedLesson) {
                return true; // Javob materiallarda topildi
            }

            // Yaqin moslik - response material text'ning qismi yoki aksincha
            // (faqat kichik farq bilan - punctuation/diacritics)
            if (normalizedResponse.length > 0 && normalizedLesson.length > 0) {
                const lengthDiff = Math.abs(normalizedResponse.length - normalizedLesson.length);
                const similarity = this.calculateSimilarity(normalizedResponse, normalizedLesson);

                // Agar 90%+ o'xshashlik va uzunlik farqi kichik bo'lsa
                if (similarity > 0.9 && lengthDiff < 5) {
                    return true; // De facto bir xil
                }
            }
        }

        return false; // Javob materiallarda topilmadi
    }

    /**
     * Ikki text o'rtasidagi o'xshashlikni hisoblash (Jaccard similarity)
     */
    private calculateSimilarity(text1: string, text2: string): number {
        const words1 = new Set(text1.split(/\s+/).filter(Boolean));
        const words2 = new Set(text2.split(/\s+/).filter(Boolean));

        if (words1.size === 0 || words2.size === 0) return 0;

        let intersection = 0;
        for (const word of words1) {
            if (words2.has(word)) intersection++;
        }

        const union = new Set([...words1, ...words2]).size;
        return intersection / union;
    }

    /**
     * Echo detection - user gapini takrorlash
     * Faqat xato gapirganda "shunday demoqchimisan" deb qaytarishi mumkin
     * STRICT MODE: Qattiq echo detection - faqat vergul yoki diacritics farqi bilan ham echo hisoblanadi
     */
    private detectEcho(response: string, originalUserText: string, normalizedUser: string, userWords: Set<string>): boolean {
        if (!response || !originalUserText) return false;

        const stripDiacritics = (t: string) => t.replace(/[\u064B-\u065F\u0670\u0640]/g, '').replace(/[،,]/g, '').trim();
        const normalize = (t: string) => ArabicTextUtils.normalizeArabic(stripDiacritics(t));
        const normalizedResponse = normalize(response);
        const normalizedUserCleaned = normalize(originalUserText);

        // 1. To'liq takrorlash (diacritics va punctuation'dan tashqari)
        if (normalizedResponse === normalizedUserCleaned) {
            console.log(`🚫 Echo detected: Exact match (ignoring diacritics/punctuation)`);
            return true;
        }

        // 2. User gapining katta qismini takrorlash (>70% o'xshashlik va response uzunligi user dan 1.5x katta emas)
        const responseWords = new Set(normalizedResponse.split(/\s+/).filter(Boolean));
        if (responseWords.size > 0 && userWords.size > 0) {
            let commonWords = 0;
            for (const word of userWords) {
                if (responseWords.has(word)) commonWords++;
            }
            const similarity = commonWords / userWords.size;
            // 70% dan yuqori o'xshashlik va response user gapidan ko'p farq qilmasa
            if (similarity > 0.7 && responseWords.size <= userWords.size * 1.5) {
                // Agar "shunday demoqchimisan" yoki "هل تقصد" pattern bo'lsa, echo emas
                const helpPattern = normalize(AI_FALLBACK_MESSAGES.CLOSE_MATCH_HELP?.arabic || '');
                const helpPatterns = [
                    normalize('هل تقصد'),
                    normalize('هَلْ تَقْصِدُ'),
                    normalize('أتقصد'),
                    normalize('shunday'),
                ];
                const hasHelpPattern = helpPatterns.some(pattern =>
                    normalizedResponse.includes(pattern) && pattern.length > 0
                );
                if (!hasHelpPattern && helpPattern.length === 0) {
                    console.log(`🚫 Echo detected: High similarity (${(similarity * 100).toFixed(0)}%), common words: ${commonWords}/${userWords.size}`);
                    return true;
                }
            }
        }

        // 3. User gapini to'g'ridan-to'g'ri takrorlash (faqat punctuation/diacritics farqi bilan)
        const userTextLower = normalizedUserCleaned.toLowerCase();
        const responseLower = normalizedResponse.toLowerCase();

        // Agar user gapining uzunligi 5+ bo'lsa va javob uni to'liq o'z ichiga olsa
        if (userTextLower.length > 5 && responseLower.includes(userTextLower)) {
            // Lekin "shunday demoqchimisan" deb qo'shgan bo'lsa, bu echo emas
            const helpPatterns = [
                normalize('هل تقصد'),
                normalize('هَلْ تَقْصِدُ'),
                normalize('أتقصد'),
                normalize('shunday'),
            ];
            const hasHelpPattern = helpPatterns.some(pattern =>
                normalizedResponse.includes(pattern) && pattern.length > 0
            );
            // Response uzunligi user gapidan ko'p farq qilmasa (faqat punctuation/diacritics farqi)
            const lengthRatio = responseLower.length / userTextLower.length;
            if (!hasHelpPattern && lengthRatio <= 1.3) {
                console.log(`🚫 Echo detected: User text fully contained in response (length ratio: ${lengthRatio.toFixed(2)})`);
                return true; // Echo
            }
        }

        // 4. STRICT CHECK: Agar response faqat user gapidagi so'zlarni qayta tartib bilan qo'ygan bo'lsa
        // (masalan: "مَا هَذَا يَا فَرِيد؟" -> "مَا هَذَا، يَا فَرِيدُ؟")
        const responseWordArray = Array.from(responseWords);
        const userWordArray = Array.from(userWords);

        // Agar response'dagi barcha so'zlar user gapida bo'lsa va yangi so'z qo'shilmagan bo'lsa
        if (userWordArray.length > 0 && responseWordArray.length > 0) {
            const allResponseWordsInUser = responseWordArray.every(word => userWords.has(word));
            const allUserWordsInResponse = userWordArray.every(word => responseWords.has(word));

            // Agar response faqat user so'zlarini qayta tartib bilan ishlatgan bo'lsa
            if (allResponseWordsInUser && allUserWordsInResponse && responseWords.size === userWords.size) {
                // Faqat vergul yoki diacritics qo'shgan bo'lsa, bu echo
                const lengthDiff = Math.abs(normalizedResponse.length - normalizedUserCleaned.length);
                if (lengthDiff < 10) { // Faqat kichik farq (punctuation/diacritics)
                    console.log(`🚫 Echo detected: Response only reorders user words (same word set, length diff: ${lengthDiff})`);
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Mantiqiy javob validatsiyasi
     * AI javobi user so'roviga mantiqan mos keladimi?
     * BU METOD BACKWARD COMPATIBILITY UCHUN SAQLANADI
     */
    private validateLogicalResponse(response: string, userText: string, normalizedUser: string): boolean {
        if (!response || response.trim().length < 3) return false;

        const stripDiacritics = (t: string) => t.replace(/[\u064B-\u065F\u0670]/g, '');
        const normalize = (t: string) => ArabicTextUtils.normalizeArabic(stripDiacritics(t));
        const normalizedResponse = normalize(response);

        // 1. Javob bo'sh yoki juda qisqa bo'lmasligi kerak (3+ belgi yetarli)
        if (normalizedResponse.length < 3) return false;

        // 2. User gapidan farq qilishi kerak (echo bo'lmasligi kerak)
        if (normalizedResponse === normalizedUser) return false;

        // 3. Arab harflari borligini tekshirish
        const hasArabicChars = /[\u0600-\u06FF]/.test(normalizedResponse);
        if (!hasArabicChars) return false;

        // 4. BASIC SUBJECT MATCHING (eng muhim!)
        // Agar user OBJECT haqida so'rasa (دفتر, كتاب, قلم), javobda HAM shu object bo'lishi kerak
        // Agar user PERSON haqida so'rasa (أنت, أنا), javobda HAM person bo'lishi kerak

        // Object pattern: "أين الدفتر" yoki "أين ال..." (article bilan)
        const userAsksAboutObject = normalizedUser.match(/اين\s+(ال\w+|الدفتر|الكتاب|القلم|البيت)/);
        if (userAsksAboutObject) {
            const objectWord = userAsksAboutObject[1]; // masalan: "الدفتر"
            // Javobda HAM shu object bo'lishi kerak
            const responseHasObject = normalizedResponse.includes(objectWord);
            const responseHasPerson = normalizedResponse.match(/انا\s+(في|من)|أنا\s+(في|من)/);

            // Agar javobda object yo'q, lekin "men ..." deb aytilgan bo'lsa → mantiqsiz!
            if (!responseHasObject && responseHasPerson) {
                console.log(`   ⚠️ Logical mismatch: User asks about OBJECT, but AI answers about PERSON`);
                return false;
            }
        }

        // Person pattern: "أين أنت" yoki "من أنت"
        const userAsksAboutPerson = normalizedUser.match(/(اين|من|ما اسم)\s+(انت|انا|هو|هي)/);
        if (userAsksAboutPerson) {
            // Javobda person pronoun bo'lishi kerak (أنا, أنت, etc)
            const responseHasPerson = normalizedResponse.match(/انا|انت|هو|هي|اسمي/);
            const responseHasObjectOnly = normalizedResponse.match(/^(ال\w+)\s+(في|على|تحت)/) && !responseHasPerson;

            // Agar javobda faqat object bor, person yo'q bo'lsa → mantiqsiz!
            if (responseHasObjectOnly) {
                console.log(`   ⚠️ Logical mismatch: User asks about PERSON, but AI answers about OBJECT only`);
                return false;
            }
        }

        // 5. Qolgan holatlar - PASS
        return true;
    }

    /**
     * Semantik kontekst validatsiyasi
     * User so'rovi va javob bir xil semantik kontekstga ega bo'lishi kerak
     * Masalan: agar user "من مصر" (origin) deb so'rasa, javob ham origin haqida bo'lishi kerak, location emas
     */
    private validateSemanticContext(userText: string, matchedSentence: string, response: string): boolean {
        if (!userText || !response) return true; // Agar ma'lumot yetarli bo'lmasa, true qaytarish (pass)

        const stripDiacritics = (t: string) => t.replace(/[\u064B-\u065F\u0670]/g, '');
        const normalize = (t: string) => ArabicTextUtils.normalizeArabic(stripDiacritics(t));
        const normalizedUser = normalize(userText);
        const normalizedResponse = normalize(response);

        // 1. Origin (من) vs Location (في) kontekstini tekshirish
        // User "من" (from/origin) deb so'rasa, javob ham "من" bilan bo'lishi kerak
        // User "في" (in/location) deb so'rasa, javob ham "في" bilan bo'lishi kerak

        // Origin pattern: "من مصر", "من أين", "من ... ومن أين"
        const userHasOrigin = normalizedUser.match(/من\s+(مصر|أين|اين|بلاد|دولة|\w+)/) !== null;
        const responseHasOrigin = normalizedResponse.match(/من\s+(مصر|أين|اين|بلاد|دولة|\w+)/) !== null;

        // Location pattern: "في المسجد", "في المدرسة", "في ..."
        const userHasLocation = normalizedUser.match(/في\s+(المسجد|المدرسة|البيت|السوق|ال\w+)/) !== null;
        const responseHasLocation = normalizedResponse.match(/في\s+(المسجد|المدرسة|البيت|السوق|ال\w+)/) !== null;

        // Agar user origin haqida so'rasa, lekin javob location haqida bo'lsa - mantiqsiz
        if (userHasOrigin && !responseHasOrigin && responseHasLocation) {
            console.log(`      🚫 Semantic mismatch: User asks about ORIGIN (من), but response is about LOCATION (في)`);
            return false;
        }

        // Agar user location haqida so'rasa, lekin javob origin haqida bo'lsa - mantiqsiz
        if (userHasLocation && !responseHasLocation && responseHasOrigin) {
            console.log(`      🚫 Semantic mismatch: User asks about LOCATION (في), but response is about ORIGIN (من)`);
            return false;
        }

        // 2. Ism kontekstini tekshirish - agar user biron ismni aytgan bo'lsa (masalan "فريد"), 
        // javobda ham shu ism yoki mantiqiy boshqa ism bo'lishi kerak
        // Lekin bu juda qattiq emas, chunki dialogueda turli ismlar bo'lishi mumkin
        const userHasName = normalizedUser.match(/يا\s+\w+/);
        const responseHasName = normalizedResponse.match(/يا\s+\w+/);

        // Agar user "يا فريد" deb so'rasa va javob "يا كريم" deb bo'lsa, bu mantiqiy
        // Lekin agar user "من أين أنت يا فريد؟" deb so'rasa va javob "أنا في المسجد" deb bo'lsa (ism yo'q),
        // bu ham mantiqiy, chunki javob gapida ism bo'lishi shart emas
        // Shuning uchun ism validatsiyasini o'chirib tashlaymiz yoki yengil qilamiz

        // 3. Umumiy mantiqiy kontekst - agar user va javob bir xil mavzuda bo'lsa (masalan ikkalasi ham "من" yoki ikkalasi ham "في")
        // yoki ikkalasi ham boshqa mavzuda bo'lsa, bu yaxshi

        return true; // Boshqa holatlarda true qaytarish (pass)
    }

    /**
     * Ism mosligini tekshirish
     * Agar user so'rovida ism bor va javobda ham ism bor bo'lsa, ular mos kelishi kerak
     * Masalan: user "مَا هَذَا يَا مُحَمَّد؟" deb so'rasa, javob ham Muhammad ga tegishli bo'lishi kerak
     * Agar user Ahmad deb so'rasa, lekin javob Muhammad ga tegishli bo'lsa, bu mantiqsiz
     */
    private validateNameConsistency(userText: string, response: string): boolean {
        if (!userText || !response) return true; // Agar ma'lumot yetarli bo'lmasa, true qaytarish (pass)

        const stripDiacritics = (t: string) => t.replace(/[\u064B-\u065F\u0670]/g, '');
        const normalize = (t: string) => ArabicTextUtils.normalizeArabic(stripDiacritics(t));
        const normalizedUser = normalize(userText);
        const normalizedResponse = normalize(response);

        // User so'rovidagi ismni topish (يا ... pattern)
        const userNameMatch = normalizedUser.match(/يا\s+(\w+)/);
        if (!userNameMatch) return true; // User so'rovida ism yo'q - validatsiya o'tkazish

        const userNameInQuery = userNameMatch[1];

        // Javobdagi ismlarni topish (يا ... pattern)
        const responseNameMatches = normalizedResponse.match(/يا\s+(\w+)/g);
        if (!responseNameMatches || responseNameMatches.length === 0) {
            // Javobda ism yo'q - bu mantiqiy bo'lishi mumkin (masalan: "هذا بيت")
            return true;
        }

        // Javobdagi har bir ismni tekshirish
        for (const nameMatch of responseNameMatches) {
            const responseNameMatch = nameMatch.match(/يا\s+(\w+)/);
            if (!responseNameMatch) continue;

            const responseName = responseNameMatch[1];

            // Agar javobdagi ism user so'rovidagi ism bilan mos kelmasa
            if (responseName !== userNameInQuery) {
                // Lekin ba'zi umumiy ismlar mantiqiy bo'lishi mumkin (masalan: farid, ahmad, muhammad - hamma bir xil dialogue'da)
                // Shuning uchun faqat aniq mos kelmasa, rad qilamiz
                console.log(`      🚫 Name mismatch: User asked about "${userNameInQuery}", but response mentions "${responseName}"`);
                return false;
            }
        }

        return true; // Ismlar mos keladi yoki javobda ism yo'q
    }

    /**
     * Conversation history'dan topic/mavzuni aniqlash
     * Masalan: kasb haqida, narsa haqida, joy haqida va h.k.
     */
    private extractConversationTopic(
        conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
        context: any[]
    ): { topic: string | null; keywords: string[] } {
        if (conversationHistory.length === 0) {
            return { topic: null, keywords: [] };
        }

        // Materiallardan asosiy so'zlar ro'yxatini yig'ish
        const materialWords = new Set<string>();
        const professionWords = new Set<string>(); // Kasb so'zlari
        const objectWords = new Set<string>(); // Narsa so'zlari
        const placeWords = new Set<string>(); // Joy so'zlari

        // Ma'lum so'z kategoriyalari
        const professionKeywords = ['مُهَنْدِس', 'تَاجِر', 'طَبِيب', 'طَالِب', 'مُعَلِّم', 'مُحَمَّد', 'أَحْمَد'];
        const objectKeywords = ['بُرْتُقَال', 'بَيْت', 'مَوْز', 'كِتَاب', 'مَسْجِد'];
        const placeKeywords = ['قَرِيب', 'بَعِيد', 'هنا', 'هناك'];

        if (Array.isArray(context)) {
            for (const lesson of context) {
                const text = (lesson?.text || lesson?.content || '') as string;
                if (!text) continue;

                const normalizedText = ArabicTextUtils.normalizeArabic(text.replace(/[\u064B-\u065F\u0670]/g, ''));
                const words = normalizedText.split(/\s+/).filter(Boolean);
                words.forEach(w => materialWords.add(w));

                // Kategoriyalarga ajratish
                professionKeywords.forEach(kw => {
                    if (normalizedText.includes(kw)) professionWords.add(kw);
                });
                objectKeywords.forEach(kw => {
                    if (normalizedText.includes(kw)) objectWords.add(kw);
                });
                placeKeywords.forEach(kw => {
                    if (normalizedText.includes(kw)) placeWords.add(kw);
                });
            }
        }

        // Conversation history'dan so'zlarni yig'ish
        const historyWords = new Set<string>();
        for (const msg of conversationHistory.slice(-4)) { // Oxirgi 4 ta gap
            const text = msg.content || '';
            const normalized = ArabicTextUtils.normalizeArabic(text.replace(/[\u064B-\u065F\u0670]/g, ''));
            normalized.split(/\s+/).filter(Boolean).forEach(w => historyWords.add(w));
        }

        // Conversation'da qaysi kategoriya so'zlari ko'p uchrayotganini aniqlash
        let professionCount = 0;
        let objectCount = 0;
        let placeCount = 0;

        for (const word of historyWords) {
            if (professionWords.has(word) || professionKeywords.some(kw => word.includes(kw))) professionCount++;
            if (objectWords.has(word) || objectKeywords.some(kw => word.includes(kw))) objectCount++;
            if (placeWords.has(word) || placeKeywords.some(kw => word.includes(kw))) placeCount++;
        }

        // Topic aniqlash
        let topic: string | null = null;
        const keywords: string[] = [];

        if (professionCount > 0 && professionCount >= objectCount && professionCount >= placeCount) {
            topic = 'profession'; // Kasb
            for (const word of historyWords) {
                if (professionWords.has(word) || professionKeywords.some(kw => word.includes(kw))) {
                    keywords.push(word);
                }
            }
        } else if (objectCount > 0 && objectCount >= placeCount) {
            topic = 'object'; // Narsa
            for (const word of historyWords) {
                if (objectWords.has(word) || objectKeywords.some(kw => word.includes(kw))) {
                    keywords.push(word);
                }
            }
        } else if (placeCount > 0) {
            topic = 'place'; // Joy
            for (const word of historyWords) {
                if (placeWords.has(word) || placeKeywords.some(kw => word.includes(kw))) {
                    keywords.push(word);
                }
            }
        }

        return { topic, keywords: [...new Set(keywords)].slice(0, 5) };
    }

    /**
     * Conversation history'dan context olib, STT xatolarini tuzatish
     * Masalan: "مُحَمِّسٌ" → "مُهَنْدِسٌ" (agar conversation kasb haqida bo'lsa)
     */
    private applyConversationAwareCorrection(
        userText: string,
        context: any[],
        conversationTopic: { topic: string | null; keywords: string[] }
    ): string {
        if (!userText || !conversationTopic.topic) {
            // Topic yo'q bo'lsa, oddiy correction ishlatamiz
            return this.applyContextAwareCorrection(userText, context);
        }

        // Materiallardan topic'ga mos so'zlarni yig'ish
        const topicWords = new Set<string>();
        const normalizeWord = (w: string) => ArabicTextUtils.normalizeArabic(w.replace(/[\u064B-\u065F\u0670]/g, ''));

        if (Array.isArray(context)) {
            for (const lesson of context) {
                const text = (lesson?.text || lesson?.content || '') as string;
                if (!text) continue;

                const normalized = normalizeWord(text);
                const words = normalized.split(/\s+/).filter(Boolean);

                // Topic'ga mos so'zlarni qo'shish
                if (conversationTopic.topic === 'profession') {
                    const professionKeywords = ['مُهَنْدِس', 'تَاجِر', 'طَبِيب', 'طَالِب', 'مُعَلِّم'];
                    words.forEach(w => {
                        if (professionKeywords.some(kw => w.includes(kw))) {
                            topicWords.add(w);
                        }
                    });
                } else if (conversationTopic.topic === 'object') {
                    const objectKeywords = ['بُرْتُقَال', 'بَيْت', 'مَوْز', 'كِتَاب'];
                    words.forEach(w => {
                        if (objectKeywords.some(kw => w.includes(kw))) {
                            topicWords.add(w);
                        }
                    });
                }
            }
        }

        // User text'dagi so'zlarni tekshirish va tuzatish
        const userWords = userText.split(/\s+/);
        let corrected = false;

        for (let i = 0; i < userWords.length; i++) {
            const word = userWords[i];
            const normalizedWord = normalizeWord(word);

            // Agar so'z materialda yo'q bo'lsa, lekin topic'da bor so'zlarga o'xshash bo'lsa
            if (topicWords.size > 0) {
                for (const topicWord of topicWords) {
                    const similarity = this.calculateWordSimilarity(normalizedWord, topicWord);
                    // 70%+ o'xshashlik bo'lsa va materialda yo'q so'z bo'lsa, tuzatish
                    if (similarity > 0.7) {
                        userWords[i] = topicWord; // To'g'ri so'z bilan almashtirish
                        corrected = true;
                        console.log(`   ✏️  Corrected "${word}" → "${topicWord}" (topic: ${conversationTopic.topic}, similarity: ${(similarity * 100).toFixed(0)}%)`);
                        break;
                    }
                }
            }
        }

        return corrected ? userWords.join(' ') : this.applyContextAwareCorrection(userText, context);
    }

    /**
     * Ikki so'z o'rtasidagi o'xshashlikni hisoblash (Levenshtein distance asosida)
     * STT xatolarini aniqlash uchun character-level similarity
     */
    private calculateWordSimilarity(word1: string, word2: string): number {
        if (!word1 || !word2) return 0;
        if (word1 === word2) return 1;

        // Levenshtein distance asosida similarity hisoblash
        const maxLen = Math.max(word1.length, word2.length);
        if (maxLen === 0) return 1;

        // Qisqa so'zlar uchun Levenshtein distance
        const distance = this.levenshteinDistance(word1, word2);
        const similarity = 1 - (distance / maxLen);

        return Math.max(0, similarity);
    }

    /**
     * Levenshtein distance - ikki string o'rtasidagi minimum edit distance
     * STT xatolarini aniqlash uchun
     */
    private levenshteinDistance(str1: string, str2: string): number {
        const m = str1.length;
        const n = str2.length;

        // Edge cases
        if (m === 0) return n;
        if (n === 0) return m;

        // Dynamic programming matrix
        const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

        // Initialize first row and column
        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;

        // Fill the matrix
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                dp[i][j] = Math.min(
                    dp[i - 1][j] + 1,     // deletion
                    dp[i][j - 1] + 1,     // insertion
                    dp[i - 1][j - 1] + cost // substitution
                );
            }
        }

        return dp[m][n];
    }

    /**
     * GPT prompt'ni conversation context bilan yaxshilash
     */
    private enhancePromptWithConversationContext(
        userText: string,
        conversationTopic: { topic: string | null; keywords: string[] }
    ): string {
        if (!conversationTopic.topic) {
            return userText;
        }

        // Topic'ga mos context qo'shish
        const topicContexts: { [key: string]: string } = {
            'profession': ' [CONTEXT: User is asking about professions/kasb, not objects/things]',
            'object': ' [CONTEXT: User is asking about objects/things/narsa, not professions]',
            'place': ' [CONTEXT: User is asking about location/place/joy]'
        };

        const contextHint = topicContexts[conversationTopic.topic] || '';
        if (conversationTopic.keywords.length > 0) {
            return `${userText}${contextHint} [Keywords from conversation: ${conversationTopic.keywords.slice(0, 3).join(', ')}]`;
        }

        return userText + contextHint;
    }

    /**
     * Javob conversation context'ga mos keladimi tekshirish
     */
    private validateResponseMatchesConversationContext(
        response: string,
        conversationTopic: { topic: string | null; keywords: string[] }
    ): boolean {
        if (!conversationTopic.topic || conversationTopic.keywords.length === 0) {
            return true; // Topic yo'q bo'lsa, valid deb hisoblaymiz
        }

        const normalizeWord = (w: string) => ArabicTextUtils.normalizeArabic(w.replace(/[\u064B-\u065F\u0670]/g, ''));
        const responseNormalized = normalizeWord(response);
        const responseWords = responseNormalized.split(/\s+/).filter(Boolean);

        // Response'da topic keywords'lardan kamida bitta bo'lishi kerak
        for (const keyword of conversationTopic.keywords) {
            const keywordNormalized = normalizeWord(keyword);
            if (responseWords.some(w => w.includes(keywordNormalized) || keywordNormalized.includes(w))) {
                return true; // Topic'ga mos javob
            }
        }

        // Agar response topic'ga mos bo'lmasa, lekin mantiqiy bo'lsa, valid deb hisoblaymiz
        // (chunki ba'zida topic o'zgarishi mumkin)
        return false; // Topic'ga mos kelmaydi
    }

    private buildNormalizedWordSet(context: any[]): Set<string> {
        const stripDiacritics = (t: string) => t.replace(/[\u064B-\u065F\u0670]/g, '');
        const normalize = (t: string) => ArabicTextUtils.normalizeArabic(stripDiacritics(t));
        const words = new Set<string>();
        if (!Array.isArray(context)) return words;
        for (const lesson of context) {
            const txt: string = (lesson && (lesson.text || lesson.content || '')) as string;
            if (!txt) continue;
            const normalized = normalize(txt);
            for (const w of normalized.split(/\s+/)) {
                if (w) words.add(w);
            }
        }
        return words;
    }

    private applyContextAwareCorrection(text: string, context: any): string {
        const stripDiacritics = (t: string) => t.replace(/[\u064B-\u065F\u0670]/g, '');
        const normalize = (t: string) => ArabicTextUtils.normalizeArabic(stripDiacritics(t));
        const normalizedWords = this.buildNormalizedWordSet(Array.isArray(context) ? context : []);
        const confusionPairs: Array<[string, string]> = [
            ['غ', 'و'],
            ['ض', 'د'],
        ];

        const original = text || '';
        const normalized = normalize(original);
        const tokens = normalized.split(/\s+/);
        const originalTokens = original.split(/\s+/);

        let changed = false;
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            if (!token || normalizedWords.has(token)) continue;

            // generate candidates by swapping confusion pairs
            const candidates = new Set<string>();
            candidates.add(token);
            for (const [a, b] of confusionPairs) {
                candidates.add(token.replace(new RegExp(a, 'g'), b));
                candidates.add(token.replace(new RegExp(b, 'g'), a));
            }
            // check candidates in vocabulary
            let replacement: string | null = null;
            for (const cand of candidates) {
                if (normalizedWords.has(cand)) { replacement = cand; break; }
            }
            if (replacement) {
                // Replace in original token roughly (keep original spacing/punct)
                originalTokens[i] = originalTokens[i]
                    .replace(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+/g, replacement);
                changed = true;
            }
        }

        return changed ? originalTokens.join(' ') : original;
    }

    /**
     * Dialogue gap'larini to'liq qidirish va STT xatolarini tuzatish
     * Masalan: "لَا حَاسَبَيْتٌ" → "لَا، هَذَا بَيْتٌ"
     * Bu method dialogue'dagi barcha gap'lar bilan character-level similarity qiladi
     */
    private applyDialogueSentenceCorrection(userText: string, context: any[]): string {
        if (!userText || !Array.isArray(context) || context.length === 0) {
            return userText;
        }

        const stripDiacritics = (t: string) => t.replace(/[\u064B-\u065F\u0670\u0640]/g, '');
        const stripPunctuation = (t: string) => t.replace(/[،,\.\?؟!;؛]/g, '').trim();
        const normalize = (t: string) => {
            const cleaned = stripPunctuation(stripDiacritics(t));
            return ArabicTextUtils.normalizeArabic(cleaned);
        };

        const splitSentences = (t: string): string[] => {
            const cleaned = (t || '').trim();
            if (!cleaned) return [];
            return cleaned
                .split(/(?<=[\.\!؟])\s+/)
                .map(s => s.trim())
                .filter(s => s.length > 0);
        };

        const normalizedUser = normalize(userText);
        let bestMatch = null;
        let bestSimilarity = 0;
        const MIN_SIMILARITY_THRESHOLD = 0.65; // 65%+ similarity bo'lsa, tuzatish

        // Barcha context'dagi dialogue gap'larini qidirish
        for (const lesson of context) {
            const lessonText: string = (lesson && (lesson.text || lesson.content || '')) as string;
            if (!lessonText) continue;

            const sentences = splitSentences(lessonText);
            for (const sentence of sentences) {
                const normalizedSentence = normalize(sentence);

                // Character-level similarity hisoblash (to'liq gap uchun)
                const similarity = this.calculateSentenceSimilarity(normalizedUser, normalizedSentence);

                if (similarity > bestSimilarity) {
                    bestSimilarity = similarity;
                    bestMatch = sentence; // Original sentence (diacritics bilan)
                }
            }
        }

        // Agar similarity threshold'dan yuqori bo'lsa, tuzatish
        if (bestMatch && bestSimilarity >= MIN_SIMILARITY_THRESHOLD) {
            // MUHIM: Ismlarni tekshirish - agar user va material'da ism bor va ular FARQ qilsa, TUZATMASLIK!
            // Masalan: User "يا محمد" dedi, material "يا أحمد" → TUZATMASLIK kerak!
            const userHasName = userText.match(/يا\s+(\w+)/);
            const materialHasName = bestMatch.match(/يا\s+(\w+)/);

            if (userHasName && materialHasName) {
                const userName = normalize(userHasName[1]);
                const materialName = normalize(materialHasName[1]);

                // Agar ismlar FARQ qilsa, tuzatmaslik
                if (userName !== materialName) {
                    console.log(`   ⚠️  Name mismatch detected: user="${userName}" vs material="${materialName}" - NOT correcting!`);
                    return userText; // User gapini o'zgartirmasdan qaytarish
                }
            }

            console.log(`   ✏️  Dialogue sentence correction: "${userText}" → "${bestMatch}" (similarity: ${(bestSimilarity * 100).toFixed(0)}%)`);
            return bestMatch;
        }

        // FALLBACK: Agar similarity 50-65% orasida bo'lsa va bestMatch topilgan bo'lsa,
        // phonetic STT correction qo'llash (faqat kam holatlar uchun)
        // Bu hozirgi logikani buzmaydi, chunki faqat past similarity holatida ishlaydi
        const PHONETIC_FALLBACK_THRESHOLD_MIN = 0.50;
        const PHONETIC_FALLBACK_THRESHOLD_MAX = 0.65;
        if (
            bestMatch &&
            bestSimilarity >= PHONETIC_FALLBACK_THRESHOLD_MIN &&
            bestSimilarity < PHONETIC_FALLBACK_THRESHOLD_MAX
        ) {
            const phoneticCorrected = this.applyPhoneticSTTCorrection(userText, bestMatch);
            if (phoneticCorrected && phoneticCorrected !== userText) {
                console.log(`   🔤 Phonetic STT correction (fallback): "${userText}" → "${phoneticCorrected}" (original similarity: ${(bestSimilarity * 100).toFixed(0)}%)`);
                return phoneticCorrected;
            }
        }

        return userText;
    }

    /**
     * Ikki gap o'rtasidagi o'xshashlikni hisoblash (to'liq gap uchun)
     * Character-level similarity + word overlap kombinatsiyasi
     */
    private calculateSentenceSimilarity(sentence1: string, sentence2: string): number {
        if (!sentence1 || !sentence2) return 0;
        if (sentence1 === sentence2) return 1;

        // 1) Character-level similarity (Levenshtein)
        const maxLen = Math.max(sentence1.length, sentence2.length);
        const charSimilarity = maxLen > 0
            ? 1 - (this.levenshteinDistance(sentence1, sentence2) / maxLen)
            : 0;

        // 2) Word overlap (Jaccard)
        const words1 = new Set(sentence1.split(/\s+/).filter(Boolean));
        const words2 = new Set(sentence2.split(/\s+/).filter(Boolean));
        let wordIntersection = 0;
        for (const w of words1) if (words2.has(w)) wordIntersection++;
        const wordUnion = new Set([...words1, ...words2]).size;
        const wordSimilarity = wordUnion > 0 ? wordIntersection / wordUnion : 0;

        // 3) Qisqa gap'lar uchun character-level muhimroq
        // Uzoq gap'lar uchun word overlap muhimroq
        const isShort = sentence1.length < 20 || sentence2.length < 20;
        const combinedSimilarity = isShort
            ? charSimilarity * 0.7 + wordSimilarity * 0.3
            : charSimilarity * 0.4 + wordSimilarity * 0.6;

        return Math.max(0, combinedSimilarity);
    }

    /**
     * Phonetic STT error correction - keng tarqalgan Arabic STT xatolarini tuzatish
     * Faqat bestMatch materialdan topilgan bo'lsa ishlatiladi (xavfsizlik uchun)
     * 
     * @param userText - User gapirgan text (STT xatolar bilan)
     * @param bestMatch - Materialdan topilgan eng yaqin sentence
     * @returns Tuzatilgan text yoki null agar tuzatish mumkin bo'lmasa
     */
    private applyPhoneticSTTCorrection(userText: string, bestMatch: string): string | null {
        if (!userText || !bestMatch) {
            return null;
        }

        // Keng tarqalgan Arabic STT xatolari - phonetic o'xshashliklar
        // Constant time lookup uchun Map ishlatamiz
        const STT_PHONETIC_ERRORS: ReadonlyMap<string, readonly string[]> = new Map([
            ['ح', ['ه']],      // ح → ه (حذاء → هواء)
            ['ه', ['ح']],      // ه → ح (reverse)
            ['ذ', ['ظ', 'ز']], // ذ → ظ, ز (ناذف → نظيف)
            ['ظ', ['ذ', 'ز']], // ظ → ذ, ز (reverse)
            ['ز', ['ذ', 'ظ']], // ز → ذ, ظ (reverse)
            ['ق', ['ك']],      // ق → ك (qaf → kaf)
            ['ك', ['ق']],      // ك → ق (reverse)
            ['ص', ['س']],      // ص → س (sad → sin)
            ['س', ['ص']],      // س → ص (reverse)
            ['ض', ['د']],      // ض → د (dad → dal)
            ['د', ['ض']],      // د → ض (reverse)
            ['ط', ['ت']],      // ط → ت (ta → ta)
            ['ت', ['ط']],      // ت → ط (reverse)
        ]);

        // Normalization funksiyalari (hozirgi metod bilan bir xil)
        const stripDiacritics = (t: string) => t.replace(/[\u064B-\u065F\u0670\u0640]/g, '');
        const stripPunctuation = (t: string) => t.replace(/[،,\.\?؟!;؛]/g, '').trim();
        const normalize = (t: string) => {
            const cleaned = stripPunctuation(stripDiacritics(t));
            return ArabicTextUtils.normalizeArabic(cleaned);
        };

        const normalizedUser = normalize(userText);
        const normalizedMatch = normalize(bestMatch);

        // Agar to'liq mos kelmasa, word-by-word correction qilamiz
        if (normalizedUser === normalizedMatch) {
            return bestMatch; // Allaqachon mos
        }

        const userWords = normalizedUser.split(/\s+/).filter(Boolean);
        const matchWords = normalizedMatch.split(/\s+/).filter(Boolean);

        if (userWords.length !== matchWords.length) {
            // So'zlar soni farq qilsa, phonetic correction qilmaymiz (xavfsizlik)
            return null;
        }

        // Har bir so'zni phonetic correction bilan solishtirish
        let phoneticErrorsFound = 0;
        let totalWordDifferences = 0;

        for (let i = 0; i < userWords.length; i++) {
            const userWord = userWords[i];
            const matchWord = matchWords[i];

            if (!userWord || !matchWord) {
                continue;
            }

            // Exact match
            if (userWord === matchWord) {
                continue;
            }

            totalWordDifferences++;

            // Phonetic correction tekshiruvi - faqat bitta harf farqi bo'lsa
            const isPhoneticError = this.isPhoneticSTTError(userWord, matchWord, STT_PHONETIC_ERRORS);
            if (isPhoneticError) {
                phoneticErrorsFound++;
            }
        }

        // Agar barcha so'z farqlari phonetic error bo'lsa va kamida 1 ta phonetic error topilgan bo'lsa,
        // bestMatch qaytaramiz (Bu shuni ko'rsatadiki, user text phonetic xatolar bilan material sentence'ga mos keladi)
        // Qo'shimcha: Agar kamida 2 ta so'z farq qilsa va ularning ikkalasi ham phonetic error bo'lsa,
        // bu kuchli ko'rsatkich (faqat bitta so'z uchun xavf yuqori bo'lishi mumkin)
        if (
            totalWordDifferences > 0 &&
            phoneticErrorsFound === totalWordDifferences &&
            (phoneticErrorsFound >= 2 || (phoneticErrorsFound === 1 && userWords.length <= 3)) // Kamida 2 ta yoki qisqa gap'da 1 ta
        ) {
            // BestMatch ni qaytaramiz (to'g'ri sentence diacritics bilan)
            return bestMatch;
        }

        return null; // Phonetic correction tasdiqlanmadi yoki foydali emas
    }

    /**
     * So'zlar o'rtasidagi farq phonetic STT error ekanligini tekshiradi
     * Faqat bitta harf farqi bo'lsa va phonetic map'da bor bo'lsa
     * 
     * @param userWord - User so'zi (xato bilan)
     * @param correctWord - To'g'ri so'z (materialdan)
     * @param phoneticMap - Phonetic error mapping
     * @returns true agar phonetic error bo'lsa, aks holda false
     */
    private isPhoneticSTTError(
        userWord: string,
        correctWord: string,
        phoneticMap: ReadonlyMap<string, readonly string[]>
    ): boolean {
        if (userWord.length !== correctWord.length) {
            return false; // Uzunlik farq qilsa, phonetic error emas
        }

        // Bitta harf farqini topish
        let diffCount = 0;
        let diffIndex = -1;

        for (let i = 0; i < userWord.length; i++) {
            if (userWord[i] !== correctWord[i]) {
                diffCount++;
                if (diffCount > 1) {
                    return false; // 1+ harf farqi - phonetic error emas
                }
                diffIndex = i;
            }
        }

        if (diffCount !== 1 || diffIndex === -1) {
            return false; // Faqat bitta harf farqi bo'lishi kerak
        }

        const wrongChar = userWord[diffIndex];
        const correctChar = correctWord[diffIndex];

        // Phonetic map'da borligini tekshirish (forward direction)
        const phoneticAlternatives = phoneticMap.get(wrongChar);
        if (phoneticAlternatives && phoneticAlternatives.includes(correctChar)) {
            return true; // Phonetic error topildi
        }

        // Reverse tekshiruv (correctChar → wrongChar direction)
        const reverseAlternatives = phoneticMap.get(correctChar);
        if (reverseAlternatives && reverseAlternatives.includes(wrongChar)) {
            return true; // Phonetic error topildi (reverse)
        }

        return false; // Phonetic error emas
    }

    /**
     * Context'ni faqat kelgan darsgacha bo'lgan lesson'lar bilan filtrlash
     * GPT ga faqat ruxsat etilgan lesson'lardan context yuborish uchun
     * 
     * @param context - Barcha lesson context
     * @param lastWatchedLessonOrder - User ko'rgan eng oxirgi dars tartibi
     * @returns Filtrlangan context (faqat kelgan darslar)
     */
    private filterContextByLessonOrder(context: any[], lastWatchedLessonOrder: number): any[] {
        if (!Array.isArray(context)) {
            return [];
        }

        return context.filter(lesson => {
            const lessonOrder = lesson?.lessonOrder || 0;
            return lessonOrder <= lastWatchedLessonOrder;
        });
    }

    /**
     * Material vocabulary'ni extract qilish (vocabulary list + dialogue so'zlari)
     * Bu metod material'dan foydalanish mumkin bo'lgan barcha so'zlarni to'playdi
     * 
     * @param context - Lesson context array
     * @param lastWatchedLessonOrder - User ko'rgan eng oxirgi dars tartibi (optional, faqat kelgan darslar uchun)
     * @returns Set of normalized vocabulary words (O(1) lookup uchun)
     */
    private extractMaterialVocabulary(context: any[], lastWatchedLessonOrder?: number): Set<string> {
        const vocabularySet = new Set<string>();

        if (!Array.isArray(context) || context.length === 0) {
            return vocabularySet;
        }

        const stripDiacritics = (t: string) => t.replace(/[\u064B-\u065F\u0670\u0640]/g, '');
        const stripPunctuation = (t: string) => t.replace(/[،,\.\?؟!;؛:]/g, '').trim();
        const normalize = (t: string) => {
            const cleaned = stripPunctuation(stripDiacritics(t));
            return ArabicTextUtils.normalizeArabic(cleaned);
        };

        // 1. Vocabulary list'dan so'zlar (lesson.vocabulary)
        for (const lesson of context) {
            // Skip future lessons if lastWatchedLessonOrder provided
            if (lastWatchedLessonOrder && lesson?.lessonOrder && lesson.lessonOrder > lastWatchedLessonOrder) {
                continue;
            }

            // Extract vocabulary words
            if (lesson.vocabulary && Array.isArray(lesson.vocabulary)) {
                for (const vocab of lesson.vocabulary) {
                    const word = vocab.word || vocab.normalized;
                    if (word) {
                        const normalizedWord = normalize(word);
                        if (normalizedWord && normalizedWord.length > 0) {
                            vocabularySet.add(normalizedWord);
                        }
                    }
                }
            }
        }

        // 2. Dialogue text'lardan so'zlar (lesson.text yoki lesson.content)
        for (const lesson of context) {
            // Skip future lessons if lastWatchedLessonOrder provided
            if (lastWatchedLessonOrder && lesson?.lessonOrder && lesson.lessonOrder > lastWatchedLessonOrder) {
                continue;
            }

            const lessonText = (lesson?.text || lesson?.content || '') as string;
            if (!lessonText || lessonText.trim().length === 0) {
                continue;
            }

            // Extract words from dialogue text
            const normalizedText = normalize(lessonText);
            const words = normalizedText.split(/\s+/).filter(Boolean);

            for (const word of words) {
                // Faqat mazmunli so'zlar (1+ harf, particle'lar ham qo'shiladi)
                if (word.length >= 1) {
                    vocabularySet.add(word);
                }
            }
        }

        return vocabularySet;
    }

    /**
     * GPT javobidagi so'zlar material vocabulary'da borligini tekshirish
     * Bu metod GPT o'zi gap tuzsa ham, faqat material'dagi so'zlardan foydalanganligini tasdiqlaydi
     * 
     * @param response - GPT javobi
     * @param vocabularySet - Material vocabulary Set (extractMaterialVocabulary dan)
     * @returns true agar barcha so'zlar material'da bor bo'lsa, false agar biron so'z material'da yo'q bo'lsa
     */
    private checkResponseUsesValidVocabulary(response: string, vocabularySet: Set<string>): boolean {
        if (!response || !vocabularySet || vocabularySet.size === 0) {
            return false; // Vocabulary yo'q bo'lsa, validation o'tkazib bo'lmaydi
        }

        const stripDiacritics = (t: string) => t.replace(/[\u064B-\u065F\u0670\u0640]/g, '');
        const stripPunctuation = (t: string) => t.replace(/[،,\.\?؟!;؛:]/g, '').trim();
        const normalize = (t: string) => {
            const cleaned = stripPunctuation(stripDiacritics(t));
            return ArabicTextUtils.normalizeArabic(cleaned);
        };

        const normalizedResponse = normalize(response);
        if (!normalizedResponse || normalizedResponse.length === 0) {
            return false;
        }

        // Response'dan so'zlarni extract qilish
        const responseWords = normalizedResponse.split(/\s+/).filter(Boolean);

        if (responseWords.length === 0) {
            return false;
        }

        // Har bir so'zni vocabulary'da borligini tekshirish
        const invalidWords: string[] = [];

        for (const word of responseWords) {
            // Faqat mazmunli so'zlar tekshiriladi (1+ harf)
            if (word.length >= 1 && !vocabularySet.has(word)) {
                invalidWords.push(word);
            }
        }

        // Agar invalid so'zlar bo'lsa, log qilish
        if (invalidWords.length > 0) {
            console.log(`   ⚠️  Invalid vocabulary words detected: ${invalidWords.slice(0, 5).join(', ')}${invalidWords.length > 5 ? '...' : ''} (${invalidWords.length} total)`);
            return false;
        }

        console.log(`   ✅ All words in response are from material vocabulary (${responseWords.length} words checked)`);
        return true;
    }
}
