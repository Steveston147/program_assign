'use client';

import { useEffect, useMemo, useState } from 'react';
import DateSelector, { getTodayInTokyo } from '@/components/DateSelector';
import PasswordGate from '@/components/PasswordGate';
import Filters, { FilterState } from '@/components/Filters';
import StaffScheduleBoard from '@/components/StaffScheduleBoard';
import TimelineTable from '@/components/TimelineTable';
import GanttView from '@/components/GanttView';
import type { ScheduleDataSource, ScheduleResponse } from '@/lib/types';

const sourceLabels: Record<ScheduleDataSource, string> = {
  uploaded: 'アップロード済みデータ',
  repository: '初期Excel',
  seed: 'サンプルデータ',
};

const emptyFilters: FilterState = { staffName: '', programName: '', status: '', keyword: '' };

const formatUpdatedAt = (updatedAt?: string) => {
  if (!updatedAt) return '未設定';

  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return '未設定';

  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  }).formatToParts(date);

  const getPart = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
  const year = getPart('year');
  const month = getPart('month');
  const day = getPart('day');
  const hour = getPart('hour');
  const minute = getPart('minute');

  if (!year || !month || !day || !hour || !minute) return '未設定';

  return `${year}/${month}/${day} ${hour}:${minute}`;
};

const formatPrintDate = (dateValue: string) => {
  if (!dateValue) return '未設定';

  const date = new Date(`${dateValue}T00:00:00+09:00`);
  if (Number.isNaN(date.getTime())) return dateValue;

  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(date);
};

const formatPrintTimestamp = (date: Date) =>
  new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);

