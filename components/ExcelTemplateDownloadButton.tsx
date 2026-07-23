'use client';

import * as XLSX from 'xlsx';

const APP_DATA_HEADERS = [
  'Date',
  'StaffName',
  'StartTime',
  'EndTime',
  'ProgramName',
  'Role',
  'GatheringTime',
  'GatheringPlace',
  'EventName',
  'Destination',
  'Status',
  'Notes',
  'UpdatedAt',
];

const STAFF_HEADERS = ['StaffId', 'StaffName', 'DisplayOrder', 'Active', 'Notes'];

export default function ExcelTemplateDownloadButton() {
  function downloadTemplate() {
    const workbook = XLSX.utils.book_new();

    const appData = XLSX.utils.aoa_to_sheet([
      APP_DATA_HEADERS,
      [
        '2026-08-03',
        '田中',
        '09:00',
        '10:00',
        '入力例',
        '担当',
        '08:50',
        '明学館1階',
        'オリエンテーション',
        '衣笠キャンパス',
        '仮',
        'この行を実際の予定に置き換えてください。',
        '',
      ],
    ]);
    appData['!cols'] = [
      { wch: 13 }, { wch: 14 }, { wch: 11 }, { wch: 11 }, { wch: 18 }, { wch: 12 }, { wch: 14 },
      { wch: 20 }, { wch: 24 }, { wch: 20 }, { wch: 12 }, { wch: 38 }, { wch: 20 },
    ];

    const staff = XLSX.utils.aoa_to_sheet([
      STAFF_HEADERS,
      ['001', '田中', 1, true, 'この行を実際の職員情報に置き換えてください。'],
    ]);
    staff['!cols'] = [{ wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 10 }, { wch: 42 }];

    const guide = XLSX.utils.aoa_to_sheet([
      ['Program Assign アップロード用ひな形'],
      ['2行目は入力例です。実際の予定・職員情報に置き換えてください。'],
      ['シート名 App_Data / Master_Staff と1行目の英語ヘッダーは変更しないでください。'],
      ['Date は yyyy-mm-dd、時刻は HH:mm で入力してください。'],
      ['App_Data の必須列：Date、StaffName、StartTime、EndTime、ProgramName、GatheringPlace、EventName、Status'],
      ['Master_Staff の StaffName は App_Data の StaffName と同じ表記にしてください。'],
    ]);
    guide['!cols'] = [{ wch: 90 }];

    XLSX.utils.book_append_sheet(workbook, appData, 'App_Data');
    XLSX.utils.book_append_sheet(workbook, staff, 'Master_Staff');
    XLSX.utils.book_append_sheet(workbook, guide, '入力方法');
    XLSX.writeFile(workbook, 'Program_Assign_アップロード用ひな形.xlsx');
  }

  return (
    <button
      type="button"
      className="inline-flex w-fit items-center rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
      onClick={downloadTemplate}
    >
      アップロード用ひな形をダウンロード
    </button>
  );
}
