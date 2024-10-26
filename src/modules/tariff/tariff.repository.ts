import { InjectRepository } from "@nestjs/typeorm";
import { ITariffRepository } from "./interface/tariff.repository";
import { Tariff } from "./entities/tariff.entity";
import { Repository } from "typeorm";

export class TariffRepository implements ITariffRepository {
  constructor(
    @InjectRepository(Tariff) private tariffRepository: Repository<Tariff>,
  ) {}
  async insert(entity: Tariff): Promise<Tariff> {
    return this.tariffRepository.save(entity);
  }
  async findAll(): Promise<Tariff[]> {
    return this.tariffRepository.find({
      relations: ["course"],
    });
  }

  async findOneById(id: number): Promise<Tariff> {
    return this.tariffRepository.findOneBy({ id });
  }

  async findOneByName(title: string): Promise<Tariff | null> {
    return await this.tariffRepository.findOneBy({ name: title });
  }

  async update(entity: Tariff): Promise<Tariff> {
    return this.tariffRepository.save(entity);
  }
  async delete(id: number): Promise<Tariff> {
    const foundTariff = await this.findOneById(id);
    await this.tariffRepository.delete(id);
    return foundTariff;
  }

  // Course ID orqali tariflarni topish metodi
  async findByCourseId(courseId: number): Promise<Tariff[]> {
    return await this.tariffRepository.find({
      where: {
        course: {
          id: courseId, // `course` obyekti orqali `id` ga murojaat qiling
        },
      },
      relations: ["course"], // Kurs bilan bog'liqlikni ko'rsatish
    });
  }
}
