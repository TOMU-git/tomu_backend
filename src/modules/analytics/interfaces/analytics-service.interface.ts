export interface IAnalyticsService {
    findAll(): Promise<IResponseData>;
}

export interface IResponseData {
    livechat_total: number;
    course_total: number;
    total_profit: number;
}