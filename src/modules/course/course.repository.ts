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

  async findAllWithCounts(): Promise<Array<Course & { alphabetCount: number; lessonCount: number; grammarCount: number; homeworkCount: number }>> {
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
      .addSelect('COUNT(DISTINCT "grammar"."id")', 'grammarCount')
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

    // Debug: SQL query'ni ko'rish
    console.log('[CourseRepository.findAllWithCounts] SQL:', queryBuilder.getSql());

    const results = await queryBuilder.getRawMany();
    console.log('[CourseRepository.findAllWithCounts] Raw results:', JSON.stringify(results, null, 2));

    // Debug: Birinchi kurs uchun to'g'ridan-to'g'ri tekshirish
    if (results.length > 0) {
      const firstCourseId = results[0].id;
      const alphabetCheck = await this.courseRepository.query(
        'SELECT COUNT(*) as count FROM alphabets WHERE course_id = $1',
        [firstCourseId]
      );
      const lessonCheck = await this.courseRepository.query(
        'SELECT COUNT(*) as count FROM lessons WHERE course_id = $1',
        [firstCourseId]
      );
      const grammarCheck = await this.courseRepository.query(
        'SELECT COUNT(*) as count FROM grammars WHERE course_id = $1',
        [firstCourseId]
      );
      console.log(`[CourseRepository.findAllWithCounts] Direct count check for course ${firstCourseId}:`);
      console.log('  - Alphabets:', alphabetCheck[0].count);
      console.log('  - Lessons:', lessonCheck[0].count);
      console.log('  - Grammars:', grammarCheck[0].count);

      // Umumiy ma'lumotlar mavjudligini tekshirish
      const totalAlphabets = await this.courseRepository.query('SELECT COUNT(*) as count FROM alphabets');
      const totalLessons = await this.courseRepository.query('SELECT COUNT(*) as count FROM lessons');
      const totalGrammars = await this.courseRepository.query('SELECT COUNT(*) as count FROM grammars');
      console.log('[CourseRepository.findAllWithCounts] Total counts in database:');
      console.log('  - Total Alphabets:', totalAlphabets[0].count);
      console.log('  - Total Lessons:', totalLessons[0].count);
      console.log('  - Total Grammars:', totalGrammars[0].count);

      // Birinchi lesson/alphabet/grammar'ning course_id'sini ko'rish
      const sampleLesson = await this.courseRepository.query('SELECT id, course_id FROM lessons LIMIT 1');
      const sampleAlphabet = await this.courseRepository.query('SELECT id, course_id FROM alphabets LIMIT 1');
      const sampleGrammar = await this.courseRepository.query('SELECT id, course_id FROM grammars LIMIT 1');
      console.log('[CourseRepository.findAllWithCounts] Sample records:');
      console.log('  - Sample Lesson:', sampleLesson[0]);
      console.log('  - Sample Alphabet:', sampleAlphabet[0]);
      console.log('  - Sample Grammar:', sampleGrammar[0]);
    }

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
    } as Course & { alphabetCount: number; lessonCount: number; grammarCount: number; homeworkCount: number }));
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
