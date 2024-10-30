// user-course.repository.ts

import { Injectable } from "@nestjs/common";
import { ID } from "src/common/types/type";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { IUserCourseRepository } from "./interfaces/user-course.repository";
import { UserCourse } from "./entities/user-course.entity";

@Injectable()
export class UserCourseRepository implements IUserCourseRepository {
  constructor(
    @InjectRepository(UserCourse)
    private userCourseRepository: Repository<UserCourse>,
  ) {}

  async create(dto: UserCourse): Promise<UserCourse> {
    const newUserCourse = await this.userCourseRepository.create(dto);
    await this.userCourseRepository.save(newUserCourse);
    return newUserCourse;
  }

  async findAll(): Promise<Array<UserCourse>> {
    return await this.userCourseRepository.find();
  }

  async update(entity: UserCourse): Promise<UserCourse> {
    return await this.userCourseRepository.save(entity);
  }

  async delete(entity: UserCourse): Promise<UserCourse> {
    return await this.userCourseRepository.remove(entity);
  }

  async findById(id: ID): Promise<UserCourse | null> {
    return await this.userCourseRepository.findOneBy({ id });
  }

  async findByUserId(id: ID): Promise<UserCourse> {
    return await this.userCourseRepository.findOneBy({userId: id});
  }
  async findByCourseId(courseId: ID): Promise<Array<UserCourse>> {
    return await this.userCourseRepository.findBy({ course: { id: courseId } });
  }
}
