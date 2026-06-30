const grayProgramColorStyle = 'border-gray-600 bg-gray-100 text-gray-950';

const programColorPalette = [
  'border-blue-600 bg-blue-100 text-blue-950',
  'border-purple-600 bg-purple-100 text-purple-950',
  'border-red-600 bg-red-100 text-red-950',
  'border-sky-600 bg-sky-100 text-sky-950',
  'border-orange-600 bg-orange-100 text-orange-950',
  'border-green-600 bg-green-100 text-green-950',
  'border-teal-600 bg-teal-100 text-teal-950',
  'border-pink-600 bg-pink-100 text-pink-950',
  'border-indigo-600 bg-indigo-100 text-indigo-950',
  'border-amber-600 bg-amber-100 text-amber-950',
] as const;

const vacationProgramKeywords = ['午前休', '午後休', '休暇', '年休', '代休', '休み'] as const;

function normalizeProgramName(programName: string | null | undefined) {
  return String(programName ?? '').trim();
}

function isVacationProgram(programName: string) {
  return vacationProgramKeywords.some((keyword) => programName.includes(keyword));
}

function hashString(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }

  return hash;
}

export function getProgramColorStyles(programName: string | null | undefined) {
  const normalizedProgramName = normalizeProgramName(programName);

  if (!normalizedProgramName || isVacationProgram(normalizedProgramName)) {
    return grayProgramColorStyle;
  }

  return programColorPalette[hashString(normalizedProgramName) % programColorPalette.length];
}
