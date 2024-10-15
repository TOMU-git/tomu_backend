import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { JwtModule } from '@nestjs/jwt';
import { config } from 'src/common/config';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: config.jwtSecretKey,
      signOptions: { expiresIn: config.jwtExpiredIn },
    }),
    UserModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
