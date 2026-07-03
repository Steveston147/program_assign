const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getTodayInTokyo = () => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
};

const shiftDate = (dateString: string, days: number) => {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return formatDate(date);
};

export default function DateSelector({ dates, selected, onChange }:{dates:string[]; selected:string; onChange:(d:string)=>void}){ const shift=(n:number)=>{ onChange(shiftDate(selected, n)); }; return <div className="no-print flex flex-wrap items-end gap-2"><button className="rounded border bg-white px-3 py-2" onClick={()=>shift(-1)}>前日</button><div><label className="block text-xs">日付</label><input list="date-list" type="date" value={selected} onChange={e=>onChange(e.target.value)} className="rounded border px-3 py-2"/><datalist id="date-list">{dates.map(d=><option key={d} value={d}/>)}</datalist></div><button className="rounded border bg-white px-3 py-2" onClick={()=>shift(1)}>翌日</button><button className="rounded border bg-white px-3 py-2" onClick={()=>onChange(getTodayInTokyo())}>今日</button></div> }
