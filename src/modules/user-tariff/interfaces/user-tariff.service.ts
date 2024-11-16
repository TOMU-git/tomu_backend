import { ResData } from "src/lib/resData";
import { UserTariff } from "../entities/user-tariff.entity";
import { UpdateUserTariffDto } from "../dto/update-user-tariff.dto";
import { CreateUserTariffDto } from "../dto/create-user-tariff.dto";
import { ID } from "src/common/types/type";

export interface IUserTariffService {
  create(
    createUserTariffDto: CreateUserTariffDto,
  ): Promise<ResData<UserTariff>>;

  findAll(): Promise<ResData<Array<UserTariff>>>;

  findAllByUserId(userId: number): Promise<ResData<UserTariff[]>>;

  findOne(id: ID): Promise<ResData<UserTariff>>;

  remove(id: ID): Promise<ResData<UserTariff>>;
  update(id: ID, dto: UpdateUserTariffDto): Promise<ResData<UserTariff>>;
}
