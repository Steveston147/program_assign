import type { ScheduleItem } from '@/lib/types';
import { getProgramColorStyles } from '@/lib/programColors';
import StatusBadge from './StatusBadge';

export default function StaffCard({
  staffName,
  schedules,
}: {
  staffName: string;
  schedules: ScheduleItem[];
}) {
  return (
    <section className="print-card overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <h2 className="min-w-0 truncate text-lg font-bold text-slate-900">
          {staffName}
        </h2>
        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
          {schedules.length}件
        </span>
      </div>

      <div className="p-4">
        {schedules.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            本日の予定はありません
          </p>
        ) : (
          <div className="space-y-3">
            {schedules.map((schedule, index) => (
              <article
                key={`${schedule.staffName}-${schedule.startTime}-${index}`}
                className={`print-schedule rounded-lg border border-slate-200 border-l-4 p-3 shadow-sm ${getProgramColorStyles(schedule.programName)}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-bold tabular-nums text-slate-900">
                    {schedule.startTime}〜{schedule.endTime}
                  </p>
                  <StatusBadge status={schedule.status} />
                </div>

                <p className="mt-2 text-xs font-semibold text-slate-500">
                  {schedule.programName}
                </p>
                <p className="mt-0.5 font-semibold leading-snug text-slate-900">
                  {schedule.eventName}
                </p>

                <dl className="mt-3 grid grid-cols-[4rem_minmax(0,1fr)] gap-x-2 gap-y-1.5 border-t border-slate-200 pt-3 text-sm">
                  <dt className="text-slate-500">役割</dt>
                  <dd className="min-w-0 break-words text-slate-800">
                    {schedule.role || '-'}
                  </dd>

                  <dt className="text-slate-500">集合</dt>
                  <dd className="min-w-0 break-words text-slate-800">
                    {schedule.gatheringTime || '-'} / {schedule.gatheringPlace}
                  </dd>

                  <dt className="text-slate-500">行先</dt>
                  <dd className="min-w-0 break-words text-slate-800">
                    {schedule.destination || '-'}
                  </dd>

                  {schedule.notes && (
                    <>
                      <dt className="text-slate-500">備考</dt>
                      <dd className="min-w-0 break-words text-slate-800">
                        {schedule.notes}
                      </dd>
                    </>
                  )}
                </dl>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
