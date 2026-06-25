import assert from 'node:assert/strict';

const REQUIRED = ['Date','StaffName','StartTime','EndTime','ProgramName','GatheringPlace','EventName','Status'];

function excelSerialToDateParts(serial) {
  // Matches Excel/xlsx calendar-date serial handling for modern dates.
  const epoch = Date.UTC(1899, 11, 30);
  const date = new Date(epoch + Math.floor(serial) * 24 * 60 * 60 * 1000);
  return { y: date.getUTCFullYear(), m: date.getUTCMonth() + 1, d: date.getUTCDate() };
}

function parseExcelDate(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const d = excelSerialToDateParts(value);
    return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  const m = String(value).trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  return m ? `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` : null;
}

function parseExcelTime(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const total = Math.round(((((value % 1) + 1) % 1) * 24 * 60)) % (24 * 60);
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }
  const m = String(value).trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  return hour <= 23 && minute <= 59 ? `${String(hour).padStart(2, '0')}:${m[2]}` : null;
}

assert.equal(parseExcelDate('2026-06-29'), '2026-06-29');
assert.equal(parseExcelDate(' 2026/6/29 '), '2026-06-29');
assert.equal(parseExcelDate(46202), '2026-06-29');
assert.equal(parseExcelTime('09:00'), '09:00');
assert.equal(parseExcelTime('9:00'), '09:00');
assert.equal(parseExcelTime('09:00:00'), '09:00');
assert.equal(parseExcelTime(0.375), '09:00');

const rows = [
  { Date: '2026-06-29', StaffName: 'A', StartTime: '09:00', EndTime: '10:00', ProgramName: 'P', GatheringPlace: 'G', EventName: 'E', Status: '予定' },
  { Date: '', StaffName: '', StartTime: '', EndTime: '', ProgramName: '', GatheringPlace: '', EventName: '', Status: '' },
];
const dataRows = rows.filter((row) => !REQUIRED.every((column) => String(row[column] ?? '').trim() === ''));
assert.equal(dataRows.length, 1, 'blank row should be skipped');

console.log('excel parser sample cases passed');
