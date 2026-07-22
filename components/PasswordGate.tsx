'use client';

import { useState } from 'react';

export default function PasswordGate({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');

    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    setLoading(false);

    if (response.ok) {
      onLogin();
      return;
    }

    setError((await response.json()).error || 'ログインできません');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-6">
      <div className="w-full max-w-md space-y-4">
        <form onSubmit={submit} className="rounded-lg border bg-white p-8 shadow">
          <h1 className="mb-6 text-2xl font-bold">職員スケジュール管理</h1>
          <label className="block text-sm font-medium">共有パスワード</label>
          <input
            type="password"
            className="mt-2 w-full rounded border p-3"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoFocus
          />
          {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
          <button
            className="mt-6 w-full rounded bg-gray-900 px-4 py-3 font-semibold text-white disabled:opacity-50"
            disabled={loading}
          >
            {loading ? '確認中' : 'ログイン'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600">
          Excelを更新する管理者は{' '}
          <a className="font-medium underline underline-offset-4 hover:text-gray-900" href="/admin/upload">
            こちら
          </a>
        </p>
      </div>
    </main>
  );
}
