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
import { ICourseRepository } from "../course/interfaces/course.repository";
import { CourseNotFoundException } from "../course/exception/course.exception";
import { VimeoService } from "../lesson/vimeo.service";

@Injectable()
export class GrammarService implements IGrammarService {
  constructor(
    @Inject("IGrammarRepository")
    private readonly grammarRepository: IGrammarRepository,

    @Inject("ICourseRepository")
    private readonly courseRepository: ICourseRepository,

    private readonly vimeoService: VimeoService,
  ) {}

  async create(
    createGrammarDto: CreateGrammarDto,
    file: Express.Multer.File,
  ): Promise<ResData<Grammar>> {
    // Qo'shilayotgan grammarnı nomiga ko'ra tekshirish
       // Kurs mavjudligini tekshirish
    const course = await this.courseRepository.findById(
      createGrammarDto.courseId,
    );
    if (!course) {
      throw new CourseNotFoundException();
    }

    // Video yuklash
    const { videoUrl, duration } = await this.vimeoService.uploadVideo(
      file.buffer,
      createGrammarDto.title,
      "Grammar video",
    );

    // Yangi grammarnı yaratish
    const newGrammar = new Grammar();
    Object.assign(newGrammar, {
      ...createGrammarDto,
      course,
      videoUrl,
      mimetype: file.mimetype,
      size: file.size,
      duration,
    });

    const savedGrammar = await this.grammarRepository.create(newGrammar);

    return new ResData<Grammar>(
      "Grammar created successfully",
      201,
      savedGrammar,
    );
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
    file?: Express.Multer.File,
  ): Promise<ResData<Grammar>> {
    const { data: foundData } = await this.findOneById(id);

    if (updateGrammarDto.courseId) {
      const course = await this.courseRepository.findById(
        updateGrammarDto.courseId,
      );
      if (!course) {
        throw new CourseNotFoundException();
      }
      foundData.course = course;
    }

    // Yangilangan ma'lumotlarni tayyorlash
    const updateData = {
      title: updateGrammarDto.title || foundData.title,
    };

    // Agar fayl bo'lsa, video URL'ini yangilaydi
    if (file) {
      const { videoUrl, duration } = await this.vimeoService.uploadVideo(
        file.buffer,
        updateGrammarDto.title || foundData.title,
        "Grammar video",
      );

      foundData.videoUrl = videoUrl;
      foundData.duration = duration;
      foundData.mimetype = file.mimetype;
      foundData.size = file.size;
    }

    // Boshqa maydonlarni yangilash
    Object.assign(foundData, updateData);

    const data = await this.grammarRepository.update(foundData);

    return new ResData<Grammar>("Grammar updated successfully", 200, data);
  }

  async delete(id: ID): Promise<ResData<Grammar>> {
    const { data: foundData } = await this.findOneById(id);
    const data = await this.grammarRepository.delete(foundData);

    return new ResData<Grammar>("Grammar deleted successfully", 200, data);
  }
}
