'use client';

import { useState } from 'react';

export default function UploadSchedulePage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function upload() {
    setLoading(true);
    setMessage('');
    setError('');

    try {
      if (!file) {
        setError('Excelファイルを選択してください。');
        setLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/upload-schedule', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();

      if (!res.ok) {
        const details = Array.isArray(json.details)
          ? json.details.map((detail: { message?: string }) => detail.message).filter(Boolean)
          : [];
        setError(details.length ? details.join('\n') : json.error || 'アップロードに失敗しました。');
        setLoading(false);
        return;
      }

      setMessage(`アップロード完了：${json.itemCount}件 / 職員${json.staffCount}名 / 最終更新 ${json.updatedAt}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'アップロードに失敗しました。');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-6">
      <div className="mx-auto max-w-3xl space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Excelアップロード</h1>
            <p className="text-sm text-gray-600">職員スケジュール管理アプリに表示するExcelをアップロードします。</p>
          </div>
          <a className="rounded border bg-white px-4 py-2" href="/">スケジュールへ戻る</a>
        </header>

        <section className="rounded-lg border bg-white p-5 shadow-sm">
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-bold">Excelファイル（.xlsx）</label>
              <input
                className="block w-full rounded border bg-white p-3"
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>

            <button
              className="rounded bg-gray-900 px-5 py-3 font-bold text-white disabled:opacity-50"
              onClick={upload}
              disabled={loading}
            >
              {loading ? 'アップロード中...' : 'アップロードして反映'}
            </button>

            {message && <div className="rounded border border-green-300 bg-green-50 p-4 text-green-800">{message}</div>}
            {error && <div className="whitespace-pre-line rounded border border-red-300 bg-red-50 p-4 text-red-800">{error}</div>}
          </div>
        </section>

        <section className="rounded-lg border bg-white p-5 text-sm leading-6 shadow-sm">
          <h2 className="mb-2 font-bold">入力ルール</h2>
          <p>シート名と1行目の英語ヘッダーは変更しないでください。</p>
          <ul className="mt-2 list-disc pl-5">
            <li>必須シート：App_Data、Master_Staff</li>
            <li>必須列：Date、StaffName、StartTime、EndTime、ProgramName、GatheringPlace、EventName、Status</li>
            <li>アップロード後、トップ画面を再読み込みすると新しい予定が表示されます。</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
