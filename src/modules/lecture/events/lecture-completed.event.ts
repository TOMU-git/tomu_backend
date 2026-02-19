import { ID } from "src/common/types/type";

export class LectureCompletedEvent {
    constructor(
        public readonly lectureId: ID,
        public readonly groupId: ID,
        public readonly assignedTeacherId?: ID,
    ) { }
}
