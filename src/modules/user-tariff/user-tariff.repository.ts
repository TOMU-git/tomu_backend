import { InjectRepository } from "@nestjs/typeorm";
import { IUserTariffRepository } from "./interfaces/user-tariff.repository";
import { UserTariff } from "./entities/user-tariff.entity";
import { Repository } from "typeorm";

export class UserTariffRepository implements IUserTariffRepository {
  constructor(
    @InjectRepository(UserTariff)
    private readonly userTariffRepository: Repository<UserTariff>,
  ) {}

  //   CREATE
  async insert(entity: UserTariff): Promise<UserTariff> {
    return this.userTariffRepository.save(entity);
  }

  // READ
  async findAll(): Promise<Array<UserTariff>> {
    return this.userTariffRepository.find();
  }

  async findByTariffIdAndUserId(tariffId: number, userId: number): Promise<UserTariff> {
    return await this.userTariffRepository.findOneBy({ tariffId, userId });
  }

  async findByUserId(userId: number): Promise<UserTariff[]> {
    return await this.userTariffRepository.find({where: {userId}})
  }

  async findOneByTariffId(tarifId: number): Promise<UserTariff> {
    return await this.userTariffRepository.findOneBy({ tariffId: tarifId });
  }
  async findOneById(id: number): Promise<UserTariff> {
    return this.userTariffRepository.findOneBy({ id });
  }

  // UPDATE
  async update(entity: UserTariff): Promise<UserTariff> {
    return this.userTariffRepository.save(entity);
  }

  // DELETE
  async delete(entity: UserTariff): Promise<any> {
    const entityId = entity.id;
    const deleted = await this.userTariffRepository.remove(entity);
    deleted.id = entityId;
    return deleted;
  }
}
