export interface IAnalyticsService {
    findAll(year: string): Promise<IResponseData>;
    findOne(courseId: number): Promise<IResponseCourse>;
}

export interface IResponseData {
    data: {},
    totalLiveChatAmount: number;
    totalTariffAmount: number;
    totalProfit: number;
}

export interface IResponseCourse {
    courseName: string;
    totalCount: number;
    totalProfit: number;
} 

