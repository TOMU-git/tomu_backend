import { Inject, Injectable } from "@nestjs/common";
import { CreateGrammarDto } from "./dto/create-grammar.dto";
import { UpdateGrammarDto } from "./dto/update-grammar.dto";
import { Grammar } from "./entities/grammar.entity";
import { IGrammarRepository } from "./interfaces/grammar.repository";
import { ResData } from "src/lib/resData";
import { ID } from "src/common/types/type";
import { IGrammarService } from "./interfaces/grammar.service";
import {
  GrammarAlreadyExistException,
  GrammarNotFoundException,
  GrammarsNotFoundByCourseId,
} from "./exception/grammar.exception";

@Injectable()
export class GrammarService implements IGrammarService {
  constructor(
    @Inject("IGrammarRepository")
    private readonly grammarRepository: IGrammarRepository,
  ) {}

  async create(createGrammarDto: CreateGrammarDto): Promise<ResData<Grammar>> {
    // Qo'shilayotgan grammarnı tekshirish
    const foundData = await this.grammarRepository.findOneByName(
      createGrammarDto.grammarText,
    );
    if (foundData) {
      throw new GrammarAlreadyExistException();
    }

    const newGrammar = new Grammar();
    Object.assign(newGrammar, createGrammarDto);
    const newData = await this.grammarRepository.create(newGrammar);

    return new ResData<Grammar>("Grammar created successfully", 201, newData);
  }

  async findGrammarByCourseId(id: number): Promise<ResData<Grammar[]>> {
    const foundGrammars =
      await this.grammarRepository.findGrammarsByCourseId(id);
    if (foundGrammars.length === 0) {
      throw new GrammarsNotFoundByCourseId();
    }
    return new ResData<Grammar[]>(
      "Grammars found successfully",
      200,
      foundGrammars,
    );
  }

  async findAll(): Promise<ResData<Array<Grammar>>> {
    const data = await this.grammarRepository.findAll();
    if (data.length === 0) {
      return new ResData<Grammar[]>("Not any grammar yet", 200, data);
    }
    return new ResData<Array<Grammar>>("ok", 200, data);
  }

  async findOneById(id: ID): Promise<ResData<Grammar>> {
    const foundData = await this.grammarRepository.findById(id);
    if (!foundData) {
      throw new GrammarNotFoundException();
    }
    return new ResData<Grammar>("ok", 200, foundData);
  }

  async update(
    id: ID,
    updateGrammarDto: UpdateGrammarDto,
  ): Promise<ResData<Grammar>> {
    const { data: foundData } = await this.findOneById(id);
    const updatedData = Object.assign(foundData, updateGrammarDto);
    const data = await this.grammarRepository.update(updatedData);

    return new ResData<Grammar>("Grammar updated successfully", 200, data);
  }

  async delete(id: ID): Promise<ResData<Grammar>> {
    const { data: foundData } = await this.findOneById(id);
    const data = await this.grammarRepository.delete(foundData);

    return new ResData<Grammar>("Grammar deleted successfully", 200, data);
  }
}
