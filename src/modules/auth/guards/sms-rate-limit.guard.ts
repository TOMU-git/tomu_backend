import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";

@Injectable()
export class SmsRateLimitGuard implements CanActivate {
  private readonly MAX_REQUESTS = 2; // 5 ta so'rov
  private readonly WINDOW_MS = 60 * 1000; // 1 daqiqa (60000 ms)

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const body = request.body;

    // Telefon raqamini olish
    const phone = body?.phone;
    if (!phone) {
      // Agar telefon raqam bo'lmasa, guard o'tkazadi (validation pipe tekshiradi)
      return true;
    }

    // Cache key yaratish
    const cacheKey = `sms_rate_limit:${phone}`;

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
          resetAt: now + this.WINDOW_MS,
        },
        this.WINDOW_MS,
      );
      return true;
    }

    // Agar vaqt o'tib ketgan bo'lsa, yangilash
    if (now > cachedData.resetAt) {
      await this.cacheManager.set(
        cacheKey,
        {
          count: 1,
          resetAt: now + this.WINDOW_MS,
        },
        this.WINDOW_MS,
      );
      return true;
    }

    // Agar limit oshib ketgan bo'lsa
    if (cachedData.count >= this.MAX_REQUESTS) {
      const retryAfter = Math.ceil((cachedData.resetAt - now) / 1000);
      throw new HttpException(
        `Juda ko'p so'rovlar yuborildi. Iltimos, ${retryAfter} soniyadan keyin qayta urinib ko'ring.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // So'rovlar sonini oshirish
    await this.cacheManager.set(
      cacheKey,
      {
        count: cachedData.count + 1,
        resetAt: cachedData.resetAt,
      },
      Math.ceil((cachedData.resetAt - now) / 1000) * 1000, // Qolgan vaqt
    );

    return true;
  }
}

