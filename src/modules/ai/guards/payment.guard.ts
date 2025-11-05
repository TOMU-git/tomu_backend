import {
    CanActivate,
    ExecutionContext,
    Inject,
    Injectable,
    ForbiddenException,
    BadRequestException,
    Logger,
} from "@nestjs/common";
import { IUserCourseRepository } from "src/modules/user-courses/interfaces/user-course.repository";
import { IAIChatSessionRepository } from "../interfaces/ai-chat-session.repository";

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

        // DEBUG: kiruvchi request haqida qisqa log (guarddan oldin controller ishlamaydi)
        try {
            const rawBody = request.body || {};
            const rawQuery = request.query || {};
            const rawParams = request.params || {};
            console.log("[PaymentGuard] Incoming:", {
                userId: user?.id,
                body: {
                    sessionId: rawBody?.sessionId,
                    courseId: rawBody?.courseId,
                    language: rawBody?.language,
                },
                queryCourseId: rawQuery?.courseId,
                paramCourseId: rawParams?.courseId,
                path: request?.originalUrl || request?.url,
                method: request?.method,
            });
        } catch (_) { }

        // 1. User mavjudligini tekshirish (AuthGuard allaqachon tekshiradi, lekin qo'shimcha xavfsizlik)
        // Bu yerda 401 Unauthorized to'g'ri, chunki authentication muammosi
        if (!user || !user.id) {
            this.logger.warn("PaymentGuard: User not found in request");
            throw new ForbiddenException("Foydalanuvchi autentifikatsiya qilinmagan");
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
                console.log("[PaymentGuard] courseId derived from header", { courseId });
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
                    console.log("[PaymentGuard] courseId derived from session", { sessionId, courseId });
                }
            }
        }

        if (!courseId) {
            // Agar courseId berilmasa, foydalanuvchi birinchi marta kiryapti
            // Bu holatda barcha aktiv kurslarni tekshiramiz
            const result = await this.checkAnyActiveCourse(userId);
            console.log("[PaymentGuard] checkAnyActiveCourse result:", result);
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
            console.log("[PaymentGuard] FAIL: userCourse not found", { userId, courseId });
            throw new BadRequestException(
                "Kurs sotib olinmagan yoki ruxsat yo'q. Iltimos, kursni sotib oling."
            );
        }

        // 4. Obuna aktivligini tekshirish
        if (!userCourse.isActive) {
            this.logger.warn(
                `PaymentGuard: Subscription inactive for user ${userId}, course ${courseId}`
            );
            console.log("[PaymentGuard] FAIL: isActive=false", { userId, courseId });
            throw new BadRequestException(
                "Obuna aktiv emas. Iltimos, obunangizni yangilang."
            );
        }

        // 5. Obuna muddati tekshiruvi
        const now = new Date();
        if (userCourse.endedAt && new Date(userCourse.endedAt) < now) {
            // Obuna muddati tugagan, lekin database'da isActive hali true bo'lishi mumkin
            // Bu holatda isActive'ni yangilash
            userCourse.isActive = false;
            await this.userCourseRepository.update(userCourse);

            this.logger.warn(
                `PaymentGuard: Subscription expired for user ${userId}, course ${courseId}`
            );
            console.log("[PaymentGuard] FAIL: expired", { userId, courseId, endedAt: userCourse.endedAt, now });
            throw new BadRequestException(
                "Obuna muddati tugagan. Iltimos, obunangizni yangilang."
            );
        }

        // 6. hasEverPaid tekshiruvi (ixtiyoriy - free trial bo'lsa ruxsat berish)
        // Agar free trial ruxsat etilsa, bu tekshiruvni o'tkazib yuborish mumkin
        // Hozircha: hasEverPaid yoki onFreeTrial bo'lsa ruxsat beramiz
        if (!userCourse.hasEverPaid && !userCourse.onFreeTrial) {
            this.logger.warn(
                `PaymentGuard: No payment made for user ${userId}, course ${courseId}`
            );
            console.log("[PaymentGuard] FAIL: no payment and no trial", { userId, courseId });
            throw new BadRequestException(
                "To'lov qilinmagan. Iltimos, kursni sotib oling."
            );
        }

        this.logger.debug(
            `PaymentGuard: Access granted for user ${userId}, course ${courseId}`
        );
        console.log("[PaymentGuard] PASS", {
            userId,
            courseId,
            isActive: userCourse.isActive,
            endedAt: userCourse.endedAt,
            hasEverPaid: userCourse.hasEverPaid,
            onFreeTrial: userCourse.onFreeTrial,
        });

        return true;
    }

    /**
     * Request'dan courseId ni olish
     * Body, query yoki params'dan
     */
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
        console.log("[PaymentGuard] Found userCourses:", (userCourses || []).map(uc => ({
            id: uc.id,
            isActive: uc.isActive,
            endedAt: uc.endedAt,
            hasEverPaid: uc.hasEverPaid,
            onFreeTrial: uc.onFreeTrial,
        })));

        if (!userCourses || userCourses.length === 0) {
            throw new BadRequestException(
                "Sizda aktiv kurs mavjud emas. Iltimos, kurs sotib oling."
            );
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
        const hasActiveCourse = hydrated.some((uc) => {
            const isActive = uc.isActive;
            const notExpired = !uc.endedAt || new Date(uc.endedAt) >= now;
            const hasPaid = uc.hasEverPaid || uc.onFreeTrial;

            return isActive && notExpired && hasPaid;
        });

        if (!hasActiveCourse) {
            throw new BadRequestException(
                "Aktiv obunangiz mavjud emas. Iltimos, obunangizni yangilang."
            );
        }

        return true;
    }
}

