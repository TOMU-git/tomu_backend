import { Inject, Injectable } from '@nestjs/common';
import { CreateTariffDto } from './dto/create-tariff.dto';
import { UpdateTariffDto } from './dto/update-tariff.dto';
import { ITariffService } from './interface/tariff.service';
import { ITariffRepository } from './interface/tariff.repository';
import { ResData } from 'src/lib/resData';
import { Tariff } from './entities/tariff.entity';
import { TariffNotFoundException } from './exception/tariff.exception';

@Injectable()
export class TariffService implements ITariffService {
  constructor(
    @Inject('ITariffRepository')
    private readonly tariffRepository: ITariffRepository,
  ) {}

  // CREATE
  async create(createTariffDto: CreateTariffDto): Promise<ResData<Tariff>> {
    let newTariff = new Tariff();
    newTariff = Object.assign(newTariff, createTariffDto);

    const createdTariff = await this.tariffRepository.insert(newTariff);

    return new ResData<Tariff>(
      'Tariff created successfully',
      201,
      createdTariff,
    );
  }

  // READ
  async findAll(): Promise<ResData<Tariff[]>> {
    const data = await this.tariffRepository.findAll();
    return new ResData<Tariff[]>('success', 200, data);
  }
  async findOne(id: number): Promise<ResData<Tariff>> {
    const foundTariff = await this.tariffRepository.findOneById(id);

    if (!foundTariff) {
      throw new TariffNotFoundException();
    }

    return new ResData<Tariff>('success', 200, foundTariff);
  }

  // UPDATE
  async update(
    id: number,
    updateTariffDto: UpdateTariffDto,
  ): Promise<ResData<Tariff>> {
    const { data: foundTariff } = await this.findOne(id);
    const editedTariff = Object.assign(foundTariff, updateTariffDto);
    const updatedTariff = await this.tariffRepository.update(editedTariff);

    return new ResData<Tariff>(
      'Tariff updated successfully',
      200,
      updatedTariff,
    );
  }

  // DELETE
  async delete(id: number): Promise<ResData<Tariff>> {
    await this.findOne(id);
    const deletedTariff = await this.tariffRepository.delete(id);
    return new ResData<Tariff>(
      'Tariff deleted successfully',
      200,
      deletedTariff,
    );
  }
}
