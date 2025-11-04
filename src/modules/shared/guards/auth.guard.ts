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

    if (!token) {
      console.log('[AuthGuard] ❌ Token not found in Authorization header');
      throw new UnauthorizedException("Token topilmadi. Iltimos, autentifikatsiya qiling.");
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: config.jwtSecretKey,
      });

      if (!payload || !payload.id) {
        console.log('[AuthGuard] ❌ Invalid token payload:', payload);
        throw new UnauthorizedException("Token noto'g'ri format.");
      }

      const { data: foundUser } = await this.userService.findOneById(
        payload.id,
      );

      if (!foundUser) {
        console.log('[AuthGuard] ❌ User not found for id:', payload.id);
        throw new UnauthorizedException("Foydalanuvchi topilmadi.");
      }

      request["user"] = foundUser;
      console.log('[AuthGuard] ✅ Authentication successful for user:', foundUser.id);
    } catch (err) {
      if (err instanceof TokenExpiredError) {
        console.log('[AuthGuard] ❌ Token expired');
        throw new UnauthorizedException("Token muddati tugagan. Iltimos, qayta kirib turing.");
      }
      if (err instanceof UnauthorizedException) {
        throw err; // Re-throw if already UnauthorizedException
      }
      console.log('[AuthGuard] ❌ Token verification error:', err?.message || err);
      throw new UnauthorizedException("Token noto'g'ri yoki yaroqsiz. Iltimos, qayta kirib turing.");
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(" ") ?? [];
    return type === "Bearer" ? token : undefined;
  }
}
