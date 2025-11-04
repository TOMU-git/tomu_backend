import { Injectable } from "@nestjs/common";
import { promises as fs } from "fs";
import { IndexedChunk, ParsedLesson } from "./types/chroma.types";

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
            const moduleNumber: number = json.moduleNumber;
            const lessonOrder: number = json.lessonNumber ?? json.lessonOrder;
            const title: string = json.title ?? "";
            const dialogue: any[] = Array.isArray(json.dialogue) ? json.dialogue : [];

            let chunks: IndexedChunk[] = [];

            // 1) Agar dialogue bo'lsa, uni index qilish (asosiy format)
            if (dialogue.length > 0) {
                chunks = dialogue.map((turn) => ({
                    id: this.buildChunkId(language, moduleNumber, lessonOrder, turn.turnIndex ?? 0),
                    language,
                    moduleNumber,
                    lessonOrder,
                    turnIndex: turn.turnIndex ?? 0,
                    speaker: turn.speaker ?? null,
                    text: String(turn.text ?? ""),
                    translationUz: turn.translationUz ?? null,
                    audioUrl: turn.audioUrl ?? null,
                    title,
                }));
            }
            // 2) Agar dialogue bo'sh bo'lsa, segments yoki monologue'ni index qilish
            else {
                const segments: any[] = Array.isArray(json.segments) ? json.segments : [];
                const monologue = json.monologue;

                // Agar segments bo'lsa, har bir segmentni alohida chunk qilish
                if (segments.length > 0) {
                    chunks = segments.map((segment, idx) => ({
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
                    }));
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

