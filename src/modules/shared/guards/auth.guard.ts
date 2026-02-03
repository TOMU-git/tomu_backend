import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService, TokenExpiredError } from "@nestjs/jwt";
import { Request } from "express";
import { config } from "../../../common/config/index";
import { IUserService } from "../../user/interfaces/user.service";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject("IUserService") private readonly userService: IUserService,
    private jwtService: JwtService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    // console.log('🛡️ AUTH GUARD - Request URL:', request.url);
    // console.log('🔍 AUTH GUARD - Token present:', !!token);
    // if (token) {
    //   console.log('🎫 AUTH GUARD - Token preview:', token.substring(0, 20) + '...');
    // }

    if (!token) {
      console.log('[AuthGuard] ❌ Token not found in Authorization header');
      throw new UnauthorizedException("Token topilmadi. Iltimos, autentifikatsiya qiling.");
    }

    try {
      console.log('🔐 AUTH GUARD - Verifying token with secret:', config.jwtSecretKey?.substring(0, 5) + '...');
      const payload = await this.jwtService.verifyAsync(token, {
        secret: config.jwtSecretKey,
      });
      console.log('✅ AUTH GUARD - Token verified, payload:', { id: payload?.id });

      if (!payload || !payload.id) {
        console.log('[AuthGuard] ❌ Invalid token payload:', payload);
        throw new UnauthorizedException("Token noto'g'ri format.");
      }

      const { data: foundUser } = await this.userService.findOneById(
        payload.id,
      );
      // console.log('👤 AUTH GUARD - User lookup result:', foundUser ? 'Found' : 'Not found');

      if (!foundUser) {
        console.log('[AuthGuard] ❌ User not found for id:', payload.id);
        throw new UnauthorizedException("Foydalanuvchi topilmadi.");
      }

      request["user"] = foundUser;
      console.log('[AuthGuard] ✅ Authentication successful for user:', foundUser.id);
    } catch (err) {
      if (err instanceof TokenExpiredError) {
        console.log('[AuthGuard] ❌ Token expired for URL:', request.url);
        throw new UnauthorizedException("Token muddati tugagan. Iltimos, qayta kirib turing.");
      }
      if (err instanceof UnauthorizedException) {
        console.log('[AuthGuard] ❌ Unauthorized error:', err.message);
        throw err; // Re-throw if already UnauthorizedException
      }
      console.log('[AuthGuard] ❌ Token verification error:', err?.message || err);
      console.log('[AuthGuard] ❌ Error type:', err.constructor.name);
      throw new UnauthorizedException("Token noto'g'ri yoki yaroqsiz. Iltimos, qayta kirib turing.");
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(" ") ?? [];
    return type === "Bearer" ? token : undefined;
  }
}
