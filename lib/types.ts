export type ScheduleItem = { date:string; staffName:string; startTime:string; endTime:string; programName:string; role?:string; gatheringTime?:string; gatheringPlace:string; eventName:string; destination?:string; status:string; notes?:string; updatedAt?:string };
export type Staff = { staffId?:string; staffName:string; displayOrder?:number; active?:boolean; notes?:string };
export type ScheduleDataSource = 'uploaded' | 'repository' | 'seed';
export type ScheduleData = { items: ScheduleItem[]; staff: Staff[]; dates: string[]; programs: string[]; statuses: string[]; updatedAt?: string };
export type ScheduleResponse = ScheduleData & { source: ScheduleDataSource };
