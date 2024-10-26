import { existsSync, unlink } from "fs";
import { Inject, Injectable } from "@nestjs/common";
import { CreateFileDto } from "./dto/create-file.dto";
import { File } from "./entities/file.entity";
import { ResData } from "src/lib/resData";
import { IFileRepository } from "./interfaces/file.repository";
import { FileNotFoundException } from "./exception/file.exception";

@Injectable()
export class FileService {
  constructor(
    @Inject("IFileRepository") private readonly fileRepository: IFileRepository,
  ) {}

  async create(createFileDto: Express.Multer.File) {
    const created = new File();
    created.mimetype = createFileDto.mimetype;
    created.originalname = createFileDto.originalname;
    created.size = createFileDto.size;
    created.path = `https://lms.ilyosbekdev.uz/${createFileDto.path}`;
    const newData = await this.fileRepository.create(created);
    return new ResData<File>("File was created successfully", 201, newData);
  }

  async findAll() {
    const data = await this.fileRepository.findAll();
    return new ResData<Array<File>>("ok", 200, data);
  }

  async findOneById(id: number) {
    const foundData = await this.fileRepository.findOneById(id);
    if (!foundData) {
      throw new FileNotFoundException();
    }
    return new ResData<File>("ok", 200, foundData);
  }

  async findByImageUrl(imageUrl: string): Promise<File | null> {
    const foundFile = await this.fileRepository.findByImageUrl(imageUrl);
    console.log(imageUrl);
    console.log(foundFile);
    if (!foundFile) {
      console.log("work here");
      throw new FileNotFoundException();
    }
    return foundFile;
  }

  async removeByImageUrl(imageUrl: string): Promise<ResData<string>> {
    const foundFile = await this.findByImageUrl(imageUrl);

    // Faylni o'chirish
    await this.fileRepository.delete(foundFile);
    const deleteFilePath = foundFile.path; // o'chiriladigan faylning yo'li

    // Faylni tizimdan o'chirish
    if (existsSync(deleteFilePath)) {
      try {
        await this.unlinkFile(deleteFilePath);
        console.log("Fayl muvaffaqiyatli o'chirildi");
      } catch (err) {
        console.error("Faylni o'chirishda xatolik:", err);
      }
    }

    return new ResData<string>(
      "Fayl muvaffaqiyatli o'chirildi",
      200,
      deleteFilePath,
    );
  }

  async remove(id: number) {
    const { data: foundData } = await this.findOneById(id);
    const data = await this.fileRepository.delete(foundData);
    const deleteFile = data.path;

    if (existsSync(deleteFile)) {
      try {
        await this.unlinkFile(deleteFile);
        console.log("Fayl muvaffaqiyatli o'chirildi");
      } catch (err) {
        console.error("Faylni o'chirishda xatolik:", err);
      }
    }

    return new ResData("success", 200, data);
  }

  private unlinkFile(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      unlink(filePath, (err) => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  }
}
