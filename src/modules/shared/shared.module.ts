import { Module } from "@nestjs/common";
import { UserService } from "../user/user.service";
import { UserRepository } from "../user/user.repository";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../user/entities/user.entity";
import { JwtModule } from "@nestjs/jwt";
import { config } from "src/common/config";
import { OptionalAuthGuard } from "./guards/optional-auth.guard";

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: config.jwtSecretKey,
      signOptions: { expiresIn: config.jwtExpiredIn },
    }),
    TypeOrmModule.forFeature([User]),
  ],
  controllers: [],
  providers: [
    { provide: "IUserService", useClass: UserService },
    { provide: "IUserRepository", useClass: UserRepository },
    OptionalAuthGuard,
  ],
  exports: [
    { provide: "IUserService", useClass: UserService },
    { provide: "IUserRepository", useClass: UserRepository },
    OptionalAuthGuard,
  ],
})
export class SharedModule {}
