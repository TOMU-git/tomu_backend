import { Tariff } from "../entities/tariff.entity";

export interface ITariffRepository {
  insert(entity: Tariff): Promise<Tariff>;
  findAll(): Promise<Array<Tariff>>;
  findOneById(id: number): Promise<Tariff>;
  update(entity: Tariff): Promise<Tariff>;
  delete(id: number): Promise<Tariff>;
  findOneByName(title: string): Promise<Tariff | null>;
  findByCourseId(courseId: number): Promise<Tariff[]>;
}
