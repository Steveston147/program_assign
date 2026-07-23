import ScheduleBackupsPanel from '@/components/ScheduleBackupsPanel';

export default function UploadLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <div className="bg-slate-50 pb-12 text-slate-900">
        <div className="mx-auto max-w-3xl px-4 sm:px-7">
          <ScheduleBackupsPanel />
        </div>
      </div>
    </>
  );
}
