import { Module } from "@nestjs/common";
import { File } from "./entities/file.entity";
import { FileService } from "./file.service";
import { FileController } from "./file.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FileRepository } from "./file.repository";
import { VimeoService } from '../lesson/vimeo.service';

@Module({
  imports: [TypeOrmModule.forFeature([File])],
  controllers: [FileController],
  providers: [
    { provide: "IFileService", useClass: FileService },
    { provide: "IFileRepository", useClass: FileRepository },
    VimeoService,
    { provide: 'IFileService', useClass: FileService },
    { provide: 'IFileRepository', useClass: FileRepository },
  ],
  exports: [{ provide: "IFileService", useClass: FileService }],
})
export class FileModule {}
