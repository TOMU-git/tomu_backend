import { Injectable } from "@nestjs/common";
import { ID } from "src/common/types/type";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { IHomePageRepository } from "./interfaces/home-page.repository";
import { HomePage } from "./entities/home-page.entity";

@Injectable()
export class HomePageRepository implements IHomePageRepository {
  constructor(
    @InjectRepository(HomePage)
    private homePageRepository: Repository<HomePage>,
  ) {}

  async create(dto: HomePage): Promise<HomePage> {
    const newHomePage = await this.homePageRepository.create(dto);
    await this.homePageRepository.save(newHomePage);
    return newHomePage;
  }

  async findAll(): Promise<Array<HomePage>> {
    return await this.homePageRepository.find();
  }

  async update(entity: HomePage): Promise<HomePage> {
    return await this.homePageRepository.save(entity);
  }

  async delete(entity: HomePage): Promise<HomePage> {
    return await this.homePageRepository.remove(entity);
  }

  async findById(id: ID): Promise<HomePage | null> {
    return await this.homePageRepository.findOneBy({ id });
  }

  async findOneByName(title: string): Promise<HomePage | null> {
    return await this.homePageRepository.findOneBy({ title });
  }
}
