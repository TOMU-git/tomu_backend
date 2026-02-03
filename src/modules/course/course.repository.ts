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
  ) { }

  async create(dto: Course): Promise<Course> {
    const newCourse = await this.courseRepository.create(dto);
    await this.courseRepository.save(newCourse);
    return newCourse;
  }

  async findAll(): Promise<Array<Course>> {
    return await this.courseRepository.find({});
  }

  async findAllWithCounts(userId?: number): Promise<Array<Course & { alphabetCount: number; lessonCount: number; grammarCount: number; homeworkCount: number; isActiveForUser: boolean; subscriptionStatus: string; startedAt: Date | null; endedAt: Date | null }>> {
    const queryBuilder = this.courseRepository
      .createQueryBuilder('course')
      .leftJoin('course.alphabets', 'alphabet')
      .leftJoin('course.blocks', 'block')
      .leftJoin('block.lessons', 'lesson')
      .leftJoin('grammars', 'grammar', '"grammar"."course_id" = "course"."id"')
      .select('course.id', 'id')
      .addSelect('course.title', 'title')
      .addSelect('course.description', 'description')
      .addSelect('course.image_url', 'imageUrl')
      .addSelect('course.video_url', 'videoUrl')
      .addSelect('course.mime_type', 'mimetype')
      .addSelect('course.size', 'size')
      .addSelect('course.isActive', 'isActive')
      .addSelect('course.lang', 'lang')
      .addSelect('course.created_at', 'createdAt')
      .addSelect('course.last_update_at', 'lastUpdatedAt')
      .addSelect('COUNT(DISTINCT "alphabet"."id")', 'alphabetCount')
      .addSelect('COUNT(DISTINCT "lesson"."id")', 'lessonCount')
      .addSelect('COUNT(DISTINCT "grammar"."id")', 'grammarCount');

    // Agar userId berilgan bo'lsa, user_courses bilan JOIN qilamiz
    if (userId) {
      queryBuilder
        .leftJoin(
          'user_courses',
          'userCourse',
          '"userCourse"."course_id" = "course"."id" AND "userCourse"."user_id" = :userId',
          { userId }
        )
        .addSelect(
          'MAX(CASE WHEN "userCourse"."id" IS NOT NULL AND "userCourse"."has_ever_paid" = true AND "userCourse"."is_active" = true AND ("userCourse"."ended_at" IS NULL OR "userCourse"."ended_at" >= CURRENT_DATE) THEN 1 ELSE 0 END)',
          'isActiveForUser'
        )
        .addSelect(
          `MAX(CASE 
            WHEN "userCourse"."has_ever_paid" = true 
                 AND "userCourse"."is_active" = true 
                 AND ("userCourse"."ended_at" IS NULL OR "userCourse"."ended_at" >= CURRENT_DATE)
            THEN 'purchased'
            
            WHEN "userCourse"."on_free_trial" = true
                 AND "userCourse"."has_ever_paid" = false
            THEN 'free_trial'
            
            WHEN "userCourse"."id" IS NOT NULL 
                 AND "userCourse"."ended_at" < CURRENT_DATE
            THEN 'expired'
            
            ELSE 'no_subscription'
          END)`,
          'subscriptionStatus'
        )
        .addSelect('MAX("userCourse"."started_at")', 'startedAt')
        .addSelect('MAX("userCourse"."ended_at")', 'endedAt');
    } else {
      // userId yo'q bo'lsa, isActiveForUser har doim 0, dates NULL
      queryBuilder
        .addSelect('0', 'isActiveForUser')
        .addSelect(`'no_subscription'`, 'subscriptionStatus')
        .addSelect('NULL', 'startedAt')
        .addSelect('NULL', 'endedAt');
    }

    queryBuilder
      .groupBy('course.id')
      .addGroupBy('course.title')
      .addGroupBy('course.description')
      .addGroupBy('course.image_url')
      .addGroupBy('course.video_url')
      .addGroupBy('course.mime_type')
      .addGroupBy('course.size')
      .addGroupBy('course.isActive')
      .addGroupBy('course.lang')
      .addGroupBy('course.created_at')
      .addGroupBy('course.last_update_at');

    const results = await queryBuilder.getRawMany();

    return results.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      imageUrl: row.imageUrl,
      videoUrl: row.videoUrl,
      mimetype: row.mimetype,
      size: row.size,
      isActive: row.isActive,
      lang: row.lang,
      createdAt: row.createdAt,
      lastUpdatedAt: row.lastUpdatedAt,
      alphabetCount: parseInt(row.alphabetCount) || 0,
      lessonCount: parseInt(row.lessonCount) || 0,
      grammarCount: parseInt(row.grammarCount) || 0,
      homeworkCount: parseInt(row.lessonCount) || 0,
      isActiveForUser: row.isActiveForUser === 1 || row.isActiveForUser === '1' || row.isActiveForUser === true,
      subscriptionStatus: row.subscriptionStatus || 'no_subscription',
      startedAt: row.startedAt ? new Date(row.startedAt) : null,
      endedAt: row.endedAt ? new Date(row.endedAt) : null,
    } as Course & { alphabetCount: number; lessonCount: number; grammarCount: number; homeworkCount: number; isActiveForUser: boolean; subscriptionStatus: string; startedAt: Date | null; endedAt: Date | null }));
  }

  async update(entity: Course): Promise<Course> {
    return await this.courseRepository.save(entity);
  }

  async delete(entity: Course): Promise<Course> {
    return await this.courseRepository.remove(entity);
  }

  async findById(id: ID): Promise<Course | null> {
    return await this.courseRepository.findOne({
      where: { id }, // Qidirilayotgan kurs IDsi
      relations: [
        'feedbacks',
        'feedbacks.user',
      ]// Feedbacklar bilan bog'liq userlarni qo'shish
    });
  }

  async findByIdWithCounts(id: ID): Promise<(Course & { alphabetCount: number; lessonCount: number; grammarCount: number; homeworkCount: number }) | null> {
    const result = await this.courseRepository
      .createQueryBuilder('course')
      .leftJoin('course.alphabets', 'alphabet')
      .leftJoin('course.blocks', 'block')
      .leftJoin('block.lessons', 'lesson')
      .leftJoin('grammars', 'grammar', '"grammar"."course_id" = "course"."id"')
      .select('course.id', 'id')
      .addSelect('course.title', 'title')
      .addSelect('course.description', 'description')
      .addSelect('course.image_url', 'imageUrl')
      .addSelect('course.video_url', 'videoUrl')
      .addSelect('course.mime_type', 'mimetype')
      .addSelect('course.size', 'size')
      .addSelect('course.isActive', 'isActive')
      .addSelect('course.lang', 'lang')
      .addSelect('course.created_at', 'createdAt')
      .addSelect('course.last_update_at', 'lastUpdatedAt')
      .addSelect('COUNT(DISTINCT "alphabet"."id")', 'alphabetCount')
      .addSelect('COUNT(DISTINCT "lesson"."id")', 'lessonCount')
      .addSelect('COUNT(DISTINCT "grammar"."id")', 'grammarCount')
      .where('course.id = :id', { id })
      .groupBy('course.id')
      .addGroupBy('course.title')
      .addGroupBy('course.description')
      .addGroupBy('course.image_url')
      .addGroupBy('course.video_url')
      .addGroupBy('course.mime_type')
      .addGroupBy('course.size')
      .addGroupBy('course.isActive')
      .addGroupBy('course.lang')
      .addGroupBy('course.created_at')
      .addGroupBy('course.last_update_at')
      .getRawOne();

    if (!result) {
      return null;
    }

    return {
      id: result.id,
      title: result.title,
      description: result.description,
      imageUrl: result.imageUrl,
      videoUrl: result.videoUrl,
      mimetype: result.mimetype,
      size: result.size,
      isActive: result.isActive,
      lang: result.lang,
      createdAt: result.createdAt,
      lastUpdatedAt: result.lastUpdatedAt,
      alphabetCount: parseInt(result.alphabetCount) || 0,
      lessonCount: parseInt(result.lessonCount) || 0,
      grammarCount: parseInt(result.grammarCount) || 0,
      homeworkCount: parseInt(result.lessonCount) || 0,
    } as Course & { alphabetCount: number; lessonCount: number; grammarCount: number; homeworkCount: number };
  }

  async findOneByName(title: string): Promise<Course | null> {
    return await this.courseRepository.findOneBy({ title });
  }
}
