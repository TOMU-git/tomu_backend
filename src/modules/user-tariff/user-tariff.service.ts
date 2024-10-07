import { Inject, Injectable } from '@nestjs/common';
import { CreateUserTariffDto } from './dto/create-user-tariff.dto';
import { UpdateUserTariffDto } from './dto/update-user-tariff.dto';
import { IUserTariffService } from './interfaces/user-tariff.service';
import { IUserTariffRepository } from './interfaces/user-tariff.repository';
import { ResData } from 'src/lib/resData';
import { UserTariff } from './entities/user-tariff.entity';
import { IUserService } from '../user/interfaces/user.service';
import { ITariffService } from '../tariff/interface/tariff.service';

@Injectable()
export class UserTariffService implements IUserTariffService {
  constructor(
    @Inject('IUserTariffRepository')
    private readonly userTariffRepository: IUserTariffRepository,
    @Inject('IUserService') private readonly userService: IUserService,
    @Inject('ITariffService') private readonly tariffService: ITariffService,
  ) {}

  // CREATE
  async create(
    createUserTariffDto: CreateUserTariffDto,
  ): Promise<ResData<UserTariff>> {
    const { data: foundUser } = await this.userService.findOne(
      createUserTariffDto.userId,
    );
    const { data: foundTariff } = await this.tariffService.findOne(
      createUserTariffDto.tariffId,
    );

    let newUserTariff = new UserTariff();
    newUserTariff = Object.assign(newUserTariff, createUserTariffDto);

    newUserTariff.user = foundUser;
    newUserTariff.tariff = foundTariff;

    const purchaseDate = new Date();
    // console.log('purchaseDate', purchaseDate);

    newUserTariff.purchaseDate = purchaseDate;

    const date = new Date(newUserTariff.purchaseDate);
    const expirationDate = date.setMonth(
      date.getMonth() + foundTariff.duration,
    );

    console.log('date=>', date);
    console.log('getMonth=>', date.getMonth());
    

    // console.log(expirationDate);
    // console.log('newUserTariff', newUserTariff);
    throw new Error('Method not implemented.');
  }

  // READ
  async findAll(): Promise<ResData<UserTariff[]>> {
    throw new Error('Method not implemented.');
  }
  async findOne(id: number): Promise<ResData<UserTariff>> {
    throw new Error('Method not implemented.');
  }

  // UPDATE
  async update(
    id: number,
    updateUserTariffDto: UpdateUserTariffDto,
  ): Promise<ResData<UserTariff>> {
    throw new Error('Method not implemented.');
  }

  // DELETE
  async delete(id: number): Promise<ResData<UserTariff>> {
    throw new Error('Method not implemented.');
  }
}
