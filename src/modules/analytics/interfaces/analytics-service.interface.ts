export interface IAnalyticsService {
    findAll(): Promise<IResponseData>;
    findOne(courseId: number): Promise<IResponseCourse>;
}

export interface IResponseData {
    livechat_total: number;
    course_total: number;
    total_profit: number;
}

export interface IResponseCourse {
    courseName: string;
    totalCount: number;
    totalProfit: number;
} 