export default function Page() {
  const [data, setData] = useState<ScheduleResponse | null>(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState('');
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [viewMode, setViewMode] = useState<'card' | 'gantt'>('card');
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [printedAt, setPrintedAt] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  async function loadAdminStatus() {
    try {
      const response = await fetch('/api/admin/status', { cache: 'no-store' });
      const json = await response.json();
      setIsAdmin(Boolean(json.isAdmin));
    } catch {
      setIsAdmin(false);
    }
  }

  async function load() {
    setLoading(true);
    setError('');
    const res = await fetch('/api/schedule', { cache: 'no-store' });
    if (res.status === 401) {
      setData(null);
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || '読み込みエラー');
      setLoading(false);
      return;
    }
    setData(json);
    setSelected((current) => current || getTodayInTokyo());
    await loadAdminStatus();
    setLoading(false);
  }

  useEffect(() => {
    load();
    setPrintedAt(formatPrintTimestamp(new Date()));
  }, []);

  async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    setData(null);
    setIsAdmin(false);
  }

  function printSchedule() {
    setPrintedAt(formatPrintTimestamp(new Date()));
    window.setTimeout(() => window.print(), 0);
  }

  const activeFilterValues = [filters.staffName, filters.programName, filters.status, filters.keyword.trim()].filter(Boolean);
  const activeFilterCount = activeFilterValues.length;
  const filterSummary = activeFilterValues
    .map((value, index) => (index === activeFilterValues.length - 1 && filters.keyword.trim() === value ? `「${value}」` : value))
    .join('・');

  const dayItems = useMemo(() => {
    if (!data) return [];

    const normalizedKeyword = filters.keyword.trim().toLocaleLowerCase('ja-JP');

    return data.items
      .filter((i) => i.date === selected)
      .filter(
        (i) =>
          (!filters.staffName || i.staffName === filters.staffName) &&
          (!filters.programName || i.programName === filters.programName) &&
          (!filters.status || i.status === filters.status),
      )
      .filter((i) => {
        if (!normalizedKeyword) return true;

        const searchableText = [
          i.programName,
          i.eventName,
          i.role,
          i.gatheringPlace,
          i.destination,
          i.notes,
        ]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase('ja-JP');

        return searchableText.includes(normalizedKeyword);
      });
  }, [data, selected, filters]);

  const visibleStaff = data
    ? filters.staffName
      ? data.staff.filter((s) => s.staffName === filters.staffName)
      : data.staff
    : [];

  if (!data && !loading) return <PasswordGate onLogin={load} />;

  return (
    <main className="print-root min-h-screen bg-slate-50 pb-12 text-slate-900">
      <header className="no-print sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-7">
          <div>
            <p className="text-xs font-bold tracking-[.18em] text-indigo-600">ONESTOP</p>
            <h1 className="text-xl font-black">Program Assign</h1>
            <p className="text-xs text-slate-500">Ritsumeikan Study Abroad Centre</p>
          </div>
          {data && (
            <div className="flex flex-wrap gap-2">
              {isAdmin && (
                <a
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                  href="/admin/upload"
                >
                  Excelアップロード
                </a>
              )}
              <button
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                onClick={logout}
              >
                ログアウト
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="print-content mx-auto max-w-[1500px] space-y-5 px-4 py-6 sm:px-7">
        <section className="no-print rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-sm text-slate-600">
            Excel読込状態: {loading ? '読込中' : error ? 'エラー' : '読込済み'}
            {data ? ` / データ: ${sourceLabels[data.source]}` : ''}
            {' / '}最終更新: {formatUpdatedAt(data?.updatedAt)}
          </p>
        </section>

        {data?.source === 'seed' && (
          <div className="no-print rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900">
            注意：サンプルデータを表示しています。実運用Excelをアップロードしてください。
          </div>
        )}
        {error && <div className="no-print rounded-lg border border-rose-300 bg-rose-50 p-4 text-rose-800">{error}</div>}
        {loading && <div className="no-print rounded-xl border border-slate-200 bg-white p-4 shadow-sm">読み込み中...</div>}
        {data && (
          <>
            <section className="print-only print-header">
              <h1>Program Assign</h1>
              <dl>
                <div>
                  <dt>対象日</dt>
                  <dd>{formatPrintDate(selected)}</dd>
                </div>
                <div>
                  <dt>印刷日時</dt>
                  <dd>{printedAt || '未設定'}</dd>
                </div>
                <div>
                  <dt>表示条件</dt>
                  <dd>
                    職員：{filters.staffName || 'すべて'} ／ プログラム：{filters.programName || 'すべて'} ／ ステータス：
                    {filters.status || 'すべて'}
                  </dd>
                </div>
                {filters.keyword.trim() && (
                  <div>
                    <dt>キーワード</dt>
                    <dd>{filters.keyword.trim()}</dd>
                  </div>
                )}
                <div>
                  <dt>予定件数</dt>
                  <dd>{dayItems.length}件</dd>
                </div>
              </dl>
            </section>

            <section className="no-print rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <DateSelector dates={data.dates} selected={selected} onChange={setSelected} />

                <div className="w-full lg:w-auto">
                  <button
                    type="button"
                    className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-slate-300 bg-white px-4 py-2 text-left text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 lg:hidden"
                    aria-expanded={isFilterOpen}
                    aria-controls="schedule-filters"
                    onClick={() => setIsFilterOpen((current) => !current)}
                  >
                    <span>{isFilterOpen ? '絞り込み条件を閉じる' : '絞り込み条件を表示'}</span>
                    <span className="flex shrink-0 items-center gap-2 text-xs font-semibold text-slate-500">
                      {activeFilterCount ? `${activeFilterCount}件適用中` : '条件なし'}
                      <span aria-hidden="true">{isFilterOpen ? '▲' : '▼'}</span>
                    </span>
                  </button>

                  {!isFilterOpen && activeFilterCount > 0 && (
                    <p className="mt-2 truncate text-sm text-slate-600 lg:hidden" title={filterSummary}>
                      {filterSummary}
                    </p>
                  )}

                  <div id="schedule-filters" className={`${isFilterOpen ? 'mt-4 block' : 'hidden'} lg:mt-0 lg:block`}>
                    <div className="mb-3 flex items-center justify-between gap-3 lg:hidden">
                      <p className="text-sm font-bold text-slate-800">絞り込み条件</p>
                      <button
                        type="button"
                        className="text-sm font-semibold text-indigo-600 transition hover:text-indigo-800 disabled:cursor-not-allowed disabled:text-slate-400"
                        disabled={activeFilterCount === 0}
                        onClick={() => setFilters(emptyFilters)}
                      >
                        条件をクリア
                      </button>
                    </div>
                    <Filters
                      staff={data.staff.map((s) => s.staffName)}
                      programs={data.programs}
                      statuses={data.statuses.length ? data.statuses : ['仮', '確認中', '確定', '変更あり', '中止']}
                      value={filters}
                      onChange={setFilters}
                    />
                  </div>
                </div>
              </div>
            </section>
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="screen-heading text-xl font-black text-slate-900">{selected} の社員別予定</h2>
                <div className="no-print flex flex-wrap items-center gap-2">
                  {viewMode === 'card' && (
                    <button
                      type="button"
                      className="inline-flex min-h-10 items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                      onClick={printSchedule}
                    >
                      印刷
                    </button>
                  )}
                  <div
                    className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1 shadow-sm"
                    role="group"
                    aria-label="予定の表示形式"
                  >
                    <button
                      type="button"
                      aria-pressed={viewMode === 'card'}
                      className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
                        viewMode === 'card'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-600 hover:bg-white hover:text-slate-900'
                      }`}
                      onClick={() => setViewMode('card')}
                    >
                      <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 fill-current">
                        <rect x="2" y="2" width="7" height="7" rx="1.5" />
                        <rect x="11" y="2" width="7" height="7" rx="1.5" />
                        <rect x="2" y="11" width="7" height="7" rx="1.5" />
                        <rect x="11" y="11" width="7" height="7" rx="1.5" />
                      </svg>
                      カード
                    </button>
                    <button
                      type="button"
                      aria-pressed={viewMode === 'gantt'}
                      className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
                        viewMode === 'gantt'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-600 hover:bg-white hover:text-slate-900'
                      }`}
                      onClick={() => setViewMode('gantt')}
                    >
                      <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 fill-current">
                        <rect x="2" y="3" width="10" height="3" rx="1.5" />
                        <rect x="6" y="8.5" width="12" height="3" rx="1.5" />
                        <rect x="3" y="14" width="9" height="3" rx="1.5" />
                      </svg>
                      ガント
                    </button>
                  </div>
                </div>
              </div>
              {viewMode === 'card' ? <StaffScheduleBoard items={dayItems} staff={visibleStaff} /> : <GanttView items={dayItems} staff={visibleStaff} />}
            </section>
            {viewMode === 'card' && <div className="no-print"><TimelineTable items={dayItems} /></div>}
            <p className="no-print text-xs text-slate-500">Excel本体はブラウザへ直接配信しません。アップロード済みデータがある場合はそれを優先表示します。</p>
          </>
        )}
      </div>
    </main>
  );
}
