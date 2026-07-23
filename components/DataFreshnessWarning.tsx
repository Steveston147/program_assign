'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';

type WarningState = {
  message: string;
  isAdmin: boolean;
};

const STALE_AFTER_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

export default function DataFreshnessWarning() {
  const pathname = usePathname();
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [warning, setWarning] = useState<WarningState | null>(null);

  useEffect(() => {
    if (pathname !== '/') {
      setTarget(null);
      setWarning(null);
      return;
    }

    const statusSection = document.querySelector<HTMLElement>('.print-content > section.no-print');
    if (!statusSection?.parentElement) return;

    const host = document.createElement('div');
    statusSection.insertAdjacentElement('afterend', host);
    setTarget(host);

    let cancelled = false;

    async function loadWarning() {
      try {
        const [scheduleResponse, adminResponse] = await Promise.all([
          fetch('/api/schedule', { cache: 'no-store' }),
          fetch('/api/admin/status', { cache: 'no-store' }),
        ]);

        if (!scheduleResponse.ok || cancelled) return;

        const schedule = await scheduleResponse.json();
        const admin = adminResponse.ok ? await adminResponse.json() : { isAdmin: false };

        if (schedule.source === 'seed') return;

        const updatedAt = typeof schedule.updatedAt === 'string' ? new Date(schedule.updatedAt) : null;
        if (!updatedAt || Number.isNaN(updatedAt.getTime())) {
          setWarning({
            message: '最終更新日時を確認できません。最新のExcelが反映されているか確認してください。',
            isAdmin: Boolean(admin.isAdmin),
          });
          return;
        }

        const elapsedDays = Math.max(0, Math.floor((Date.now() - updatedAt.getTime()) / DAY_MS));
        if (elapsedDays < STALE_AFTER_DAYS) return;

        setWarning({
          message: `最終更新から${elapsedDays}日経過しています。最新のExcelが反映されているか確認してください。`,
          isAdmin: Boolean(admin.isAdmin),
        });
      } catch {
        // 読み込み失敗時は既存画面のエラー表示へ任せ、追加警告は表示しません。
      }
    }

    loadWarning();

    return () => {
      cancelled = true;
      host.remove();
    };
  }, [pathname]);

  if (!target || !warning) return null;

  return createPortal(
    <div className="no-print mx-4 mt-[-0.25rem] rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm sm:mx-7">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p>
          {warning.message}
          {!warning.isAdmin ? ' 必要に応じて管理者へ更新を依頼してください。' : ''}
        </p>
        {warning.isAdmin ? (
          <a
            className="inline-flex w-fit shrink-0 items-center rounded-lg border border-amber-300 bg-white px-3 py-1.5 font-bold text-amber-900 transition hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
            href="/admin/upload"
          >
            Excelを更新
          </a>
        ) : null}
      </div>
    </div>,
    target,
  );
}
