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
  ) { }

  async create(entity: Grammar): Promise<Grammar> {
    return await this.grammarRepository.save(entity);
  }

  async findAll(): Promise<Array<Grammar>> {
    return await this.grammarRepository.find({
      select: ["id", "title"], order: { createdAt: 'ASC' }
    });
  }

  async findGrammarsByCourseId(id: number): Promise<Grammar[]> {
    return await this.grammarRepository.find({
      where: { courseId: id },
      order: { order: "ASC" }, // Changed from createdAt to order
    });
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

  async findOneByOrder(order: number, courseId: ID): Promise<Grammar | null> {
    return await this.grammarRepository.findOne({
      where: {
        order: order,
        courseId: courseId,
      },
    });
  }
}
