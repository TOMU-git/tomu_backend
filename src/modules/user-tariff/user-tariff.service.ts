import { Inject, Injectable } from '@nestjs/common';
import { CreateUserTariffDto } from './dto/create-user-tariff.dto';
import { UpdateUserTariffDto } from './dto/update-user-tariff.dto';
import { IUserTariffService } from './interfaces/user-tariff.service';
import { IUserTariffRepository } from './interfaces/user-tariff.repository';
import { ResData } from 'src/lib/resData';
import { UserTariff } from './entities/user-tariff.entity';

@Injectable()
export class UserTariffService implements IUserTariffService {
  constructor(
    @Inject('IUserTariffRepository')
    private readonly userTariffRepository: IUserTariffRepository,
  ) {}

  // CREATE
  create(
    createUserTariffDto: CreateUserTariffDto,
  ): Promise<ResData<UserTariff>> {
    throw new Error('Method not implemented.');
  }

  // READ
  findAll(): Promise<ResData<UserTariff[]>> {
    throw new Error('Method not implemented.');
  }
  findOne(id: number): Promise<ResData<UserTariff>> {
    throw new Error('Method not implemented.');
  }

  // UPDATE
  update(
    id: number,
    updateUserTariffDto: UpdateUserTariffDto,
  ): Promise<ResData<UserTariff>> {
    throw new Error('Method not implemented.');
  }

  // DELETE
  delete(id: number): Promise<ResData<UserTariff>> {
    throw new Error('Method not implemented.');
  }
}
