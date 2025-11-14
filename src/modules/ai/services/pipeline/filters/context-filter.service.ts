/**
 * Context Filter Service
 * -------------------------------------------------------
 * Maqsad: Context'ni lesson order bo'yicha filtrlash
 */

import { Injectable } from '@nestjs/common';

@Injectable()
export class ContextFilterService {
    /**
     * Context'ni faqat kelgan darsgacha bo'lgan lesson'lar bilan filtrlash
     * Future lessons skip qilish logikasini aniq qilish
     * 
     * @param context - Barcha lesson context
     * @param lastWatchedLessonOrder - User ko'rgan eng oxirgi dars tartibi
     * @returns Filtrlangan context (faqat kelgan darslar, lessonOrder <= lastWatchedLessonOrder)
     */
    filterContextByLessonOrder(context: any[], lastWatchedLessonOrder: number): any[] {
        if (!Array.isArray(context)) {
            return [];
        }

        // Faqat lessonOrder <= lastWatchedLessonOrder bo'lgan lesson'larni qoldirish
        // Future lessons (lessonOrder > lastWatchedLessonOrder) skip qilinadi
        return context.filter(lesson => {
            const lessonOrder = lesson?.lessonOrder || 0;
            return lessonOrder <= lastWatchedLessonOrder;
        });
    }
}

