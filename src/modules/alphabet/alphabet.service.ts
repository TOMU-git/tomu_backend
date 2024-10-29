import { Inject, Injectable } from '@nestjs/common';
import { CreateAlphabetDto } from './dto/create-alphabet.dto';
import { UpdateAlphabetDto } from './dto/update-alphabet.dto';
import { Alphabet } from './entities/alphabet.entity';
import { IAlphabetRepository } from './interfaces/alphabet.repository';
import { ResData } from '../../lib/resData';
import { ID } from '../../common/types/type';
import { IAlphabetService } from './interfaces/alphabet.service';
import { VimeoService } from '../lesson/vimeo.service';
import { ICourseRepository } from '../course/interfaces/course.repository';
import { CourseNotFoundException } from '../course/exception/course.exception';
import { AlphabetOrderAlreadyExistException } from './exception/alphabet.exception';

@Injectable()
export class AlphabetService implements IAlphabetService {
  constructor(
    @Inject('IAlphabetRepository')
    private readonly alphabetRepository: IAlphabetRepository,

    @Inject('ICourseRepository')
    private readonly courseRepository: ICourseRepository,

    private readonly vimeoService: VimeoService, // Inject VimeoService
  ) {}

  async create(
    dto: CreateAlphabetDto,
    file: Express.Multer.File,
  ): Promise<ResData<Alphabet>> {
    const course = await this.courseRepository.findById(dto.courseId);

    if (!course) {
      throw new CourseNotFoundException();
    }

    const orderExist = await this.alphabetRepository.findOneByOrder(
      dto.order,
      dto.courseId,
    );

    if (orderExist) {
      throw new AlphabetOrderAlreadyExistException();
    }

    // video_url ni yuklanadigan video faylning URL ga aylantirish
    const { videoUrl, duration } = await this.vimeoService.uploadVideo(
      file.buffer,
      dto.title,
      'Dars videosi',
      // file.size,
    );

    const newAlphabet = new Alphabet();
    Object.assign(newAlphabet, {
      ...dto,
      videoUrl,
      duration,
      course,
      mimetype: file.mimetype,
      size: file.size,
    });

    const savedAlphabet = await this.alphabetRepository.create(newAlphabet);

    return new ResData<Alphabet>(
      'Alifbo muvaffaqiyatli yaratildi',
      201,
      savedAlphabet,
    );
  }

  async findAll(): Promise<ResData<Array<Alphabet>>> {
    const data = await this.alphabetRepository.findAll();
    return new ResData<Array<Alphabet>>('ok', 200, data);
  }

  async findOneById(id: ID): Promise<ResData<Alphabet>> {
    const foundData = await this.alphabetRepository.findById(id);
    if (!foundData) {
      throw new AlphabetOrderAlreadyExistException();
    }

    return new ResData<Alphabet>('ok', 200, foundData);
  }

  async getAlphabetsByCourseId(courseId: ID): Promise<ResData<Alphabet[]>> {
    const alphabets =
      await this.alphabetRepository.getAlphabetsByCourseId(courseId);

    if (alphabets.length === 0) {
      return new ResData<Alphabet[]>('Not any data yet', 200, []);
    }

    return new ResData<Alphabet[]>(
      'Alphabets by courseId fetched successfully',
      200,
      alphabets,
    );
  }

  async update(
    id: ID,
    dto: UpdateAlphabetDto,
    file?: Express.Multer.File,
  ): Promise<ResData<Alphabet>> {
    const { data: foundData } = await this.findOneById(id);

    // Order qiymatini raqamga aylantirish va mavjud bo'lsa tekshirish
    const order =
      dto.order !== undefined
        ? parseInt(dto.order.toString(), 10)
        : foundData.order;

    if (isNaN(order)) {
      throw new Error('Order must be a valid number');
    }

    // Order mavjudligini tekshirish
    if (dto.order !== undefined && order !== foundData.order) {
      const orderExist = await this.alphabetRepository.findOneByOrder(
        order,
        dto.courseId,
      );
      if (orderExist) {
        throw new AlphabetOrderAlreadyExistException();
      }
    }

    const updateData = {
      order, // Order qiymati
      title: dto.title === '' ? foundData.title : dto.title || undefined,
      video: dto.video === '' ? undefined : dto.video || foundData.videoUrl,
    };

    // Agar fayl bo'lsa, video URL'ini yangilaydi
    if (file) {
      const { videoUrl, duration } = await this.vimeoService.uploadVideo(
        file.buffer,
        dto.title,
        'Dars videosi',
      );

      foundData.videoUrl = videoUrl;
      foundData.duration = duration;
      foundData.mimetype = file.mimetype;
      foundData.size = file.size;
    }

    Object.assign(foundData, updateData);

    const data = await this.alphabetRepository.update(foundData);

    return new ResData<Alphabet>('Alphabet updated successfully', 200, data);
  }

  async delete(id: ID): Promise<ResData<Alphabet>> {
    const { data: foundData } = await this.findOneById(id);
    const data = await this.alphabetRepository.delete(foundData);

    return new ResData<Alphabet>('Alphabet deleted successfully', 200, data);
  }
}
