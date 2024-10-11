import { UserTariff } from '../entities/user-tariff.entity';

export interface IUserTariffRepository {
  insert(entity: UserTariff): Promise<UserTariff>;
  findAll(): Promise<UserTariff[]>;
  findOneById(id: number): Promise<UserTariff>;
  update(entity: UserTariff): Promise<UserTariff>;
  delete(id: number): Promise<UserTariff>;
}
