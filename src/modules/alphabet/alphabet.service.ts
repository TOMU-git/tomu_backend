import { Inject, Injectable } from '@nestjs/common';
import { CreateAlphabetDto } from './dto/create-alphabet.dto';
import { UpdateAlphabetDto } from './dto/update-alphabet.dto';
import { Alphabet } from './entities/alphabet.entity';
import { IAlphabetRepository } from './interfaces/alphabet.repository';
import { ResData } from '../../lib/resData';
import { ID } from '../../common/types/type';
import { IAlphabetService } from './interfaces/alphabet.service';
import {
  AlphabetAlreadyExistException,
  AlphabetNotFoundException,
} from './exception/alphabet.exception';
import { VimeoService } from '../lesson/vimeo.service';

@Injectable()
export class AlphabetService implements IAlphabetService {
  constructor(
    @Inject('IAlphabetRepository')
    private readonly alphabetRepository: IAlphabetRepository,
    private readonly vimeoService: VimeoService, // Inject VimeoService
  ) {}

  async create(
    dto: CreateAlphabetDto,
    file: Express.Multer.File,
  ): Promise<ResData<Alphabet>> {
    const foundData = await this.alphabetRepository.findOneByOrder(dto.order);
    if (foundData) {
      throw new AlphabetAlreadyExistException();
    }

    // video_url ni yuklanadigan video faylning URL ga aylantirish
    const videoUrl = await this.vimeoService.uploadVideo(
      file.buffer, // Faylni buffer orqali yuklash
      dto.title,
      'Alifbo videosi',
      file.size, // Faylning o'lchamini olish
    );

    const newAlphabet = new Alphabet();
    Object.assign(newAlphabet, {
      ...dto,
      video_url: videoUrl,
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
      throw new AlphabetNotFoundException();
    }

    return new ResData<Alphabet>('ok', 200, foundData);
  }

  async getAlphabetsByCourseId(courseId: ID): Promise<ResData<Alphabet[]>> {
    const alphabets =
      await this.alphabetRepository.getAlphabetsByCourseId(courseId);
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

    // Agar fayl bo'lsa, video URL'ini yangilaydi
    if (file) {
      // Yangi video faylni yuklaydi
      const videoUrl = await this.vimeoService.uploadVideo(
        file.buffer,
        dto.title || foundData.title,
        'Alifbo videosi',
        file.size,
      );

      // Eski videoning ma'lumotlarini yangilaydi
      foundData.video_url = videoUrl;
      foundData.mimetype = file.mimetype;
      foundData.size = file.size;
    }

    if (dto.order && dto.order !== foundData.order) {
      const isOrderExist = await this.alphabetRepository.findOneByOrder(
        dto.order,
      );
      if (isOrderExist) {
        throw new AlphabetAlreadyExistException();
      }
    }

    // Boshqa maydonlarni yangilash

    Object.assign(foundData, dto);

    const data = await this.alphabetRepository.update(foundData);

    return new ResData<Alphabet>('Alphabet updated successfully', 200, data);
  }

  async delete(id: ID): Promise<ResData<Alphabet>> {
    const { data: foundData } = await this.findOneById(id);
    const data = await this.alphabetRepository.delete(foundData);

    return new ResData<Alphabet>('Alphabet deleted successfully', 200, data);
  }
}
