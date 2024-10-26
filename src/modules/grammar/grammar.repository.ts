import { Injectable } from "@nestjs/common";
import { ID } from "src/common/types/type";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Grammar } from "./entities/grammar.entity";
import { IGrammarRepository } from "./interfaces/grammar.repository";

@Injectable()
export class GrammarRepository implements IGrammarRepository {
  constructor(
    @InjectRepository(Grammar)
    private grammarRepository: Repository<Grammar>,
  ) {}

  async create(dto: Grammar): Promise<Grammar> {
    const newGrammar = await this.grammarRepository.create(dto);
    await this.grammarRepository.save(newGrammar);
    return newGrammar;
  }

  async findAll(): Promise<Array<Grammar>> {
    return await this.grammarRepository.find();
  }

  async findGrammarsByCourseId(id: number): Promise<Grammar[]> {
    const grammars = await this.grammarRepository.find({
      where: { course: { id } }, // Course ni id bilan qidirish
    });
    return grammars;
  }

  async update(entity: Grammar): Promise<Grammar> {
    return await this.grammarRepository.save(entity);
  }

  async delete(entity: Grammar): Promise<Grammar> {
    return await this.grammarRepository.remove(entity);
  }

  async findById(id: ID): Promise<Grammar | null> {
    return await this.grammarRepository.findOneBy({ id });
  }

  async findOneByName(title: string): Promise<Grammar | null> {
    return await this.grammarRepository.findOneBy({ grammarText: title });
  }
}
