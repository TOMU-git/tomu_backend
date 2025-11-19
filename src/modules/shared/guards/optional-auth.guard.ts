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
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      // If no token, just continue without setting user
      return true;
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: config.jwtSecretKey,
      });

      if (payload && payload.id) {
        const { data: foundUser } = await this.userService.findOneById(
          payload.id,
        );

        if (foundUser) {
          request["user"] = foundUser;
        }
      }
    } catch (err) {
      // Silently ignore token errors and continue without user
    }

    return true;
  }

    private extractTokenFromHeader(request: Request): string | undefined {
        const [type, token] = request.headers.authorization?.split(" ") ?? [];
        return type === "Bearer" ? token : undefined;
    }
}

