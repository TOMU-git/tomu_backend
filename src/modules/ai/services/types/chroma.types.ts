/**
 * Shared types for Chroma service components
 */

export interface IndexedChunk {
    id: string;
    language: string;
    moduleNumber: number;
    lessonOrder: number;
    turnIndex: number;
    speaker: string | null;
    text: string;
    translationUz: string | null;
    audioUrl: string | null;
    title: string;
    next: string | null; // Keyingi gap (dialogue'dan)
    nextTranslationUz: string | null; // Keyingi gapning tarjimasi
    nextNext: string | null; // Next'ning next'i (ketma-ketlik uchun)
    nextNextTranslationUz: string | null; // Next-next'ning tarjimasi
}

export interface ParsedLesson {
    language: string;
    moduleNumber: number;
    lessonOrder: number;
    title: string;
    chunks: IndexedChunk[];
}

export interface SearchContextParams {
    userId: number;
    courseId: number;
    moduleLimit?: number;
    language?: string;
    maxLessonOrder?: number;
    strict?: boolean;
    query?: string;
}

export interface ChromaConnectionConfig {
    url: string;
    apiVersion: string;
    collectionName: string;
    tenant?: string;
    database?: string;
}

export interface EmbeddingResult {
    embeddings: number[][];
    metadata: any[];
}

