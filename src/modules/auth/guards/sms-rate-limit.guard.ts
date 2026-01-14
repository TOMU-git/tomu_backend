import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  HttpException,
  HttpStatus,
  mixin,
  Type,
} from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { JwtService } from "@nestjs/jwt";
import { config } from "../../../common/config/index";

// Umumiy rate limit guard factory
export function RateLimitGuard(maxRequests: number, windowMs: number = 60 * 1000): Type<CanActivate> {
  @Injectable()
  class RateLimitMixin implements CanActivate {
    constructor(
      @Inject(CACHE_MANAGER) private cacheManager: Cache,
      private jwtService: JwtService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
      const request = context.switchToHttp().getRequest();
      let userId: string | number;
      let cachePrefix: string;

      // URL ga qarab user ID ni aniqlash
      if (request.url.includes('/refresh')) {
        // Refresh token endpoint uchun
        const refreshToken = request.query?.refresh_token;
        if (!refreshToken) {
          return true; // Token yo'q bo'lsa, controller tekshiradi
        }

        try {
          const payload = await this.jwtService.verifyAsync(refreshToken, {
            secret: config.jwtRefreshKey,
          });
          userId = payload.id;
          cachePrefix = 'refresh_rate_limit';
        } catch (error) {
          return true; // Token noto'g'ri bo'lsa, controller tekshiradi
        }
      } else {
        // SMS yoki boshqa endpointlar uchun
        const phone = request.body?.phone || request.body?.phoneNumber;
        if (!phone) {
          return true; // Phone yo'q bo'lsa, validation pipe tekshiradi
        }
        userId = phone;
        cachePrefix = 'sms_rate_limit';
      }

      // Cache key yaratish
      const cacheKey = `${cachePrefix}:${userId}`;

      // Hozirgi vaqt
      const now = Date.now();

      // Cache dan ma'lumotni olish
      const cachedData = await this.cacheManager.get<{
        count: number;
        resetAt: number;
      }>(cacheKey);

      if (!cachedData) {
        // Birinchi so'rov - cache ga saqlash
        await this.cacheManager.set(
          cacheKey,
          {
            count: 1,
            resetAt: now + windowMs,
          },
          windowMs,
        );
        console.log(`🚦 RATE LIMIT [${cachePrefix}] - User ${userId}: 1/${maxRequests} requests`);
        return true;
      }

      // Agar vaqt o'tib ketgan bo'lsa, yangilash
      if (now > cachedData.resetAt) {
        await this.cacheManager.set(
          cacheKey,
          {
            count: 1,
            resetAt: now + windowMs,
          },
          windowMs,
        );
        console.log(`🚦 RATE LIMIT [${cachePrefix}] - User ${userId}: 1/${maxRequests} requests (reset)`);
        return true;
      }

      // Agar limit oshib ketgan bo'lsa
      if (cachedData.count >= maxRequests) {
        const retryAfter = Math.ceil((cachedData.resetAt - now) / 1000);
        console.log(`❌ RATE LIMIT [${cachePrefix}] - User ${userId}: BLOCKED (${cachedData.count}/${maxRequests})`);

        const errorMessage = cachePrefix === 'refresh_rate_limit'
          ? `Juda ko'p refresh token so'rovlari yuborildi. Iltimos, ${retryAfter} soniyadan keyin qayta urinib ko'ring.`
          : `Juda ko'p so'rovlar yuborildi. Iltimos, ${retryAfter} soniyadan keyin qayta urinib ko'ring.`;

        throw new HttpException(
          errorMessage,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // So'rovlar sonini oshirish
      const newCount = cachedData.count + 1;
      await this.cacheManager.set(
        cacheKey,
        {
          count: newCount,
          resetAt: cachedData.resetAt,
        },
        Math.ceil((cachedData.resetAt - now) / 1000) * 1000, // Qolgan vaqt
      );

      console.log(`🚦 RATE LIMIT [${cachePrefix}] - User ${userId}: ${newCount}/${maxRequests} requests`);
      return true;
    }
  }

  return mixin(RateLimitMixin);
}

// Eski SMS rate limit guard (backward compatibility uchun)
@Injectable()
export class SmsRateLimitGuard implements CanActivate {
  private rateLimitGuard = RateLimitGuard(5); // 2 ta so'rov minutiga

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private jwtService: JwtService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const guard = new this.rateLimitGuard(this.cacheManager, this.jwtService);
    const result = await guard.canActivate(context);
    return result as boolean;
  }
}
