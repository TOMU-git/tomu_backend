export class LectureCreatedEvent {
    constructor(
        public readonly lectureId: number,
        public readonly title: string,
        public readonly startTime: Date,
        public readonly duration: number,
        public readonly groupId: number,
        public readonly groupName?: string,
    ) { }
}

export class LectureClaimedEvent {
    constructor(
        public readonly lectureId: number,
        public readonly teacherId: number,
        public readonly groupLink: string,
    ) { }
}
