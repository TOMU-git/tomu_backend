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

            const chunks: IndexedChunk[] = dialogue.map((turn) => ({
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

            return { language, moduleNumber, lessonOrder, title, chunks };
        } catch (e) {
            console.warn(`LessonIndexingService: parse failed for ${filePath}: ${(e as Error).message}`);
            return null;
        }
    }
}

