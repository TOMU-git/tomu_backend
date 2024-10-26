import { Inject, Injectable } from "@nestjs/common";
import { CreateUserTariffDto } from "./dto/create-user-tariff.dto";
import { UpdateUserTariffDto } from "./dto/update-user-tariff.dto";
import { IUserTariffService } from "./interfaces/user-tariff.service";
import { IUserTariffRepository } from "./interfaces/user-tariff.repository";
import { ResData } from "src/lib/resData";
import { UserTariff } from "./entities/user-tariff.entity";
import { IUserService } from "../user/interfaces/user.service";
import { ITariffService } from "../tariff/interface/tariff.service";
import { UserTariffNotFoundException } from "./exception/user-tariff.exception";

@Injectable()
export class UserTariffService implements IUserTariffService {
  constructor(
    @Inject("IUserTariffRepository")
    private readonly userTariffRepository: IUserTariffRepository,
    @Inject("IUserService") private readonly userService: IUserService,
    @Inject("ITariffService") private readonly tariffService: ITariffService,
  ) {}

  // CREATE
  async create(
    createUserTariffDto: CreateUserTariffDto,
  ): Promise<ResData<UserTariff>> {
    const { data: foundUser } = await this.userService.findOneById(
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
    newUserTariff.purchaseDate = purchaseDate;

    const date = new Date(newUserTariff.purchaseDate);
    date.setMonth(date.getMonth() + foundTariff.duration);

    newUserTariff.expirationDate = date;

    const createdUserTariff =
      await this.userTariffRepository.insert(newUserTariff);

    return new ResData<UserTariff>(
      "User-Tariff created successfully",
      201,
      createdUserTariff,
    );
  }

  // READ
  async findAll(): Promise<ResData<UserTariff[]>> {
    const data = await this.userTariffRepository.findAll();
    return new ResData<UserTariff[]>("success", 200, data);
  }

  async findOne(id: number): Promise<ResData<UserTariff>> {
    const foundUserTariff = await this.userTariffRepository.findOneById(id);

    if (!foundUserTariff) {
      throw new UserTariffNotFoundException();
    }

    return new ResData<UserTariff>("success", 200, foundUserTariff);
  }

  // DELETE
  async delete(id: number): Promise<ResData<UserTariff>> {
    await this.findOne(id);
    const deletedUserTariff = await this.userTariffRepository.delete(id);
    return new ResData<UserTariff>(
      "User Tariff deleted successfully",
      200,
      deletedUserTariff,
    );
  }
}
