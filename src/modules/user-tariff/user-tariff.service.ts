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
import { ID } from "src/common/types/type";

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

    newUserTariff.userId = foundUser.id;
    newUserTariff.tariffId = foundTariff.id;

    // Boshlanish sanasini hozirgi sana deb belgilash
    const startedAt = new Date();
    newUserTariff.startedAt = startedAt;

    // Tugash sanasini hisoblash uchun startedAt ga duration (kunlarda) qo'shish
    const endDate = new Date(newUserTariff.startedAt);
    endDate.setDate(endDate.getDate() + foundTariff.duration);

    newUserTariff.endedAt = endDate;

    const createdUserTariff =
      await this.userTariffRepository.insert(newUserTariff);

    return new ResData<UserTariff>(
      "User-Tariff created successfully",
      201,
      createdUserTariff,
    );
  }

  // READ
  async findAll(): Promise<ResData<Array<UserTariff>>> {
    const data = await this.userTariffRepository.findAll();
    return new ResData<Array<UserTariff>>("success", 200, data);
  }

  async findAllByUserId(userId: number): Promise<ResData<UserTariff[]>> {
    await this.userService.findOneById(userId);
    const foundUserTariffs = await this.userTariffRepository.findByUserId(userId);
    return new ResData<UserTariff[]>("success", 200, foundUserTariffs);
  }

  async findOne(id: number): Promise<ResData<UserTariff>> {
    const foundUserTariff = await this.userTariffRepository.findOneById(id);

    if (!foundUserTariff) {
      throw new UserTariffNotFoundException();
    }

    return new ResData<UserTariff>("success", 200, foundUserTariff);
  }

  async update(id: ID, dto: UpdateUserTariffDto): Promise<ResData<UserTariff>> {
    const { data: foundUser } = await this.userService.findOneById(dto.userId);
    const { data: foundTariff } = await this.tariffService.findOne(
      dto.tariffId,
    );
    const { data: foundUserTariff } = await this.findOne(id);

    let updatedTariff = new UserTariff();
    updatedTariff = Object.assign(foundUserTariff, dto);

    const data = await this.userTariffRepository.update(updatedTariff);

    return new ResData<UserTariff>(
      "User-Tariff created successfully",
      201,
      data,
    );
  }

  // DELETE
  async remove(id: number): Promise<ResData<UserTariff>> {
    const { data: foundUserTariff } = await this.findOne(id);
    const deletedUserTariff = await this.userTariffRepository.delete(foundUserTariff);
    return new ResData<UserTariff>(
      "User Tariff deleted successfully",
      200,
      deletedUserTariff,
    );
  }
}
