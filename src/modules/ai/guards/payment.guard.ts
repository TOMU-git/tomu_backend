import {
    CanActivate,
    ExecutionContext,
    Inject,
    Injectable,
    Logger,
} from "@nestjs/common";
import { IUserCourseRepository } from "src/modules/user-courses/interfaces/user-course.repository";
import { IAIChatSessionRepository } from "../interfaces/ai-chat-session.repository";
import {
    PaymentRequiredException,
    SubscriptionExpiredException,
    InvalidSessionException
} from "../exceptions";

/**
 * PaymentGuard
 * -------------------------------------------------------
 * Maqsad: AI servislarini faqat to'lov qilgan foydalanuvchilar uchun ochish.
 * 
 * Tekshiriladigan shartlar:
 *  1. UserCourse mavjudligi (userId + courseId)
 *  2. isActive = true (obuna aktiv)
 *  3. endedAt > current date (obuna muddati tugamagan)
 *  4. hasEverPaid = true (ixtiyoriy - agar free trial bo'lmasa)
 * 
 * Xatolar:
 *  - 403 Forbidden - Agar to'lov tekshiruvi o'tmasa
 * 
 * Foydalanish:
 *  @UseGuards(AuthGuard, PaymentGuard)
 *  @Post('voice')
 */
@Injectable()
export class PaymentGuard implements CanActivate {
    private readonly logger = new Logger(PaymentGuard.name);

    constructor(
        @Inject("IUserCourseRepository")
        private readonly userCourseRepository: IUserCourseRepository,
        @Inject("IAIChatSessionRepository")
        private readonly aiChatSessionRepository: IAIChatSessionRepository,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const user = request.user; // AuthGuard'dan keladi

        try {
            const rawBody = request.body || {};
            const rawQuery = request.query || {};
            const rawParams = request.params || {};
        } catch (_) { }

        if (!user || !user.id) {
            this.logger.warn("PaymentGuard: User not found in request");
            throw new InvalidSessionException({
                reason: 'invalid',
                userId: user?.id
            });
        }

        const userId = user.id;

        // 2. CourseId olish - body yoki query'dan
        let courseId = this.extractCourseId(request);

        // Agar courseId yo'q bo'lsa, sessionId orqali aniqlashga harakat qilamiz
        if (!courseId) {
            // Headerlardan olish imkoniyati (multipart oldidan)
            const headerCourse = request.headers?.['x-course-id'] || request.headers?.['x-course'];
            if (headerCourse) {
                courseId = Number(headerCourse);
                // console.log("[PaymentGuard] courseId derived from header", { courseId });
            }

            const sessionId = this.extractSessionId(request);
            if (sessionId) {
                const session = await this.aiChatSessionRepository.findOneById(Number(sessionId));
                if (!session) {
                    this.logger.warn(`PaymentGuard: Session not found: ${sessionId}`);
                } else if (session.userId !== userId) {
                    this.logger.warn(`PaymentGuard: Session owner mismatch. user=${userId}, session.userId=${session.userId}`);
                } else if (session.courseId) {
                    courseId = Number(session.courseId);
                    // console.log("[PaymentGuard] courseId derived from session", { sessionId, courseId });
                }
            }
        }

        if (!courseId) {
            // Agar courseId berilmasa, foydalanuvchi birinchi marta kiryapti
            // Bu holatda barcha aktiv kurslarni tekshiramiz
            const result = await this.checkAnyActiveCourse(userId);
            // console.log("[PaymentGuard] checkAnyActiveCourse result:", result);
            return result;
        }

        // 3. UserCourse topish
        const userCourse = await this.userCourseRepository.findByUserIdAndCourseId(
            userId,
            courseId
        );

        if (!userCourse) {
            this.logger.warn(
                `PaymentGuard: UserCourse not found for user ${userId}, course ${courseId}`
            );
            throw new PaymentRequiredException({
                courseId,
                userId
            });
        }

        // 4. hasEverPaid tekshiruvi - birinchi tekshirish (agar to'lov qilinmagan bo'lsa, obuna haqida gapirish mantiqiy emas)
        if (!userCourse.hasEverPaid) {
            this.logger.warn(
                `PaymentGuard: No payment made for user ${userId}, course ${courseId}`
            );
            throw new PaymentRequiredException({
                courseId,
                userId
            });
        }

        // 5. Obuna aktivligini tekshirish
        if (!userCourse.isActive) {
            this.logger.warn(
                `PaymentGuard: Subscription inactive for user ${userId}, course ${courseId}`
            );
            throw new SubscriptionExpiredException({
                courseId,
                userId,
                expiredAt: userCourse.endedAt
            });
        }

        // 6. Obuna muddati tekshiruvi
        const now = new Date();
        if (userCourse.endedAt && new Date(userCourse.endedAt) < now) {
            // Obuna muddati tugagan, lekin database'da isActive hali true bo'lishi mumkin
            // Bu holatda isActive'ni yangilash
            userCourse.isActive = false;
            await this.userCourseRepository.update(userCourse);

            this.logger.warn(
                `PaymentGuard: Subscription expired for user ${userId}, course ${courseId}`
            );
            throw new SubscriptionExpiredException({
                courseId,
                userId,
                expiredAt: userCourse.endedAt
            });
        }
        return true;
    }

