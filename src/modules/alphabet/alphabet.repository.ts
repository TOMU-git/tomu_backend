import { Injectable } from "@nestjs/common";
import { ID } from "src/common/types/type";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Alphabet } from "./entities/alphabet.entity";
import { IAlphabetRepository } from "./interfaces/alphabet.repository";

@Injectable()
export class AlphabetRepository implements IAlphabetRepository {
  constructor(
    @InjectRepository(Alphabet)
    private alphabetRepository: Repository<Alphabet>,
  ) {}

  async create(dto: Alphabet): Promise<Alphabet> {
    const newAlphabet = await this.alphabetRepository.create(dto);
    await this.alphabetRepository.save(newAlphabet);
    return newAlphabet;
  }

  async findAll(): Promise<Array<Alphabet>> {
    // `order` maydoni bo'yicha oshib boruvchi tartibda qaytarish
    return await this.alphabetRepository.find({
      order: { order: "ASC" }, // Bu yerda 'ASC' oshib boruvchi tartibni bildiradi
    });
  }

  async update(entity: Alphabet): Promise<Alphabet> {
    return await this.alphabetRepository.save(entity);
  }

  async delete(entity: Alphabet): Promise<Alphabet> {
    return await this.alphabetRepository.remove(entity);
  }

  async findById(id: ID): Promise<Alphabet | null> {
    return await this.alphabetRepository.findOne({
      where: { id },
      relations: ['course'], // Course munosabatini yuklash
    });
  }

  async findOneByOrder(order: number, courseId: ID): Promise<Alphabet | null> {
    return await this.alphabetRepository.findOne({
      where: {
        order: order,
        course: { id: courseId },
      },
    });
  }

  async getAlphabetsByCourseId(courseId: ID): Promise<Alphabet[]> {
    return await this.alphabetRepository.find({
      where: { course: { id: courseId } },
      order: { order: "ASC" }, // `order` maydoni bo'yicha tartiblash
    });
  }
}
