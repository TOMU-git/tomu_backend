import { UserTariff } from "../entities/user-tariff.entity";

export interface IUserTariffRepository {
  insert(entity: UserTariff): Promise<UserTariff>;
  findAll(): Promise<Array<UserTariff>>;
  findOneById(id: number): Promise<UserTariff>;
  findByUserId(userId: number): Promise<UserTariff[]>;
  update(entity: UserTariff): Promise<UserTariff>;
  delete(id: number): Promise<UserTariff>;
}
