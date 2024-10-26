import { Injectable } from "@nestjs/common";
import { ID } from "src/common/types/type";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ICourseRepository } from "./interfaces/course.repository";
import { Course } from "./entities/course.entity";

@Injectable()
export class CourseRepository implements ICourseRepository {
  constructor(
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
  ) {}

  async create(dto: Course): Promise<Course> {
    const newCourse = await this.courseRepository.create(dto);
    await this.courseRepository.save(newCourse);
    return newCourse;
  }

  async findAll(): Promise<Array<Course>> {
    return await this.courseRepository.find();
  }

  async update(entity: Course): Promise<Course> {
    return await this.courseRepository.save(entity);
  }

  async delete(entity: Course): Promise<Course> {
    return await this.courseRepository.remove(entity);
  }

  async findById(id: ID): Promise<Course | null> {
    return await this.courseRepository.findOneBy({ id });
  }

  async findOneByName(title: string): Promise<Course | null> {
    return await this.courseRepository.findOneBy({ title });
  }
}
