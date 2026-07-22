const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getTodayInTokyo = () => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    throw new Error('日本時間の今日の日付を取得できません。');
  }

  return `${year}-${month}-${day}`;
};

const shiftDate = (dateString: string, days: number) => {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return formatDate(date);
};

const formatJapaneseDate = (dateString: string) => {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  if (Number.isNaN(date.getTime())) return dateString;

  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(date);
};

export default function DateSelector({ dates, selected, onChange }: { dates: string[]; selected: string; onChange: (d: string) => void }) {
  const shift = (days: number) => onChange(shiftDate(selected, days));
  const isToday = selected === getTodayInTokyo();

  return (
    <div className="no-print space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <button
            type="button"
            className="h-10 border-r border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            onClick={() => shift(-1)}
          >
            ‹ 前日
          </button>
          <div className="relative flex min-w-[190px] items-center justify-center px-3">
            <span className="pointer-events-none text-sm font-bold text-slate-900">{formatJapaneseDate(selected)}</span>
            <input
              aria-label="日付を選択"
              list="date-list"
              type="date"
              value={selected}
              onChange={(event) => onChange(event.target.value)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
            <datalist id="date-list">
              {dates.map((date) => <option key={date} value={date} />)}
            </datalist>
          </div>
          <button
            type="button"
            className="h-10 border-l border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            onClick={() => shift(1)}
          >
            翌日 ›
          </button>
        </div>

        <button
          type="button"
          className={`h-10 rounded-lg px-4 text-sm font-bold transition ${
            isToday
              ? 'bg-indigo-50 text-indigo-500 ring-1 ring-inset ring-indigo-200'
              : 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-700'
          }`}
          onClick={() => onChange(getTodayInTokyo())}
          disabled={isToday}
        >
          今日
        </button>
      </div>
      <p className="text-xs text-slate-500">中央の日付を押すと、カレンダーから直接選択できます。</p>
    </div>
  );
}
