/**
 * Material Matching Service
 * -------------------------------------------------------
 * Maqsad: Materiallardan javob topish logikasini boshqarish
 */

import { Injectable } from '@nestjs/common';
import { normalizeText, createWordSet } from '../../../utils/text-normalization.util';
import { SIMILARITY_THRESHOLDS, PHONETIC_CORRECTION } from '../../../constants/gpt-step.constants';
import { SimilarityCalculatorService } from '../correctors/similarity-calculator.service';
import { NameValidationService } from '../validators/name-validation.service';

export interface MaterialMatchResult {
    nextSentence: string;
    lessonOrder: number | null;
    translationUz: string | null;
    // Keyingi gap (next'ning next'i) - material ketma-ketlik uchun
    nextNextSentence: string | null;
    nextNextTranslationUz: string | null;
    bestMatchSentence: string;
    bestMatchNextSentence: string;
    bestMatchScore: number;
    bestMatchLessonOrder: number | null;
    bestMatchSentenceTranslationUz: string | null;
    bestMatchNextSentenceTranslationUz: string | null;
}

@Injectable()
export class MaterialMatchingService {
    constructor(
        private readonly similarityCalculator: SimilarityCalculatorService,
        private readonly nameValidation: NameValidationService,
    ) { }

    /**
     * Materiallardan javob topish
     */
    findMaterialResponse(
        userText: string,
        normalizedUser: string,
        userWords: Set<string>,
        context: any[]
    ): MaterialMatchResult {
        const result: MaterialMatchResult = {
            nextSentence: '',
            lessonOrder: null,
            translationUz: null,
            nextNextSentence: null,
            nextNextTranslationUz: null,
            bestMatchSentence: '',
            bestMatchNextSentence: '',
            bestMatchScore: 0,
            bestMatchLessonOrder: null,
            bestMatchSentenceTranslationUz: null,
            bestMatchNextSentenceTranslationUz: null,
        };

        // Context'dagi materiallarni lessonOrder bo'yicha guruhlash
        const lessonsMap = this.groupContextByLessonOrder(context);
        
        // Context bo'sh bo'lsa, hech narsa qaytarmaymiz
        if (lessonsMap.size === 0) {
            return result;
        }

        // Har bir lesson'ni turn'lar tartibida saralash va qidirish
        for (const [lessonOrder, turns] of lessonsMap.entries()) {
            const sortedTurns = turns.sort((a, b) => a.turnIndex - b.turnIndex);
            const sentences = sortedTurns.map(t => ({ text: t.text, translationUz: t.translationUz }));
            // Turns'ni ham saqlab qolish (next key uchun)
            const turnsWithNext = sortedTurns;

            for (let i = 0; i < sentences.length; i++) {
                const sentenceData = sentences[i];
                const s = sentenceData.text;
                if (!s) continue;

                const normalizedSentence = normalizeText(s);

                // Match tekshiruvi
                const matchResult = this.checkMatch(
                    normalizedUser,
                    normalizedSentence,
                    userText,
                    s,
                    userWords
                );

                if (matchResult.isMatch) {
                    // Semantic context tekshiruvi
                    if (matchResult.needsSemanticCheck) {
                        // next key'ni tekshirish
                        const matchedTurn = turnsWithNext.find(t => normalizeText(t.text) === normalizedSentence);
                        const nextText = matchedTurn?.next || sentences[i + 1]?.text || '';
                        const semanticMatch = this.validateSemanticContext(userText, s, nextText);
                        if (!semanticMatch) {
                            continue;
                        }
                    }

                    // Keyingi gapni topish - materialdagi "next" key'ni ishlatish
                    let candidate = '';
                    let candidateTranslationUz: string | null = null;
                    
                    // Avval materialdagi "next" key'ni tekshirish
                    // Debug: turnsWithNext massivida barcha turn'larni ko'rsatish
                    if (normalizedSentence.includes('ma hdha') || normalizedSentence.includes('ما هذا')) {
                        console.log(`   🔍 DEBUG: turnsWithNext massivida ${turnsWithNext.length} ta turn bor`);
                        turnsWithNext.forEach((t, idx) => {
                            const normalizedTurnText = normalizeText(t.text);
                            console.log(`   🔍 [${idx}] Turn text: "${t.text.substring(0, 40)}", normalized: "${normalizedTurnText.substring(0, 40)}", next: ${t.next ? `"${t.next.substring(0, 40)}"` : 'null'}`);
                        });
                        console.log(`   🔍 DEBUG: normalizedSentence: "${normalizedSentence.substring(0, 40)}"`);
                    }
                    const matchedTurn = turnsWithNext.find(t => normalizeText(t.text) === normalizedSentence);
                    console.log(`   🔍 matchedTurn topildimi: ${matchedTurn ? 'HA' : 'YO\'Q'}`);
                    if (matchedTurn) {
                        console.log(`   🔍 matchedTurn.next: ${matchedTurn.next ? `"${matchedTurn.next.substring(0, 40)}"` : 'null/undefined'}`);
                    }
                    if (matchedTurn?.next) {
                        candidate = matchedTurn.next;
                        candidateTranslationUz = matchedTurn.nextTranslationUz || null;
                        console.log(`   ✅ Material "next" key topildi: "${candidate.substring(0, 40)}"`);
                    } else {
                        if (matchedTurn) {
                            console.log(`   ⚠️  matchedTurn topildi, lekin next key yo'q yoki null`);
                        } else {
                            console.log(`   ⚠️  matchedTurn topilmadi`);
                        }
                        // Agar "next" key yo'q bo'lsa, keyingi turn'dan olish (backward compatibility)
                        let nextIndex = i + 1;
                        let candidateData = null;
                        let skippedCount = 0;
                        
                        // Keyingi gapni qidirish - user gapining o'zini o'tkazib yuborish
                        while (nextIndex < sentences.length) {
                            candidateData = sentences[nextIndex];
                            candidate = candidateData?.text || '';
                            const normalizedCandidate = normalizeText(candidate);
                            const isCandidateSameAsUser = normalizedCandidate === normalizedUser;
                            
                            // Debug: Barcha keyingi gaplarni ko'rsatish
                            console.log(`   🔍 [${nextIndex}] Gap: "${candidate.substring(0, 40)}" (normalized: "${normalizedCandidate.substring(0, 40)}") - Bir xilmi: ${isCandidateSameAsUser}`);
                            
                            // Agar keyingi gap user gapining o'zi bo'lmasa, uni qabul qilamiz
                            if (candidate && candidate.length > 1 && !isCandidateSameAsUser) {
                                console.log(`   ✅ Keyingi gap topildi: "${candidate.substring(0, 40)}"`);
                                candidateTranslationUz = candidateData?.translationUz || null;
                                break;
                            }
                            
                            if (isCandidateSameAsUser) {
                                skippedCount++;
                                console.log(`   ⚠️  Keyingi gap user gapining o'zi, o'tkazib yuborildi (${skippedCount})`);
                            }
                            
                            nextIndex++;
                        }
                    }

                    const normalizedFinalCandidate = candidate ? normalizeText(candidate) : '';
                    const isFinalCandidateSameAsUser = normalizedFinalCandidate === normalizedUser;

                    // Agar keyingi gap topilgan va u user gapining o'zi bo'lmasa
                    if (candidate && candidate.length > 1 && !isFinalCandidateSameAsUser) {
                        result.nextSentence = candidate;
                        result.lessonOrder = lessonOrder;
                        result.translationUz = candidateTranslationUz;
                        
                        // Keyingi gapni (next'ning next'ini) topish - to'g'ridan-to'g'ri matchedTurn'dan
                        // Chunk'ning o'zida nextNext va nextNextTranslationUz mavjud
                        result.nextNextSentence = matchedTurn?.nextNext || null;
                        result.nextNextTranslationUz = matchedTurn?.nextNextTranslationUz || null;
                        
                        // Console log: Exact match topildi
                        console.log(`   ✅ Material match: "${s.substring(0, 40)}" → "${candidate.substring(0, 40)}"`);
                        if (result.nextNextSentence) {
                            console.log(`   📌 Next-next sentence: "${result.nextNextSentence.substring(0, 40)}"`);
                        }
                        return result;
                    } else if (isFinalCandidateSameAsUser) {
                        // Keyingi gap user gapining o'zi bo'lsa, bu match'ni o'tkazib yuborish
                        console.log(`   ⚠️  Keyingi gap user gapining o'zi, bu match'ni o'tkazib yuborish`);
                        continue;
                    } else if (!candidate || candidate.length <= 1) {
                        console.log(`   ⚠️  Keyingi gap topilmadi, dialogue tugadi`);
                        result.nextSentence = 'DIALOGUE_END';
                        result.lessonOrder = lessonOrder;
                        return result;
                    }
                }

                // Fuzzy matching - best match ni saqlash
                this.updateBestMatch(
                    normalizedUser,
                    normalizedSentence,
                    s,
                    sentences,
                    i,
                    lessonOrder,
                    result
                );
            }

            if (result.nextSentence) {
                break;
            }
        }

        // High similarity match ni tekshirish
        if (!result.nextSentence &&
            result.bestMatchScore >= SIMILARITY_THRESHOLDS.SENTENCE_SIMILARITY_HIGH &&
            result.bestMatchNextSentence &&
            result.bestMatchNextSentence.length > 1) {
            result.nextSentence = result.bestMatchNextSentence;
            result.lessonOrder = result.bestMatchLessonOrder;
            result.translationUz = result.bestMatchNextSentenceTranslationUz;
        }

        // Debug: Agar match topilmasa, best match ma'lumotlarini saqlash
        if (!result.nextSentence && result.bestMatchScore > 0) {
            // Best match topilgan, lekin threshold'dan past
            // Bu ma'lumot console log'da ko'rsatiladi
        }

        return result;
    }

