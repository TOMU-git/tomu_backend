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
  async findOneById(id: number): Promise<UserTariff> {
    return this.userTariffRepository.findOneBy({ id });
  }

  // UPDATE
  async update(entity: UserTariff): Promise<UserTariff> {
    return this.userTariffRepository.save(entity);
  }

  // DELETE
  async delete(id: number): Promise<UserTariff> {
    const foundUserTariff = await this.findOneById(id);
    await this.userTariffRepository.delete({ id });
    return foundUserTariff;
  }
}
