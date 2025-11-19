import {
    CanActivate,
    ExecutionContext,
    Inject,
    Injectable,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { config } from "../../../common/config/index";
import { IUserService } from "../../user/interfaces/user.service";

@Injectable()
export class OptionalAuthGuard implements CanActivate {
    constructor(
        @Inject("IUserService")
        private userService: IUserService,
        private jwtService: JwtService,
    ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    console.log('[OptionalAuthGuard] Authorization header:', authHeader ? `${authHeader.substring(0, 20)}...` : 'NOT PRESENT');
    
    const token = this.extractTokenFromHeader(request);
    console.log('[OptionalAuthGuard] Extracted token:', token ? `${token.substring(0, 20)}...` : 'NULL');

    if (!token) {
      // If no token, just continue without setting user
      console.log('[OptionalAuthGuard] No token, continuing without user');
      return true;
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: config.jwtSecretKey,
      });

      console.log('[OptionalAuthGuard] Token verified, payload ID:', payload?.id);

      if (payload && payload.id) {
        const { data: foundUser } = await this.userService.findOneById(
          payload.id,
        );

        console.log('[OptionalAuthGuard] User found:', foundUser ? `ID: ${foundUser.id}` : 'NULL');

        if (foundUser) {
          request["user"] = foundUser;
          console.log('[OptionalAuthGuard] User set to request.user');
        } else {
          console.log('[OptionalAuthGuard] User not found in database');
        }
      }
    } catch (err) {
      // Silently ignore token errors and continue without user
      console.log('[OptionalAuthGuard] Token verification error:', err?.message || err);
    }

    return true;
  }

    private extractTokenFromHeader(request: Request): string | undefined {
        const authHeader = request.headers.authorization;
        if (!authHeader) {
            console.log('[OptionalAuthGuard.extractTokenFromHeader] No authorization header');
            return undefined;
        }
        
        const [type, token] = authHeader.split(" ");
        console.log('[OptionalAuthGuard.extractTokenFromHeader] Type:', type, 'Token length:', token?.length || 0);
        
        if (type !== "Bearer") {
            console.log('[OptionalAuthGuard.extractTokenFromHeader] Invalid type, expected Bearer, got:', type);
            return undefined;
        }
        
        if (!token) {
            console.log('[OptionalAuthGuard.extractTokenFromHeader] No token after Bearer');
            return undefined;
        }
        
        return token;
    }
}

