import { SubscriptionStatus } from '../enums/subscription-status.enum';
import { UserCourse } from 'src/modules/user-courses/entities/user-course.entity';

/**
 * UserCourse ma'lumotlariga asoslanib subscription status ni aniqlaydi
 * 
 * Logika:
 * 1. PURCHASED: hasEverPaid=true, isActive=true, muddat tugamagan
 * 2. FREE_TRIAL: onFreeTrial=true, hasEverPaid=false
 * 3. EXPIRED: userCourse bor, lekin muddat tugagan
 * 4. NO_SUBSCRIPTION: userCourse yo'q
 */
export function getSubscriptionStatus(userCourse: UserCourse | null): SubscriptionStatus {
    // Agar userCourse yo'q bo'lsa - obuna yo'q
    if (!userCourse) {
        return SubscriptionStatus.NO_SUBSCRIPTION;
    }

    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0); // Faqat sanani solishtirish uchun

    // PURCHASED: To'lov qilingan va aktiv obuna
    if (
        userCourse.hasEverPaid &&
        userCourse.isActive &&
        (!userCourse.endedAt || new Date(userCourse.endedAt) >= currentDate)
    ) {
        return SubscriptionStatus.PURCHASED;
    }

    // FREE_TRIAL: Bepul sinov, hali to'lov qilinmagan
    if (userCourse.onFreeTrial && !userCourse.hasEverPaid) {
        return SubscriptionStatus.FREE_TRIAL;
    }

    // EXPIRED: Muddat tugagan
    if (userCourse.endedAt && new Date(userCourse.endedAt) < currentDate) {
        return SubscriptionStatus.EXPIRED;
    }

    // Default: Obuna yo'q (boshqa holatlar uchun)
    return SubscriptionStatus.NO_SUBSCRIPTION;
}
