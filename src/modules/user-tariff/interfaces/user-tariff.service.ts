import { ResData } from 'src/lib/resData';
import { UserTariff } from '../entities/user-tariff.entity';
import { UpdateUserTariffDto } from '../dto/update-user-tariff.dto';
import { CreateUserTariffDto } from '../dto/create-user-tariff.dto';

export interface IUserTariffService {
  create(
    createUserTariffDto: CreateUserTariffDto,
  ): Promise<ResData<UserTariff>>;

  findAll(): Promise<ResData<UserTariff[]>>;

  findOne(id: number): Promise<ResData<UserTariff>>;

  update(
    id: number,
    updateUserTariffDto: UpdateUserTariffDto,
  ): Promise<ResData<UserTariff>>;

  delete(id: number): Promise<ResData<UserTariff>>;
}
