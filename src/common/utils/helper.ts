/**
 * Vimeo video URL utilities
 * 
 * Bu helper funksiyalar Vimeo video URL larini boshqarish uchun ishlatiladi.
 * iOS va boshqa platformalar uchun embed URL yaratish.
 */

/**
 * Vimeo video URL dan video ID ni ajratib oladi
 * 
 * @param videoUrl - Vimeo video URL (https://vimeo.com/123456789 yoki https://player.vimeo.com/video/123456789)
 * @returns Video ID yoki null (agar topilmasa)
 * 
 * @example
 * extractVimeoId('https://vimeo.com/123456789') // '123456789'
 * extractVimeoId('https://player.vimeo.com/video/123456789') // '123456789'
 */
export function extractVimeoId(videoUrl: string): string | null {
    if (!videoUrl || typeof videoUrl !== 'string') {
        return null;
    }

    // Vimeo URL formatlarini qo'llab-quvvatlash:
    // - https://vimeo.com/123456789
    // - https://player.vimeo.com/video/123456789
    // - http://vimeo.com/123456789
    const vimeoIdRegex = /(?:vimeo\.com\/|video\/)([0-9]+)/;
    const match = videoUrl.match(vimeoIdRegex);

    return match ? match[1] : null;
}

/**
 * Vimeo video URL dan iOS uchun embed URL yaratadi
 * 
 * iOS da Vimeo videolarini to'g'ri ochish uchun autoplay va muted parametrlari kerak.
 * Bu funksiya video URL dan embed URL yaratadi va kerakli parametrlarni qo'shadi.
 * 
 * @param videoUrl - Vimeo video URL
 * @returns Embed URL (autoplay va muted parametrlari bilan) yoki null
 * 
 * @example
 * generateVimeoEmbedUrl('https://vimeo.com/123456789')
 * // 'https://player.vimeo.com/video/123456789?autoplay=1&muted=1'
 */
export function generateVimeoEmbedUrl(videoUrl: string): string | null {
    const videoId = extractVimeoId(videoUrl);

    if (!videoId) {
        return null;
    }

    return `https://player.vimeo.com/video/${videoId}?autoplay=1&muted=1`;
}

/**
 * Entity yoki object ga vimeoEmbedUrl maydonini qo'shadi
 * 
 * Bu funksiya videoUrl maydoni bo'lgan har qanday object uchun
 * vimeoEmbedUrl maydonini avtomatik qo'shadi.
 * 
 * @param item - videoUrl maydoni bo'lgan object
 * @returns videoUrl va vimeoEmbedUrl maydonlari bo'lgan object
 * 
 * @example
 * const lesson = { id: 1, title: 'Dars 1', videoUrl: 'https://vimeo.com/123' };
 * addVimeoEmbedUrl(lesson);
 * // { id: 1, title: 'Dars 1', videoUrl: '...', vimeoEmbedUrl: '...' }
 */
export function addVimeoEmbedUrl<T extends { videoUrl?: string }>(item: T): T & { vimeoEmbedUrl?: string } {
    if (!item) {
        return item as T & { vimeoEmbedUrl?: string };
    }

    return {
        ...item,
        vimeoEmbedUrl: item.videoUrl ? generateVimeoEmbedUrl(item.videoUrl) : null,
    };
}

/**
 * Array ichidagi barcha elementlarga vimeoEmbedUrl qo'shadi
 * 
 * @param items - videoUrl maydoni bo'lgan objectlar array
 * @returns vimeoEmbedUrl qo'shilgan array
 * 
 * @example
 * const lessons = [{ videoUrl: 'https://vimeo.com/123' }];
 * addVimeoEmbedUrlToArray(lessons);
 */
export function addVimeoEmbedUrlToArray<T extends { videoUrl?: string }>(
    items: T[]
): Array<T & { vimeoEmbedUrl?: string }> {
    if (!items || !Array.isArray(items)) {
        return [];
    }

    return items.map(item => addVimeoEmbedUrl(item));
}