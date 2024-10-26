import { ResData } from "src/lib/resData";
import { Tariff } from "../entities/tariff.entity";
import { UpdateTariffDto } from "../dto/update-tariff.dto";
import { CreateTariffDto } from "../dto/create-tariff.dto";

export interface ITariffService {
  create(createTariffDto: CreateTariffDto): Promise<ResData<Tariff>>;

  findAll(): Promise<ResData<Tariff[]>>;

  findOne(id: number): Promise<ResData<Tariff>>;

  update(
    id: number,
    updateTariffDto: UpdateTariffDto,
  ): Promise<ResData<Tariff>>;

  delete(id: number): Promise<ResData<Tariff>>;

  findByCourseId(courseId: number): Promise<ResData<Tariff[]>>;
}
