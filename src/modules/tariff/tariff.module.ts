import { Module } from '@nestjs/common';
import { TariffService } from './tariff.service';
import { TariffController } from './tariff.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tariff } from './entities/tariff.entity';
import { TariffRepository } from './tariff.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Tariff])],
  controllers: [TariffController],
  providers: [
    { provide: 'ITariffService', useClass: TariffService },
    { provide: 'ITariffRepository', useClass: TariffRepository },
  ],
})
export class TariffModule {}
