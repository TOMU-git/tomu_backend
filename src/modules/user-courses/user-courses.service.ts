// user-course.service.ts

import { Inject, Injectable } from "@nestjs/common";
import { CreateUserCourseDto } from "./dto/create-user-course.dto";
import { UpdateUserCourseDto } from "./dto/update-user-course.dto";
import { UserCourse } from "./entities/user-course.entity";
import { IUserCourseRepository } from "./interfaces/user-course.repository";
import { ResData } from "src/lib/resData";
import { ID } from "src/common/types/type";
import { IUserCourseService } from "./interfaces/user-course.service";
import {
  UserCourseAlreadyExistException,
  UserCourseNotFoundException,
} from "./exception/user-course.exception";

@Injectable()
export class UserCourseService implements IUserCourseService {
  constructor(
    @Inject("IUserCourseRepository")
    private readonly userCourseRepository: IUserCourseRepository,
  ) {}

  async create(
    createUserCourseDto: CreateUserCourseDto,
  ): Promise<ResData<UserCourse>> {
    const foundData = await this.userCourseRepository.findByUserId(
      createUserCourseDto.userId,
    );
    if (foundData) {
      throw new UserCourseAlreadyExistException();
    }
    let newUserCourse = new UserCourse();
    newUserCourse = Object.assign(newUserCourse, createUserCourseDto);
    const newData = await this.userCourseRepository.create(newUserCourse);

    return new ResData<UserCourse>(
      "User Course created successfully",
      201,
      newData,
    );
  }

  async findAll(): Promise<ResData<Array<UserCourse>>> {
    const data = await this.userCourseRepository.findAll();
    return new ResData<Array<UserCourse>>("ok", 200, data);
  }

  async findOneById(id: ID): Promise<ResData<UserCourse>> {
    const foundData = await this.userCourseRepository.findById(id);
    if (!foundData) {
      throw new UserCourseNotFoundException();
    }
    return new ResData<UserCourse>("ok", 200, foundData);
  }

  async update(
    id: ID,
    updateUserCourseDto: UpdateUserCourseDto,
  ): Promise<ResData<UserCourse>> {
    const foundData = await this.findOneById(id);
    const updatedData = Object.assign(foundData.data, updateUserCourseDto);
    const data = await this.userCourseRepository.update(updatedData);

    return new ResData<UserCourse>(
      "User Course updated successfully",
      200,
      data,
    );
  }

  async delete(id: ID): Promise<ResData<UserCourse>> {
    const foundData = await this.findOneById(id);
    const data = await this.userCourseRepository.delete(foundData.data);

    return new ResData<UserCourse>(
      "User Course deleted successfully",
      200,
      data,
    );
  }
}
