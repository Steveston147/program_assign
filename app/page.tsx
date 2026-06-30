'use client';

import { useEffect, useMemo, useState } from 'react';
import PasswordGate from '@/components/PasswordGate';
import DateSelector from '@/components/DateSelector';
import Filters, { FilterState } from '@/components/Filters';
import StaffScheduleBoard from '@/components/StaffScheduleBoard';
import TimelineTable from '@/components/TimelineTable';
import GanttView from '@/components/GanttView';
import type { ScheduleResponse } from '@/lib/types';
import { nearestDate } from '@/lib/utils';

export default function Page() {
  const [data, setData] = useState<ScheduleResponse | null>(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState('');
  const [filters, setFilters] = useState<FilterState>({ staffName: '', programName: '', status: '' });
  const [viewMode, setViewMode] = useState<'card' | 'gantt'>('card');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError('');
    const res = await fetch('/api/schedule', { cache: 'no-store' });
    if (res.status === 401) {
      setData(null);
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
    setSelected((s) => s || nearestDate(json.dates));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    setData(null);
  }

  const dayItems = useMemo(() => {
    if (!data) return [];
    return data.items
      .filter((i) => i.date === selected)
      .filter(
        (i) =>
          (!filters.staffName || i.staffName === filters.staffName) &&
          (!filters.programName || i.programName === filters.programName) &&
          (!filters.status || i.status === filters.status),
      );
  }, [data, selected, filters]);

  const visibleStaff = data
    ? filters.staffName
      ? data.staff.filter((s) => s.staffName === filters.staffName)
      : data.staff
    : [];

  if (!data && !loading) return <PasswordGate onLogin={load} />;

  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">留学サポートデスク・スケジュール管理</h1>
            <p className="text-sm text-gray-600">
              Excel読込状態: {loading ? '読込中' : error ? 'エラー' : '読込済み'} / 最終更新: {data?.updatedAt || '未設定'}
            </p>
          </div>
          {data && (
            <div className="flex flex-wrap gap-2">
              <a className="no-print rounded border bg-white px-4 py-2" href="/admin/upload">
                Excelアップロード
              </a>
              <button className="no-print rounded border bg-white px-4 py-2" onClick={logout}>
                ログアウト
              </button>
            </div>
          )}
        </header>
        {error && <div className="rounded border border-red-300 bg-red-50 p-4 text-red-800">{error}</div>}
        {loading && <div className="rounded border bg-white p-4">読み込み中...</div>}
        {data && (
          <>
            <section className="no-print rounded-lg border bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <DateSelector dates={data.dates} selected={selected} onChange={setSelected} />
                <Filters
                  staff={data.staff.map((s) => s.staffName)}
                  programs={data.programs}
                  statuses={data.statuses.length ? data.statuses : ['仮', '確認中', '確定', '変更あり', '中止']}
                  value={filters}
                  onChange={setFilters}
                />
              </div>
            </section>
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold">{selected} の社員別予定</h2>
                <div className="no-print inline-flex rounded-lg border bg-white p-1 shadow-sm">
                  <button
                    type="button"
                    className={`rounded-md px-4 py-2 text-sm font-semibold ${viewMode === 'card' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                    onClick={() => setViewMode('card')}
                  >
                    カード表示
                  </button>
                  <button
                    type="button"
                    className={`rounded-md px-4 py-2 text-sm font-semibold ${viewMode === 'gantt' ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                    onClick={() => setViewMode('gantt')}
                  >
                    ガント表示
                  </button>
                </div>
              </div>
              {viewMode === 'card' ? <StaffScheduleBoard items={dayItems} staff={visibleStaff} /> : <GanttView items={dayItems} staff={visibleStaff} />}
            </section>
            {viewMode === 'card' && <TimelineTable items={dayItems} />}
            <p className="no-print text-xs text-gray-500">Excel本体はブラウザへ直接配信しません。アップロード済みデータがある場合はそれを優先表示します。</p>
          </>
        )}
      </div>
    </main>
  );
}