    /**
     * Context'ni lessonOrder bo'yicha guruhlash
     */
    private groupContextByLessonOrder(context: any[]): Map<number, Array<{ text: string; turnIndex: number; speaker: string | null; translationUz: string | null; next: string | null; nextTranslationUz: string | null; nextNext: string | null; nextNextTranslationUz: string | null }>> {
        const lessonsMap = new Map<number, Array<{ text: string; turnIndex: number; speaker: string | null; translationUz: string | null; next: string | null; nextTranslationUz: string | null; nextNext: string | null; nextNextTranslationUz: string | null }>>();

        if (Array.isArray(context)) {
            for (const chunk of context) {
                const lessonOrder = chunk?.lessonOrder || 0;
                const text: string = (chunk && (chunk.text || chunk.content || '')) as string;
                const turnIndex = chunk?.turnIndex ?? 0;
                const speaker = chunk?.speaker || null;
                const translationUz: string | null = chunk?.translationUz || null;
                const next: string | null = chunk?.next || null;
                const nextTranslationUz: string | null = chunk?.nextTranslationUz || null;
                const nextNext: string | null = chunk?.nextNext || null;
                const nextNextTranslationUz: string | null = chunk?.nextNextTranslationUz || null;

                if (!text || text.trim().length === 0) continue;

                // Debug: next key bor-yo'qligini tekshirish
                if (text.includes('مَا هَذَا') || text.includes('ما هذا')) {
                    console.log(`   🔍 DEBUG: Chunk topildi - text: "${text.substring(0, 40)}", next: ${next ? `"${next.substring(0, 40)}"` : 'null/undefined'}, nextNext: ${nextNext ? `"${nextNext.substring(0, 40)}"` : 'null'}`);
                    console.log(`   🔍 DEBUG: Chunk object keys: ${Object.keys(chunk).join(', ')}`);
                    console.log(`   🔍 DEBUG: Chunk.next directly: ${chunk?.next || 'undefined'}, Chunk.nextNext: ${chunk?.nextNext || 'undefined'}`);
                }

                if (!lessonsMap.has(lessonOrder)) {
                    lessonsMap.set(lessonOrder, []);
                }
                lessonsMap.get(lessonOrder)!.push({ text, turnIndex, speaker, translationUz, next, nextTranslationUz, nextNext, nextNextTranslationUz });
            }
        }

        return lessonsMap;
    }

