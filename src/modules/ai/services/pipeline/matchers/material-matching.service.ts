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
            bestMatchSentence: '',
            bestMatchNextSentence: '',
            bestMatchScore: 0,
            bestMatchLessonOrder: null,
            bestMatchSentenceTranslationUz: null,
            bestMatchNextSentenceTranslationUz: null,
        };

        // Context'dagi materiallarni lessonOrder bo'yicha guruhlash
        const lessonsMap = this.groupContextByLessonOrder(context);

        // Har bir lesson'ni turn'lar tartibida saralash va qidirish
        for (const [lessonOrder, turns] of lessonsMap.entries()) {
            const sortedTurns = turns.sort((a, b) => a.turnIndex - b.turnIndex);
            const sentences = sortedTurns.map(t => ({ text: t.text, translationUz: t.translationUz }));

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
                        const nextSentenceText = sentences[i + 1]?.text || '';
                        const semanticMatch = this.validateSemanticContext(userText, s, nextSentenceText);
                        if (!semanticMatch) {
                            continue;
                        }
                    }

                    // Keyingi gapni topish
                    const candidateData = sentences[i + 1];
                    const candidate = candidateData?.text || '';
                    const isLastSentence = i === sentences.length - 1;

                    if (candidate && candidate.length > 1) {
                        result.nextSentence = candidate;
                        result.lessonOrder = lessonOrder;
                        result.translationUz = candidateData?.translationUz || null;
                        return result;
                    } else if (isLastSentence) {
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

        return result;
    }

    /**
     * Context'ni lessonOrder bo'yicha guruhlash
     */
    private groupContextByLessonOrder(context: any[]): Map<number, Array<{ text: string; turnIndex: number; speaker: string | null; translationUz: string | null }>> {
        const lessonsMap = new Map<number, Array<{ text: string; turnIndex: number; speaker: string | null; translationUz: string | null }>>();

        if (Array.isArray(context)) {
            for (const chunk of context) {
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