    private extractCourseId(request: any): number | null {
        // Body'dan (POST request)
        if (request.body?.courseId) {
            return Number(request.body.courseId);
        }

        // Query'dan (GET request)
        if (request.query?.courseId) {
            return Number(request.query.courseId);
        }

        // Params'dan (URL parameter)
        if (request.params?.courseId) {
            return Number(request.params.courseId);
        }

        return null;
    }

    /**
     * Request'dan sessionId ni olish
     */
    private extractSessionId(request: any): number | null {
        if (request.body?.sessionId) return Number(request.body.sessionId);
        if (request.query?.sessionId) return Number(request.query.sessionId);
        if (request.params?.sessionId) return Number(request.params.sessionId);
        const headerSession = request.headers?.['x-session-id'] || request.headers?.['x-session'];
        if (headerSession) return Number(headerSession);
        return null;
    }

    /**
     * Agar courseId berilmasa, foydalanuvchida hech bo'lmaganda bitta aktiv kurs bo'lishini tekshirish
     */
    private async checkAnyActiveCourse(userId: number): Promise<boolean> {
        const userCourses = await this.userCourseRepository.findByUserId(userId);
        if (!userCourses || userCourses.length === 0) {
            throw new PaymentRequiredException({
                userId
            });
        }
        // Agar ayrim ustunlar undefined bo'lsa, to'liq entity'ni olib qayta tekshiramiz
        const hydrated: typeof userCourses = [] as any;
        for (const uc of userCourses) {
            if (
                typeof uc.isActive === 'undefined' ||
                typeof uc.hasEverPaid === 'undefined' ||
                typeof uc.onFreeTrial === 'undefined' ||
                typeof uc.endedAt === 'undefined'
            ) {
                const full = await this.userCourseRepository.findById(uc.id);
                hydrated.push(full || uc);
            } else {
                hydrated.push(uc);
            }
        }

        // Hech bo'lmaganda bitta aktiv va muddati tugamagan kurs bo'lishi kerak
        const now = new Date();
        
        // Avval hasEverPaid = false bo'lgan kurslarni tekshirish
        const hasAnyPaidCourse = hydrated.some((uc) => uc.hasEverPaid);
        if (!hasAnyPaidCourse) {
            // Agar hech qanday kurs uchun to'lov qilinmagan bo'lsa, PAYMENT_REQUIRED
            throw new PaymentRequiredException({
                userId
            });
        }
        
        const hasActiveCourse = hydrated.some((uc) => {
            const isActive = uc.isActive;
            const notExpired = !uc.endedAt || new Date(uc.endedAt) >= now;
            const hasPaid = uc.hasEverPaid; // Faqat hasEverPaid tekshiriladi

            return isActive && notExpired && hasPaid;
        });

        if (!hasActiveCourse) {
            throw new SubscriptionExpiredException({
                userId
            });
        }

        return true;
    }
}

