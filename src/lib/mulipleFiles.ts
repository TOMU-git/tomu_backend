import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { Request } from 'express';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { FileException } from 'src/modules/file/exception/file.exception';

export const multiPleFilesOption: MulterOptions = {
  limits: {
    fileSize: 10000000000, // Fayl hajmi cheklovi 100MB
  },
  storage: diskStorage({
    destination: (
      req: Request,
      file: Express.Multer.File,
      cb: (err: Error | null, destination: string) => void,
    ) => {
      const uploadPath = 'upload';

      // Agar 'upload' papkasi mavjud bo'lmasa, uni yarating
      if (!existsSync(uploadPath)) {
        mkdirSync(uploadPath);
      }

      cb(null, uploadPath);
    },
    filename: (
      req: Request,
      file: Express.Multer.File,
      cb: (err: Error | null, filename: string) => void,
    ): void => {
      // Fayl nomini generatsiya qilish: rasm yoki video + timestamp + original fayl kengaytmasi
      cb(
        null,
        `${file.mimetype.split('/')[0]}_${Date.now()}.${file.originalname
          .split('.')
          .pop()}`,
      );
    },
  }),
  fileFilter: (
    req: Request,
    file: Express.Multer.File,
    cb: (err: Error | null, acceptFile: boolean) => void,
  ) => {
    const constFileType = file.mimetype.split('/')[0];

    // Faqat rasm va video fayllarini qabul qilish
    if (constFileType === 'image' || constFileType === 'video') {
      cb(null, true);
    } else {
      // Agar fayl turi rasm yoki video bo'lmasa, xatolik qaytarish
      cb(
        new FileException(`File type '${constFileType}' is not supported`),
        false,
      );
    }
  },
};
