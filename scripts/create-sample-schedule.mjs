import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const dataDir = path.join(repoRoot, 'data');
const seedPath = path.join(dataDir, 'schedule.seed.json');
const outputPath = path.join(dataDir, 'schedule.xlsx');

if (fs.existsSync(outputPath)) {
  console.log('data/schedule.xlsx already exists; leaving it unchanged.');
  process.exit(0);
}

if (!fs.existsSync(seedPath)) {
  throw new Error('data/schedule.seed.json not found; cannot create sample workbook.');
}

const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
fs.mkdirSync(dataDir, { recursive: true });

const workbook = XLSX.utils.book_new();
const appData = XLSX.utils.json_to_sheet(seed.App_Data ?? []);
const masterStaff = XLSX.utils.json_to_sheet(seed.Master_Staff ?? []);
XLSX.utils.book_append_sheet(workbook, appData, 'App_Data');
XLSX.utils.book_append_sheet(workbook, masterStaff, 'Master_Staff');
XLSX.writeFile(workbook, outputPath);
console.log('Created sample data/schedule.xlsx from data/schedule.seed.json.');
