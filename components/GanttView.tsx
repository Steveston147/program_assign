'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ScheduleItem, Staff } from '@/lib/types';
import { getProgramColorStyles } from '@/lib/programColors';
import { parseTimeToMinutes, sortByStartTime } from '@/lib/time';
import ScheduleDetailDialog from '@/components/ScheduleDetailDialog';

const DAY_START = 8 * 60;
const DAY_END = 18 * 60;
const DAY_MINUTES = DAY_END - DAY_START;
const HOURS = Array.from({ length: 11 }, (_, index) => 8 + index);
const SHORT_SCHEDULE_MINUTES = 60;

type PositionedSchedule = {
  item: ScheduleItem;
  left: number;
  width: number;
  lane: number;
  durationMinutes: number;
  startMinutes: number;
  endMinutes: number;
  hasConflict: boolean;
};

type SelectedSchedule = {
  item: ScheduleItem;
  trigger: HTMLButtonElement;
};

function toPercent(minutes: number) {
  return ((minutes - DAY_START) / DAY_MINUTES) * 100;
}

function getTokyoNow() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || '';

  return {
    date: `${value('year')}-${value('month')}-${value('day')}`,
    minutes: Number(value('hour')) * 60 + Number(value('minute')),
  };
}

function formatDuration(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes}分`;
  if (minutes === 0) return `${hours}時間`;
  return `${hours}時間${minutes}分`;
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
        startMinutes: safeStart,
        endMinutes: safeEnd,
        hasConflict: false,
      } satisfies PositionedSchedule;
    });

    for (let firstIndex = 0; firstIndex < schedules.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < schedules.length; secondIndex += 1) {
        const first = schedules[firstIndex];
        const second = schedules[secondIndex];
        const overlaps = first.startMinutes < second.endMinutes && second.startMinutes < first.endMinutes;

        if (overlaps) {
          first.hasConflict = true;
          second.hasConflict = true;
        }
      }
    }

    return {
      staffName,
      schedules,
      laneCount: Math.max(1, laneEnds.length),
      totalMinutes: schedules.reduce((total, schedule) => total + schedule.durationMinutes, 0),
      hasConflict: schedules.some((schedule) => schedule.hasConflict),
    };
  });
}

export default function GanttView({ items, staff }: { items: ScheduleItem[]; staff: Staff[] }) {
  const rows = buildRows(items, staff);
  const [selectedSchedule, setSelectedSchedule] = useState<SelectedSchedule | null>(null);
  const [tokyoNow, setTokyoNow] = useState(getTokyoNow);
  const closeDetail = useCallback(() => setSelectedSchedule(null), []);

  useEffect(() => {
    const timer = window.setInterval(() => setTokyoNow(getTokyoNow()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const currentDate = items[0]?.date;
  const showCurrentTime = currentDate === tokyoNow.date && tokyoNow.minutes >= DAY_START && tokyoNow.minutes <= DAY_END;
  const currentTimeLeft = Math.max(0, Math.min(100, toPercent(tokyoNow.minutes)));

  return (
    <>
      <section className="print-gantt rounded-lg border bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold">ガント表示</h2>
          <div className="flex items-center gap-2">
            <p className="rounded bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700">予定件数：{items.length}件</p>
            <button
              type="button"
              className="no-print inline-flex min-h-9 items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
              onClick={() => window.print()}
            >
              印刷
            </button>
          </div>
        </div>
        {items.length === 0 ? (
          <p className="rounded border border-dashed p-6 text-center text-gray-500">この日付・条件に一致する予定はありません。</p>
        ) : (
          <div className="print-gantt-scroll max-h-[70vh] overflow-auto rounded border border-gray-200">
            <div className="print-gantt-table min-w-[980px]">
              <div className="print-gantt-header sticky top-0 z-10 grid grid-cols-[10rem_1fr] border-b bg-white text-xs font-semibold text-gray-600 shadow-sm">
                <div className="print-gantt-staff sticky left-0 z-20 border-r bg-gray-50 p-2 shadow-[2px_0_4px_rgba(0,0,0,0.06)]">職員名</div>
                <div className="relative h-10 bg-white">
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="absolute top-0 h-full border-l border-gray-200 pl-1"
                      style={{ left: `${((hour * 60 - DAY_START) / DAY_MINUTES) * 100}%` }}
                    >
                      {String(hour).padStart(2, '0')}:00
                    </div>
                  ))}
                  {showCurrentTime && (
                    <div
                      className="no-print absolute inset-y-0 z-20 border-l-2 border-red-500"
                      style={{ left: `${currentTimeLeft}%` }}
                      aria-label="現在時刻"
                    >
                      <span className="absolute left-1 top-0 whitespace-nowrap rounded bg-red-500 px-1 py-0.5 text-[10px] font-bold text-white">現在</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="divide-y">
                {rows.map((row) => (
                  <div key={row.staffName} className="print-gantt-row grid grid-cols-[10rem_1fr]">
                    <div className="print-gantt-staff sticky left-0 z-[5] flex flex-col justify-center border-r bg-gray-50 p-3 shadow-[2px_0_4px_rgba(0,0,0,0.06)]">
                      <span className="font-semibold">{row.staffName}</span>
                      <span className="mt-1 text-xs font-normal text-gray-500">
                        {row.schedules.length}件・{formatDuration(row.totalMinutes)}
                      </span>
                      {row.hasConflict ? (
                        <span className="mt-1 inline-flex w-fit items-center rounded bg-red-100 px-1.5 py-0.5 text-[11px] font-bold text-red-700">
                          時間重複あり
                        </span>
                      ) : null}
                    </div>
                    <div className="relative bg-white" style={{ minHeight: `${row.laneCount * 3.25 + 1}rem` }}>
                      {HOURS.map((hour) => (
                        <div
                          key={hour}
                          className="absolute inset-y-0 border-l border-gray-100"
                          style={{ left: `${((hour * 60 - DAY_START) / DAY_MINUTES) * 100}%` }}
                        />
                      ))}
                      {showCurrentTime && (
                        <div
                          className="no-print pointer-events-none absolute inset-y-0 z-20 border-l-2 border-red-500"
                          style={{ left: `${currentTimeLeft}%` }}
                          aria-hidden="true"
                        />
                      )}
                      {row.schedules.map(({ item, left, width, lane, durationMinutes, hasConflict }, index) => {
                        const isShortSchedule = durationMinutes < SHORT_SCHEDULE_MINUTES;
                        const conflictLabel = hasConflict ? '、同じ職員の別予定と時間が重複しています' : '';

                        return (
                          <button
                            type="button"
                            key={`${item.staffName}-${item.startTime}-${item.endTime}-${item.programName}-${index}`}
                            className={`print-gantt-item absolute overflow-hidden rounded border-l-4 text-left shadow-sm transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${
                              isShortSchedule ? 'px-1 py-0.5 text-[11px] leading-tight' : 'px-2 py-1 text-xs'
                            } ${hasConflict ? 'ring-2 ring-red-500 ring-offset-1' : ''} ${getProgramColorStyles(item.programName)}`}
                            style={{ left: `${left}%`, width: `${width}%`, top: `${0.75 + lane * 3.25}rem` }}
                            title={`${item.startTime}〜${item.endTime} ${item.programName} ${item.eventName}${item.role ? ` / ${item.role}` : ''} / ${item.status}${conflictLabel}`}
                            aria-label={`${item.startTime}から${item.endTime}、${item.eventName}の詳細を開く${conflictLabel}`}
                            onClick={(event) => setSelectedSchedule({ item, trigger: event.currentTarget })}
                          >
                            {isShortSchedule ? (
                              <>
                                <span className="block truncate font-bold leading-4">{item.startTime}</span>
                                <span className="block truncate font-semibold leading-4">{item.eventName}</span>
                              </>
                            ) : (
                              <>
                                <span className="block truncate font-bold">{item.startTime}〜{item.endTime}</span>
                                <span className="block truncate">{item.programName}</span>
                                <span className="block truncate">
                                  {item.eventName}
                                  {item.role ? `（${item.role}）` : ''} / {item.status}
                                </span>
                              </>
                            )}
                          </button>
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

      {selectedSchedule ? (
        <ScheduleDetailDialog
          item={selectedSchedule.item}
          onClose={closeDetail}
          returnFocusTo={selectedSchedule.trigger}
        />
      ) : null}
    </>
  );
}
