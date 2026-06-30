const grayProgramColorStyle = 'border-gray-600 bg-gray-100 text-gray-950';

const programColorStyles = [
  'border-blue-600 bg-blue-100 text-blue-950',
  'border-purple-600 bg-purple-100 text-purple-950',
  'border-red-600 bg-red-100 text-red-950',
  'border-orange-600 bg-orange-100 text-orange-950',
  'border-green-600 bg-green-100 text-green-950',
  'border-cyan-600 bg-cyan-100 text-cyan-950',
  'border-pink-600 bg-pink-100 text-pink-950',
  'border-indigo-600 bg-indigo-100 text-indigo-950',
  'border-teal-600 bg-teal-100 text-teal-950',
  'border-yellow-600 bg-yellow-100 text-yellow-950',
  'border-lime-600 bg-lime-100 text-lime-950',
  'border-rose-600 bg-rose-100 text-rose-950',
] as const;

const leaveProgramPattern = /午前休|午後休|休暇|年休|代休|休み/;

function normalizeProgramName(programName: string | null | undefined) {
  return String(programName ?? '').trim();
}

function hashProgramName(programName: string) {
  let hash = 0;
  for (const character of programName) {
    hash = (hash * 31 + (character.codePointAt(0) ?? 0)) >>> 0;
  }
  return hash;
}

export function getProgramColorStyles(programName: string | null | undefined) {
  const normalizedProgramName = normalizeProgramName(programName);

  if (!normalizedProgramName || leaveProgramPattern.test(normalizedProgramName)) {
    return grayProgramColorStyle;
  }

  return programColorStyles[hashProgramName(normalizedProgramName) % programColorStyles.length];
}
