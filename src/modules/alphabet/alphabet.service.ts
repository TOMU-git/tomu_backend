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
import { addVimeoEmbedUrl, addVimeoEmbedUrlToArray } from 'src/common/utils/helper';

@Injectable()
export class AlphabetService implements IAlphabetService {
  constructor(
    @Inject('IAlphabetRepository')
    private readonly alphabetRepository: IAlphabetRepository,

    @Inject('ICourseRepository')
    private readonly courseRepository: ICourseRepository,

    private readonly vimeoService: VimeoService, // Inject VimeoService
  ) { }

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
    const { videoUrl, duration, vimeoVideoId } = await this.vimeoService.uploadVideo(
      file.buffer,
      dto.title,
      'Dars videosi',
      // file.size,
    );

    const newAlphabet = new Alphabet();
    Object.assign(newAlphabet, {
      ...dto,
      videoUrl,
      vimeoVideoId,
      duration,
      course,
      mimetype: file.mimetype,
      size: file.size,
    });

    const savedAlphabet = await this.alphabetRepository.create(newAlphabet);

    // Response uchun faqat kerakli ma'lumotlarni qaytarish (relation ma'lumotlarisiz)
    const responseData = {
      id: savedAlphabet.id,
      title: savedAlphabet.title,
      videoUrl: savedAlphabet.videoUrl,
      vimeoVideoId: savedAlphabet.vimeoVideoId,
      order: savedAlphabet.order,
      mimetype: savedAlphabet.mimetype,
      size: savedAlphabet.size,
      duration: savedAlphabet.duration,
      createdAt: savedAlphabet.createdAt,
      lastUpdatedAt: savedAlphabet.lastUpdatedAt,
    };

    return new ResData<Alphabet>(
      'Alifbo muvaffaqiyatli yaratildi',
      201,
      addVimeoEmbedUrl(responseData as Alphabet),
    );
  }

  async findAll(): Promise<ResData<Array<Alphabet>>> {
    const data = await this.alphabetRepository.findAll();
    return new ResData<Array<Alphabet>>('ok', 200, addVimeoEmbedUrlToArray(data));
  }

  async findOneById(id: ID): Promise<ResData<Alphabet>> {
    const foundData = await this.alphabetRepository.findById(id);
    if (!foundData) {
      throw new AlphabetOrderAlreadyExistException();
    }

    return new ResData<Alphabet>('ok', 200, addVimeoEmbedUrl(foundData));
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
      addVimeoEmbedUrlToArray(alphabets),
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

    // Agar fayl bo'lsa, video URL'ini yangilaydi
    if (file) {
      const { videoUrl, duration, vimeoVideoId } = await this.vimeoService.uploadVideo(
        file.buffer,
        dto.title,
        'Dars videosi',
      );

      foundData.videoUrl = videoUrl;
      foundData.vimeoVideoId = vimeoVideoId;
      foundData.duration = duration;
      foundData.mimetype = file.mimetype;
      foundData.size = file.size;
    }

    // Order va title ni yangilash
    foundData.order = order;
    if (dto.title && dto.title !== '') {
      foundData.title = dto.title;
    }

    const data = await this.alphabetRepository.update(foundData);

    // Response uchun faqat kerakli ma'lumotlarni qaytarish (relation ma'lumotlarisiz)
    const responseData = {
      id: data.id,
      title: data.title,
      videoUrl: data.videoUrl,
      vimeoVideoId: data.vimeoVideoId,
      order: data.order,
      mimetype: data.mimetype,
      size: data.size,
      duration: data.duration,
      createdAt: data.createdAt,
      lastUpdatedAt: data.lastUpdatedAt,
    };

    return new ResData<Alphabet>('Alphabet updated successfully', 200, addVimeoEmbedUrl(responseData as Alphabet));
  }

  async delete(id: ID): Promise<ResData<Alphabet>> {
    const { data: foundData } = await this.findOneById(id);
    const data = await this.alphabetRepository.delete(foundData);

    return new ResData<Alphabet>('Alphabet deleted successfully', 200, addVimeoEmbedUrl(data));
  }
}
