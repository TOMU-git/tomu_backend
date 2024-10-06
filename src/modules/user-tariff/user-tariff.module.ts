import { Module } from '@nestjs/common';
import { UserTariffService } from './user-tariff.service';
import { UserTariffController } from './user-tariff.controller';
import { UserTariffRepository } from './user-tariff.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserTariff } from './entities/user-tariff.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserTariff])],
  controllers: [UserTariffController],
  providers: [
    { provide: 'IUserTariffService', useValue: UserTariffService },
    { provide: 'IUserTariffRepository', useClass: UserTariffRepository },
  ],
})
export class UserTariffModule {}
