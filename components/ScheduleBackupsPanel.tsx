'use client';

import { useCallback, useEffect, useState } from 'react';

type ScheduleBackup = {
  pathname: string;
  createdAt: string;
  itemCount: number;
  staffCount: number;
  dateFrom: string;
  dateTo: string;
  programCount: number;
  programs: string[];
};

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || '日時不明';
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function formatDateRange(dateFrom: string, dateTo: string): string {
  if (!dateFrom || !dateTo) return '未設定';
  return dateFrom === dateTo ? dateFrom : `${dateFrom} ～ ${dateTo}`;
}

export default function ScheduleBackupsPanel() {
  const [backups, setBackups] = useState<ScheduleBackup[]>([]);
  const [selected, setSelected] = useState<ScheduleBackup | null>(null);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadBackups = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/schedule-backups', { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'バックアップ一覧を読み込めませんでした。');
      setBackups(Array.isArray(json.backups) ? json.backups : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'バックアップ一覧を読み込めませんでした。');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBackups();
  }, [loadBackups]);

  async function restoreBackup() {
    if (!selected) return;
    setRestoring(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch('/api/admin/schedule-backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pathname: selected.pathname }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'バックアップの復元に失敗しました。');
      setMessage(`${formatDateTime(selected.createdAt)} のバックアップを復元しました。`);
      setSelected(null);
      await loadBackups();
    } catch (restoreError) {
      setError(restoreError instanceof Error ? restoreError.message : 'バックアップの復元に失敗しました。');
    } finally {
      setRestoring(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-black">バックアップ</h2>
          <p className="mt-1 text-sm text-slate-600">Excel更新直前の予定データを自動保存します。直近10件を表示します。</p>
        </div>
        <button
          type="button"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          onClick={loadBackups}
          disabled={loading || restoring}
        >
          {loading ? '読込中...' : '一覧を更新'}
        </button>
      </div>

      {message && (
        <div className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800">
          <p>{message}</p>
          <a className="mt-2 inline-flex font-bold underline underline-offset-4" href="/">トップ画面で確認する</a>
        </div>
      )}
      {error && <div className="mt-4 rounded-lg border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>}

      {!loading && backups.length === 0 && (
        <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          バックアップはまだありません。次回のExcel更新直前から自動保存されます。
        </p>
      )}

      {backups.length > 0 && (
        <div className="mt-4 space-y-3">
          {backups.map((backup) => (
            <div key={backup.pathname} className="rounded-lg border border-slate-200 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-black">{formatDateTime(backup.createdAt)}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    予定{backup.itemCount}件 ／ 職員{backup.staffCount}名 ／ {formatDateRange(backup.dateFrom, backup.dateTo)}
                  </p>
                  <p className="mt-1 break-words text-xs text-slate-500">
                    プログラム{backup.programCount}件：{backup.programs.join('、') || '未設定'}
                  </p>
                </div>
                <button
                  type="button"
                  className="shrink-0 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                  onClick={() => {
                    setSelected(backup);
                    setMessage('');
                    setError('');
                  }}
                  disabled={restoring}
                >
                  復元内容を確認
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-950">
          <h3 className="font-black">バックアップ復元の確認</h3>
          <p className="mt-2 text-sm">
            {formatDateTime(selected.createdAt)}、予定{selected.itemCount}件・職員{selected.staffCount}名の状態へ戻します。
          </p>
          <p className="mt-2 text-sm font-bold">現在のデータは、復元する直前にもう一度自動バックアップされます。</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-lg border border-slate-300 bg-white px-5 py-3 font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              onClick={() => setSelected(null)}
              disabled={restoring}
            >
              戻る
            </button>
            <button
              type="button"
              className="rounded-lg bg-rose-700 px-5 py-3 font-bold text-white transition hover:bg-rose-800 disabled:opacity-50"
              onClick={restoreBackup}
              disabled={restoring}
            >
              {restoring ? '復元中...' : 'このバックアップを復元する'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
