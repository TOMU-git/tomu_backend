import { Inject, Injectable } from "@nestjs/common";
import { CreateHomePageDto } from "./dto/create-home-page.dto";
import { HomePage } from "./entities/home-page.entity";
import { IHomePageRepository } from "./interfaces/home-page.repository";
import { ResData } from "src/lib/resData";
import { ID } from "src/common/types/type";
import { IHomePageService } from "./interfaces/home-page.service";
import {
  HomePageAlreadyExistException,
  HomePageNotFoundException,
} from "./exception/home-page.exception";
import { IFileService } from "../file/interfaces/file.service";

@Injectable()
export class HomePageService implements IHomePageService {
  constructor(
    @Inject("IHomePageRepository")
    private readonly homePageRepository: IHomePageRepository,

    @Inject("IFileService")
    private readonly fileService: IFileService,
  ) {}

  async create(
    createHomePageDto: CreateHomePageDto,
  ): Promise<ResData<HomePage>> {
    const foundData = await this.homePageRepository.findOneByName(
      createHomePageDto.title,
    );
    if (foundData) {
      throw new HomePageAlreadyExistException();
    }

    const newHomePage = new HomePage();
    Object.assign(newHomePage, createHomePageDto);
    const newData = await this.homePageRepository.create(newHomePage);

    return new ResData<HomePage>(
      "Home Page created successfully",
      201,
      newData,
    );
  }

  async findAll(): Promise<ResData<Array<HomePage>>> {
    const data = await this.homePageRepository.findAll();

    return new ResData<Array<HomePage>>("ok", 200, data);
  }

  async findOneById(id: ID): Promise<ResData<HomePage>> {
    const foundData = await this.homePageRepository.findById(id);
    if (!foundData) {
      throw new HomePageNotFoundException();
    }

    return new ResData<HomePage>("ok", 200, foundData);
  }

  async update(
    id: ID,
    updateHomePageDto: CreateHomePageDto,
  ): Promise<ResData<HomePage>> {
    const { data: foundData } = await this.findOneById(id);
    const updatedData = Object.assign(foundData, updateHomePageDto);
    const data = await this.homePageRepository.update(updatedData);

    return new ResData<HomePage>("Home Page updated successfully", 200, data);
  }

  async delete(id: ID): Promise<ResData<HomePage>> {
    const { data: foundData } = await this.findOneById(id);
    const data = await this.homePageRepository.delete(foundData);

    return new ResData<HomePage>("Home Page deleted successfully", 200, data);
  }
}