    /**
     * Match tekshiruvi
     */
    private checkMatch(
        normalizedUser: string,
        normalizedSentence: string,
        userText: string,
        sentence: string,
        userWords: Set<string>
    ): { isMatch: boolean; needsSemanticCheck: boolean } {
        const isExactMatch = normalizedSentence === normalizedUser;
        const sentenceIncludesUser = normalizedSentence.includes(normalizedUser);
        const userIncludesSentence = normalizedUser.includes(normalizedSentence);

        // Words match
        const userWordsArray = normalizedUser.split(/\s+/).filter(Boolean);
        const sentenceWordsArray = normalizedSentence.split(/\s+/).filter(Boolean);
        const userWordsInSentence = userWordsArray.filter(w => sentenceWordsArray.includes(w)).length;
        const wordsMatchRatio = userWordsArray.length > 0 ? userWordsInSentence / userWordsArray.length : 0;
        const isWordsMatch = wordsMatchRatio >= SIMILARITY_THRESHOLDS.WORDS_MATCH_RATIO &&
            userWordsArray.length >= SIMILARITY_THRESHOLDS.MIN_WORDS_FOR_MATCH;

        // Fuzzy words match
        let fuzzyWordsMatch = false;
        if (userWordsArray.length >= SIMILARITY_THRESHOLDS.MIN_WORDS_FOR_MATCH && sentenceWordsArray.length > 0) {
            let fuzzyMatchedWords = 0;

            for (const userWord of userWordsArray) {
                if (userWord.length < PHONETIC_CORRECTION.MAX_WORD_LENGTH_FOR_EXACT) {
                    if (sentenceWordsArray.includes(userWord)) {
                        fuzzyMatchedWords++;
                    }
                    continue;
                }

                if (sentenceWordsArray.includes(userWord)) {
                    fuzzyMatchedWords++;
                    continue;
                }

                let bestSimilarity = 0;
                for (const sentenceWord of sentenceWordsArray) {
                    if (sentenceWord.length < PHONETIC_CORRECTION.MAX_WORD_LENGTH_FOR_EXACT) continue;

                    const similarity = this.similarityCalculator.calculateWordSimilarity(userWord, sentenceWord);
                    if (similarity > bestSimilarity) {
                        bestSimilarity = similarity;
                    }
                }

                if (bestSimilarity >= SIMILARITY_THRESHOLDS.WORD_SIMILARITY) {
                    fuzzyMatchedWords++;
                }
            }

            const fuzzyWordsMatchRatio = userWordsArray.length > 0 ? fuzzyMatchedWords / userWordsArray.length : 0;
            fuzzyWordsMatch = fuzzyWordsMatchRatio >= SIMILARITY_THRESHOLDS.WORDS_MATCH_RATIO &&
                userWordsArray.length >= SIMILARITY_THRESHOLDS.MIN_WORDS_FOR_MATCH;
        }

        const isMatch = isExactMatch || sentenceIncludesUser || userIncludesSentence || isWordsMatch || fuzzyWordsMatch;
        const needsSemanticCheck = userIncludesSentence && !isExactMatch;

        return { isMatch, needsSemanticCheck };
    }

