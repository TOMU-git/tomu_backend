import { InjectRepository } from '@nestjs/typeorm';
import { ITariffRepository } from './interface/tariff.repository';
import { Tariff } from './entities/tariff.entity';
import { Repository } from 'typeorm';

export class TariffRepository implements ITariffRepository {
  constructor(
    @InjectRepository(Tariff) private tariffRepository: Repository<Tariff>,
  ) {}
  async insert(entity: Tariff): Promise<Tariff> {
    return this.tariffRepository.save(entity);
  }
  async findAll(): Promise<Tariff[]> {
    return this.tariffRepository.find();
  }
  async findOneById(id: number): Promise<Tariff> {
    return this.tariffRepository.findOneBy({ id });
  }
  async update(entity: Tariff): Promise<Tariff> {
    return this.tariffRepository.save(entity);
  }
  async delete(id: number): Promise<Tariff> {
    const foundTariff = await this.findOneById(id);
    await this.tariffRepository.delete(id);
    return foundTariff;
  }
}
