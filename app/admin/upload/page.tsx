'use client';

import { useEffect, useState } from 'react';
import ExcelTemplateDownloadButton from '@/components/ExcelTemplateDownloadButton';

export default function UploadSchedulePage() {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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
    setLoading(true);
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
      setLoading(false);
    }
  }

  async function adminLogout() {
    setLoading(true);
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
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : '管理者ログアウトに失敗しました。');
    } finally {
      setLoading(false);
    }
  }

  async function upload() {
    setLoading(true);
    setMessage('');
    setError('');

    try {
      if (!file) {
        setError('Excelファイルを選択してください。');
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
        const details = Array.isArray(json.details)
          ? json.details.map((detail: { message?: string }) => detail.message).filter(Boolean)
          : [];
        setError(details.length ? details.join('\n') : json.error || 'アップロードに失敗しました。');
        return;
      }

      setMessage(`アップロード完了：${json.itemCount}件 / 職員${json.staffCount}名 / 最終更新 ${json.updatedAt}`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'アップロードに失敗しました。');
    } finally {
      setLoading(false);
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
                管理者ログアウト
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:px-7">
        <section className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-xs font-bold tracking-[.14em] text-indigo-600">ADMIN</p>
          <h2 className="mt-1 text-2xl font-black">Excelアップロード</h2>
          <p className="mt-1 text-sm text-slate-600">管理者だけがスケジュールデータを更新できます。</p>
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
                {loading ? '認証中...' : '管理者としてログイン'}
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
                    onChange={(event) => setFile(event.target.files?.[0] || null)}
                  />
                </div>

                <ExcelTemplateDownloadButton />

                <button
                  className="rounded-lg bg-slate-900 px-5 py-3 font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
                  onClick={upload}
                  disabled={loading}
                >
                  {loading ? 'アップロード中...' : 'アップロードして反映'}
                </button>

                {message && <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-emerald-800">{message}</div>}
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 text-sm leading-6 shadow-sm">
              <h2 className="mb-2 font-bold">入力ルール</h2>
              <p>シート名と1行目の英語ヘッダーは変更しないでください。</p>
              <ul className="mt-2 list-disc pl-5">
                <li>必須シート：App_Data、Master_Staff</li>
                <li>必須列：Date、StaffName、StartTime、EndTime、ProgramName、GatheringPlace、EventName、Status</li>
                <li>ひな形の黄色い2行目は入力例です。実際の予定・職員情報に置き換えてください。</li>
                <li>アップロード後、トップ画面を再読み込みすると新しい予定が表示されます。</li>
              </ul>
            </section>
          </>
        )}

        {error && <div className="whitespace-pre-line rounded-lg border border-rose-300 bg-rose-50 p-4 text-rose-800">{error}</div>}
      </div>
    </main>
  );
}
