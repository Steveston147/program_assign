'use client';

import { useEffect, useRef } from 'react';
import type { ScheduleItem } from '@/lib/types';

type ScheduleDetailDialogProps = {
  item: ScheduleItem;
  onClose: () => void;
  returnFocusTo?: HTMLElement | null;
};

type DetailRowProps = {
  label: string;
  value: string;
};

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="grid gap-1 border-b border-slate-100 py-3 sm:grid-cols-[7rem_1fr] sm:gap-4">
      <dt className="text-sm font-semibold text-slate-500">{label}</dt>
      <dd className="whitespace-pre-wrap break-words text-sm text-slate-900">{value}</dd>
    </div>
  );
}

export default function ScheduleDetailDialog({ item, onClose, returnFocusTo }: ScheduleDetailDialogProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      returnFocusTo?.focus();
    };
  }, [onClose, returnFocusTo]);

  const optionalDetails = [
    { label: '役割', value: item.role },
    { label: '集合時刻', value: item.gatheringTime },
    { label: '集合場所', value: item.gatheringPlace },
    { label: '行先', value: item.destination },
    { label: '備考', value: item.notes },
  ].filter((detail): detail is { label: string; value: string } => Boolean(detail.value?.trim()));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-detail-title"
        className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl"
      >
        <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">予定詳細</p>
          <h2 id="schedule-detail-title" className="break-words text-xl font-bold text-slate-900">
            {item.eventName}
          </h2>
        </div>

        <dl className="px-5 sm:px-6">
          <DetailRow label="時間" value={`${item.startTime}〜${item.endTime}`} />
          <DetailRow label="職員" value={item.staffName} />
          <DetailRow label="プログラム" value={item.programName} />
          <DetailRow label="ステータス" value={item.status} />
          {optionalDetails.map((detail) => (
            <DetailRow key={detail.label} label={detail.label} value={detail.value} />
          ))}
        </dl>

        <div className="flex justify-end px-5 py-4 sm:px-6">
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
