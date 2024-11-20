import { UserTariff } from "../entities/user-tariff.entity";

export interface IUserTariffRepository {
  insert(entity: UserTariff): Promise<UserTariff>;
  findAll(): Promise<Array<UserTariff>>;
  findOneById(id: number): Promise<UserTariff>;
  findByUserId(userId: number): Promise<UserTariff[]>;
  findByTariffIdAndUserId(tariffId: number, userId: number): Promise<UserTariff>;
  update(entity: UserTariff): Promise<UserTariff>;
  delete(entity: UserTariff): Promise<any>;
  findOneByTariffId(id: number): Promise<UserTariff>;
}
