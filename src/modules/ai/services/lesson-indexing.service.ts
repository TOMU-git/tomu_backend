import { Injectable } from "@nestjs/common";
import { promises as fs } from "fs";
import { IndexedChunk, ParsedLesson } from "./types/chroma.types";
import { normalizeText } from "../utils/text-normalization.util";

/**
 * LessonIndexingService
 * -------------------------------------------------------
 * Maqsad: Lesson JSON fayllarini parse qilish va chunk'larni yaratish.
 */
@Injectable()
export class LessonIndexingService {
    /**
     * Build unique chunk ID
     */
    buildChunkId(language: string, moduleNumber: number, lessonOrder: number, turnIndex: number): string {
        return `${language}_m${moduleNumber}_l${lessonOrder}_t${turnIndex}`;
    }

    /**
     * Parse lesson JSON file
     */
    async parseLessonJson(filePath: string): Promise<ParsedLesson | null> {
        try {
            const raw = await fs.readFile(filePath, "utf-8");
            const json = JSON.parse(raw);
            const language: string = json.language;
            const moduleNumber: number = json.moduleNumber ?? json.module ?? 1;
            const lessonOrder: number = json.lessonNumber ?? json.lessonOrder ?? json.lesson ?? 1;
            const title: string = json.title ?? "";
            const dialogue: any[] = Array.isArray(json.dialogue) ? json.dialogue : [];

            let chunks: IndexedChunk[] = [];

            // 1) Agar dialogue bo'lsa, uni index qilish (asosiy format)
            if (dialogue.length > 0) {
                chunks = dialogue.map((turn, index) => {
                    // turnIndex ni belgilash - agar materialda turnIndex yo'q bo'lsa, index ishlatiladi
                    const turnIndex = turn.turnIndex ?? index;
                    
                    // next key'ni topish - keyingi turn'dan yoki turn.next'dan
                    let nextText: string | null = null;
                    let nextTranslationUz: string | null = null;
                    let nextNextText: string | null = null;
                    let nextNextTranslationUz: string | null = null;
                    
                    // Avval turn.next key'ni tekshirish (materialda belgilangan)
                    if (turn.next) {
                        nextText = String(turn.next);
                        // next key'ning translationUz'ini topish - dialogue'dan next text'ga mos turn'ni topish
                        const nextTurn = dialogue.find((t) => {
                            const normalizedNext = normalizeText(nextText);
                            const normalizedTurnText = normalizeText(String(t.text ?? ""));
                            return normalizedTurnText === normalizedNext;
                        });
                        nextTranslationUz = nextTurn?.translationUz ?? null;
                        
                        // nextNext topish - next turn'ning next'i
                        if (nextTurn?.next) {
                            nextNextText = String(nextTurn.next);
                            const nextNextTurn = dialogue.find((t) => {
                                const normalizedNextNext = normalizeText(nextNextText);
                                const normalizedTurnText = normalizeText(String(t.text ?? ""));
                                return normalizedTurnText === normalizedNextNext;
                            });
                            nextNextTranslationUz = nextNextTurn?.translationUz ?? null;
                        }
                    } else {
                        // Agar next key yo'q bo'lsa, keyingi turn'dan olish (backward compatibility)
                        const nextTurn = dialogue[index + 1];
                        if (nextTurn) {
                            nextText = String(nextTurn.text ?? "");
                            nextTranslationUz = nextTurn.translationUz ?? null;
                            
                            // nextNext topish
                            const nextNextTurn = dialogue[index + 2];
                            if (nextNextTurn) {
                                nextNextText = String(nextNextTurn.text ?? "");
                                nextNextTranslationUz = nextNextTurn.translationUz ?? null;
                            }
                        }
                    }
                    
                    return {
                        id: this.buildChunkId(language, moduleNumber, lessonOrder, turnIndex),
                        language,
                        moduleNumber,
                        lessonOrder,
                        turnIndex: turnIndex,
                        speaker: turn.speaker ?? null,
                        text: String(turn.text ?? ""),
                        translationUz: turn.translationUz ?? null,
                        audioUrl: turn.audioUrl ?? null,
                        title,
                        next: nextText,
                        nextTranslationUz: nextTranslationUz,
                        nextNext: nextNextText,
                        nextNextTranslationUz: nextNextTranslationUz,
                    };
                });
            }
            // 2) Agar dialogue bo'sh bo'lsa, segments yoki monologue'ni index qilish
            else {
                const segments: any[] = Array.isArray(json.segments) ? json.segments : [];
                const monologue = json.monologue;

                // Agar segments bo'lsa, har bir segmentni alohida chunk qilish
                if (segments.length > 0) {
                    chunks = segments.map((segment, idx) => {
                        const nextSegment = segments[idx + 1];
                        const nextNextSegment = segments[idx + 2];
                        return {
                            id: this.buildChunkId(language, moduleNumber, lessonOrder, segment.index ?? idx),
                            language,
                            moduleNumber,
                            lessonOrder,
                            turnIndex: segment.index ?? idx,
                            speaker: null, // Monologue'da speaker yo'q
                            text: String(segment.text ?? ""),
                            translationUz: segment.translationUz ?? null,
                            audioUrl: segment.audioUrl ?? null,
                            title,
                            next: nextSegment ? String(nextSegment.text ?? "") : null,
                            nextTranslationUz: nextSegment?.translationUz ?? null,
                            nextNext: nextNextSegment ? String(nextNextSegment.text ?? "") : null,
                            nextNextTranslationUz: nextNextSegment?.translationUz ?? null,
                        };
                    });
                }
                // Agar segments ham yo'q bo'lsa, monologue'ni to'liq chunk qilish
                else if (monologue && typeof monologue === 'object' && monologue.text) {
                    chunks = [{
                        id: this.buildChunkId(language, moduleNumber, lessonOrder, 0),
                        language,
                        moduleNumber,
                        lessonOrder,
                        turnIndex: 0,
                        speaker: null,
                        text: String(monologue.text ?? ""),
                        translationUz: monologue.translationUz ?? null,
                        audioUrl: monologue.audioUrl ?? null,
                        title,
                        next: null,
                        nextTranslationUz: null,
                        nextNext: null,
                        nextNextTranslationUz: null,
                    }];
                }
            }

            return { language, moduleNumber, lessonOrder, title, chunks };
        } catch (e) {
            console.warn(`LessonIndexingService: parse failed for ${filePath}: ${(e as Error).message}`);
            return null;
        }
    }
}

