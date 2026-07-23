'use client';

import { useEffect, useState } from 'react';
import ExcelTemplateDownloadButton from '@/components/ExcelTemplateDownloadButton';

type UploadPreview = {
  fileName: string;
  itemCount: number;
  staffCount: number;
  dateFrom: string | null;
  dateTo: string | null;
  programCount: number;
  programs: string[];
};

type ActionState = 'idle' | 'previewing' | 'uploading' | 'authenticating' | 'loggingOut';

function formatDateRange(dateFrom: string | null, dateTo: string | null) {
  if (!dateFrom || !dateTo) return '未設定';
  return dateFrom === dateTo ? dateFrom : `${dateFrom} ～ ${dateTo}`;
}

function formatUpdatedAt(updatedAt?: string) {
  if (!updatedAt) return '未設定';
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return updatedAt;

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

function errorMessage(json: { error?: string; details?: Array<{ message?: string }> }, fallback: string) {
  const details = Array.isArray(json.details) ? json.details.map((detail) => detail.message).filter(Boolean) : [];
  return details.length ? details.join('\n') : json.error || fallback;
}

export default function UploadSchedulePage() {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const [action, setAction] = useState<ActionState>('idle');
  const [preview, setPreview] = useState<UploadPreview | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loading = action !== 'idle';

  useEffect(() => {
    async function checkAdminStatus() {
      try {
        const response = await fetch('/api/admin/status', { cache: 'no-store' });
        const json = await response.json();
        setIsAdmin(Boolean(json.isAdmin));
      } catch {
        setIsAdmin(false);
      } finally {
        setChecking(false);
      }
    }

    checkAdminStatus();
  }, []);

  async function adminLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAction('authenticating');
    setError('');

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const json = await response.json();

      if (!response.ok) {
        setError(json.error || '管理者認証に失敗しました。');
        return;
      }

      setIsAdmin(true);
      setPassword('');
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : '管理者認証に失敗しました。');
    } finally {
      setAction('idle');
    }
  }

  async function adminLogout() {
    setAction('loggingOut');
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/admin/logout', { method: 'POST' });
      if (!response.ok) {
        const json = await response.json();
        setError(json.error || '管理者ログアウトに失敗しました。');
        return;
      }

      setIsAdmin(false);
      setFile(null);
      setPreview(null);
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : '管理者ログアウトに失敗しました。');
    } finally {
      setAction('idle');
    }
  }

  function selectFile(nextFile: File | null) {
    setFile(nextFile);
    setPreview(null);
    setMessage('');
    setError('');
  }

  async function previewUpload() {
    setAction('previewing');
    setMessage('');
    setError('');
    setPreview(null);

    try {
      if (!file) {
        setError('Excelファイルを選択してください。');
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/admin/preview-schedule', {
        method: 'POST',
        body: formData,
      });
      const json = await response.json();

      if (response.status === 401) {
        setIsAdmin(false);
        setError('管理者認証の有効期限が切れました。もう一度ログインしてください。');
        return;
      }

      if (!response.ok) {
        setError(errorMessage(json, 'Excelの内容確認に失敗しました。'));
        return;
      }

      setPreview(json as UploadPreview);
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : 'Excelの内容確認に失敗しました。');
    } finally {
      setAction('idle');
    }
  }

  async function upload() {
    setAction('uploading');
    setMessage('');
    setError('');

    try {
      if (!file || !preview) {
        setError('先にExcelの内容を確認してください。');
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/admin/upload-schedule', {
        method: 'POST',
        body: formData,
      });
      const json = await response.json();

      if (response.status === 401) {
        setIsAdmin(false);
        setError('管理者認証の有効期限が切れました。もう一度ログインしてください。');
        return;
      }

      if (!response.ok) {
        setError(errorMessage(json, 'アップロードに失敗しました。'));
        return;
      }

      setMessage(`アップロード完了：${json.itemCount}件 / 職員${json.staffCount}名 / 最終更新 ${formatUpdatedAt(json.updatedAt)}`);
      setPreview(null);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'アップロードに失敗しました。');
    } finally {
      setAction('idle');
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-12 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-7">
          <div>
            <p className="text-xs font-bold tracking-[.18em] text-indigo-600">ONESTOP</p>
            <h1 className="text-xl font-black">Program Assign</h1>
            <p className="text-xs text-slate-500">Ritsumeikan Study Abroad Centre</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              href="/"
            >
              スケジュールへ戻る
            </a>
            {!checking && isAdmin && (
              <button
                type="button"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
                onClick={adminLogout}
                disabled={loading}
              >
                {action === 'loggingOut' ? 'ログアウト中...' : '管理者ログアウト'}
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:px-7">
        <section className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-xs font-bold tracking-[.14em] text-indigo-600">ADMIN</p>
          <h2 className="mt-1 text-2xl font-black">Excelアップロード</h2>
          <p className="mt-1 text-sm text-slate-600">内容を確認してから、現在のスケジュールデータへ反映します。</p>
        </section>

        {checking && <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">管理者認証を確認中...</section>}

        {!checking && !isAdmin && (
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <form className="space-y-4" onSubmit={adminLogin}>
              <div>
                <label className="mb-2 block text-sm font-bold" htmlFor="admin-password">管理者パスワード</label>
                <input
                  id="admin-password"
                  className="block w-full rounded-lg border border-slate-300 bg-white p-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
              <button className="rounded-lg bg-slate-900 px-5 py-3 font-bold text-white transition hover:bg-slate-800 disabled:opacity-50" disabled={loading}>
                {action === 'authenticating' ? '認証中...' : '管理者としてログイン'}
              </button>
            </form>
          </section>
        )}

        {!checking && isAdmin && (
          <>
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-bold">Excelファイル（.xlsx）</label>
                  <input
                    className="block w-full rounded-lg border border-slate-300 bg-white p-3"
                    type="file"
                    accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={(event) => selectFile(event.target.files?.[0] || null)}
                    disabled={loading}
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <ExcelTemplateDownloadButton />
                  <button
                    type="button"
                    className="rounded-lg bg-slate-900 px-5 py-3 font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={previewUpload}
                    disabled={loading || !file}
                  >
                    {action === 'previewing' ? '内容確認中...' : '内容を確認'}
                  </button>
                </div>

                {preview && (
                  <section className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-950">
                    <h3 className="text-lg font-black">アップロード内容の確認</h3>
                    <p className="mt-1 break-all text-sm">{preview.fileName}</p>
                    <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-amber-200 bg-white/70 p-3">
                        <dt className="text-xs font-bold text-amber-800">予定</dt>
                        <dd className="mt-1 text-xl font-black">{preview.itemCount}件</dd>
                      </div>
                      <div className="rounded-lg border border-amber-200 bg-white/70 p-3">
                        <dt className="text-xs font-bold text-amber-800">職員</dt>
                        <dd className="mt-1 text-xl font-black">{preview.staffCount}名</dd>
                      </div>
                      <div className="rounded-lg border border-amber-200 bg-white/70 p-3 sm:col-span-2">
                        <dt className="text-xs font-bold text-amber-800">対象期間</dt>
                        <dd className="mt-1 font-bold">{formatDateRange(preview.dateFrom, preview.dateTo)}</dd>
                      </div>
                      <div className="rounded-lg border border-amber-200 bg-white/70 p-3 sm:col-span-2">
                        <dt className="text-xs font-bold text-amber-800">プログラム</dt>
                        <dd className="mt-1 font-bold">{preview.programCount}件</dd>
                        <dd className="mt-1 break-words text-sm">{preview.programs.join('、') || '未設定'}</dd>
                      </div>
                    </dl>
                    <p className="mt-4 text-sm font-bold">この内容で現在の予定データを更新します。</p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        className="rounded-lg border border-slate-300 bg-white px-5 py-3 font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                        onClick={() => setPreview(null)}
                        disabled={loading}
                      >
                        戻る
                      </button>
                      <button
                        type="button"
                        className="rounded-lg bg-rose-700 px-5 py-3 font-bold text-white transition hover:bg-rose-800 disabled:opacity-50"
                        onClick={upload}
                        disabled={loading}
                      >
                        {action === 'uploading' ? '更新中...' : 'この内容で更新する'}
                      </button>
                    </div>
                  </section>
                )}

                {message && (
                  <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-emerald-800">
                    <p>{message}</p>
                    <a className="mt-3 inline-flex font-bold underline underline-offset-4" href="/">トップ画面で確認する</a>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 text-sm leading-6 shadow-sm">
              <h2 className="mb-2 font-bold">入力ルール</h2>
              <p>シート名と1行目の英語ヘッダーは変更しないでください。</p>
              <ul className="mt-2 list-disc pl-5">
                <li>必須シート：App_Data、Master_Staff</li>
                <li>必須列：Date、StaffName、StartTime、EndTime、ProgramName、GatheringPlace、EventName、Status</li>
                <li>ひな形の2行目は入力例です。実際の予定・職員情報に置き換えてください。</li>
                <li>内容確認ではデータは更新されません。「この内容で更新する」を押した時点で反映されます。</li>
              </ul>
            </section>
          </>
        )}

        {error && <div className="whitespace-pre-line rounded-lg border border-rose-300 bg-rose-50 p-4 text-rose-800">{error}</div>}
      </div>
    </main>
  );
}
