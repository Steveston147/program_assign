import type { ScheduleItem, Staff } from '@/lib/types';
import { groupByStaff } from '@/lib/utils';
import StaffCard from './StaffCard';
export default function StaffScheduleBoard({ items, staff }:{items:ScheduleItem[]; staff:Staff[]}){ const groups=groupByStaff(items, staff); return <div className="print-grid grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">{groups.map(g=><StaffCard key={g.staffName} {...g}/>)}</div> }