    /**
     * Best match ni yangilash
     */
    private updateBestMatch(
        normalizedUser: string,
        normalizedSentence: string,
        sentence: string,
        sentences: Array<{ text: string; translationUz: string | null }>,
        index: number,
        lessonOrder: number,
        result: MaterialMatchResult
    ): void {
        const sentenceSimilarity = this.similarityCalculator.calculateSentenceSimilarity(
            normalizedUser,
            normalizedSentence
        );

        const jaccardScore = this.similarityCalculator.calculateJaccardSimilarity(
            normalizedUser,
            normalizedSentence
        );

        const combinedScore = sentenceSimilarity >= SIMILARITY_THRESHOLDS.SENTENCE_SIMILARITY_HIGH
            ? sentenceSimilarity
            : sentenceSimilarity * 0.7 + jaccardScore * 0.3;

        if (combinedScore > result.bestMatchScore) {
            result.bestMatchScore = combinedScore;
            result.bestMatchSentence = sentence;
            result.bestMatchSentenceTranslationUz = sentences[index].translationUz;
            result.bestMatchNextSentence = sentences[index + 1]?.text || '';
            result.bestMatchNextSentenceTranslationUz = sentences[index + 1]?.translationUz || null;
            result.bestMatchLessonOrder = lessonOrder;
        }
    }

    /**
     * Semantik kontekst validatsiyasi
     */
    private validateSemanticContext(userText: string, matchedSentence: string, response: string): boolean {
        if (!userText || !response) return true;

        const normalize = (t: string) => normalizeText(t);
        const normalizedUser = normalize(userText);
        const normalizedResponse = normalize(response);

        const userHasOrigin = normalizedUser.match(/من\s+(مصر|أين|اين|بلاد|دولة|\w+)/) !== null;
        const responseHasOrigin = normalizedResponse.match(/من\s+(مصر|أين|اين|بلاد|دولة|\w+)/) !== null;

        const userHasLocation = normalizedUser.match(/في\s+(المسجد|المدرسة|البيت|السوق|ال\w+)/) !== null;
        const responseHasLocation = normalizedResponse.match(/في\s+(المسجد|المدرسة|البيت|السوق|ال\w+)/) !== null;

        if (userHasOrigin && !responseHasOrigin && responseHasLocation) {
            return false;
        }

        if (userHasLocation && !responseHasLocation && responseHasOrigin) {
            return false;
        }

        return true;
    }
}

