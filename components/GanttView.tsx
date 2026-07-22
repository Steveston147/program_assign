import type { ScheduleItem, Staff } from '@/lib/types';
import { getProgramColorStyles } from '@/lib/programColors';
import { parseTimeToMinutes, sortByStartTime } from '@/lib/time';

const DAY_START = 7 * 60;
const DAY_END = 22 * 60;
const DAY_MINUTES = DAY_END - DAY_START;
const HOURS = Array.from({ length: 16 }, (_, index) => 7 + index);
const SHORT_SCHEDULE_MINUTES = 60;

type PositionedSchedule = {
  item: ScheduleItem;
  left: number;
  width: number;
  lane: number;
  durationMinutes: number;
};

function toPercent(minutes: number) {
  return ((minutes - DAY_START) / DAY_MINUTES) * 100;
}

function buildRows(items: ScheduleItem[], staff: Staff[]) {
  const byStaff = new Map<string, ScheduleItem[]>();
  items.forEach((item) => byStaff.set(item.staffName, [...(byStaff.get(item.staffName) || []), item]));

  const orderedNames = [
    ...staff.map((member) => member.staffName).filter((name) => byStaff.has(name)),
    ...Array.from(byStaff.keys())
      .filter((name) => !staff.some((member) => member.staffName === name))
      .sort((a, b) => a.localeCompare(b, 'ja')),
  ];

  return orderedNames.map((staffName) => {
    const laneEnds: number[] = [];
    const schedules = sortByStartTime(byStaff.get(staffName) || []).map((item) => {
      const rawStart = parseTimeToMinutes(item.startTime);
      const rawEnd = parseTimeToMinutes(item.endTime);
      const safeStart = rawStart === Number.MAX_SAFE_INTEGER ? DAY_START : rawStart;
      const safeEnd = rawEnd !== Number.MAX_SAFE_INTEGER && rawEnd > safeStart ? rawEnd : safeStart + 30;
      const clippedStart = Math.max(DAY_START, Math.min(DAY_END - 10, safeStart));
      const clippedEnd = Math.max(clippedStart + 10, Math.min(DAY_END, safeEnd));
      const lane = laneEnds.findIndex((end) => safeStart >= end);
      const nextLane = lane === -1 ? laneEnds.length : lane;
      laneEnds[nextLane] = safeEnd;

      return {
        item,
        left: Math.max(0, Math.min(100, toPercent(clippedStart))),
        width: Math.max(1.5, Math.min(100 - toPercent(clippedStart), toPercent(clippedEnd) - toPercent(clippedStart))),
        lane: nextLane,
        durationMinutes: Math.max(0, safeEnd - safeStart),
      } satisfies PositionedSchedule;
    });

    return { staffName, schedules, laneCount: Math.max(1, laneEnds.length) };
  });
}

export default function GanttView({ items, staff }: { items: ScheduleItem[]; staff: Staff[] }) {
  const rows = buildRows(items, staff);

  return (
    <section className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold">ガント表示</h2>
        <p className="rounded bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700">予定件数：{items.length}件</p>
      </div>
      {items.length === 0 ? (
        <p className="rounded border border-dashed p-6 text-center text-gray-500">この日付・条件に一致する予定はありません。</p>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[980px]">
            <div className="grid grid-cols-[10rem_1fr] border-b text-xs font-semibold text-gray-600">
              <div className="p-2">職員名</div>
              <div className="relative h-10">
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="absolute top-0 h-full border-l border-gray-200 pl-1"
                    style={{ left: `${((hour * 60 - DAY_START) / DAY_MINUTES) * 100}%` }}
                  >
                    {String(hour).padStart(2, '0')}:00
                  </div>
                ))}
              </div>
            </div>
            <div className="divide-y">
              {rows.map((row) => (
                <div key={row.staffName} className="grid grid-cols-[10rem_1fr]">
                  <div className="flex items-center border-r bg-gray-50 p-3 font-semibold">{row.staffName}</div>
                  <div className="relative bg-white" style={{ minHeight: `${row.laneCount * 3.25 + 1}rem` }}>
                    {HOURS.map((hour) => (
                      <div
                        key={hour}
                        className="absolute inset-y-0 border-l border-gray-100"
                        style={{ left: `${((hour * 60 - DAY_START) / DAY_MINUTES) * 100}%` }}
                      />
                    ))}
                    {row.schedules.map(({ item, left, width, lane, durationMinutes }, index) => {
                      const isShortSchedule = durationMinutes < SHORT_SCHEDULE_MINUTES;

                      return (
                        <div
                          key={`${item.staffName}-${item.startTime}-${item.endTime}-${item.programName}-${index}`}
                          className={`absolute overflow-hidden rounded border-l-4 px-2 py-1 text-xs shadow-sm ${getProgramColorStyles(item.programName)}`}
                          style={{ left: `${left}%`, width: `${width}%`, top: `${0.75 + lane * 3.25}rem` }}
                          title={`${item.startTime}〜${item.endTime} ${item.programName} ${item.eventName}${item.role ? ` / ${item.role}` : ''} / ${item.status}`}
                        >
                          {isShortSchedule ? (
                            <p className="truncate font-semibold leading-5">{item.eventName}</p>
                          ) : (
                            <>
                              <p className="truncate font-bold">{item.startTime}〜{item.endTime}</p>
                              <p className="truncate">{item.programName}</p>
                              <p className="truncate">
                                {item.eventName}
                                {item.role ? `（${item.role}）` : ''} / {item.status}
                              </p>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
