export type FilterState = {
  staffName: string;
  programName: string;
  status: string;
  keyword: string;
};

type FiltersProps = {
  staff: string[];
  programs: string[];
  statuses: string[];
  value: FilterState;
  onChange: (value: FilterState) => void;
};

export default function Filters({ staff, programs, statuses, value, onChange }: FiltersProps) {
  const renderSelect = (key: 'staffName' | 'programName' | 'status', options: string[], label: string, widthClass: string) => (
    <label className={`block min-w-0 ${widthClass}`}>
      <span className="mb-1.5 block text-xs font-bold tracking-wide text-slate-600">{label}</span>
      <select
        className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm outline-none transition hover:border-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
        value={value[key]}
        onChange={(event) => onChange({ ...value, [key]: event.target.value })}
      >
        <option value="">すべて</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="no-print grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:w-auto lg:grid-cols-[180px_240px_180px_260px]">
      {renderSelect('staffName', staff, '職員名', '')}
      {renderSelect('programName', programs, 'プログラム', 'sm:col-span-2 lg:col-span-1')}
      {renderSelect('status', statuses, 'ステータス', '')}
      <label className="block min-w-0 sm:col-span-2 lg:col-span-1">
        <span className="mb-1.5 block text-xs font-bold tracking-wide text-slate-600">キーワード検索</span>
        <input
          type="search"
          className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
          value={value.keyword}
          onChange={(event) => onChange({ ...value, keyword: event.target.value })}
          placeholder="予定名・場所・備考を検索"
          aria-label="予定のキーワード検索"
        />
      </label>
    </div>
  );
}
