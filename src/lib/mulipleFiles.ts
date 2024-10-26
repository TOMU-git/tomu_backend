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
      const extension = file.originalname.split('.').pop();
      const fileType = file.mimetype.split('/')[0];

      if (!extension) {
        cb(new Error('Invalid file extension'), '');
      } else {
        cb(null, `${fileType}_${Date.now()}.${extension}`);
      }
    },
  }),
  fileFilter: (
    req: Request,
    file: Express.Multer.File,
    cb: (err: Error | null, acceptFile: boolean) => void,
  ) => {
    const allowedTypes = ['image', 'video'];
    const constFileType = file.mimetype.split('/')[0];
    const allowedVideoFormats = ['mp4', 'mkv', 'avi'];

    const extension = file.originalname.split('.').pop();

    if (
      allowedTypes.includes(constFileType) ||
      (constFileType === 'video' && allowedVideoFormats.includes(extension))
    ) {
      cb(null, true);
    } else {
      cb(
        new FileException(
          `File type '${constFileType}' or extension '${extension}' is not supported`,
        ),
        false,
      );
    }
  },
};
