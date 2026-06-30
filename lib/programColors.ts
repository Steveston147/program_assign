const programColorStyles = {
  rsjp: 'border-blue-600 bg-blue-50 text-blue-950',
  rutgers: 'border-purple-600 bg-purple-50 text-purple-950',
  rdsp: 'border-red-600 bg-red-50 text-red-950',
  ou: 'border-sky-900 bg-sky-50 text-sky-950',
  bnu: 'border-orange-600 bg-orange-50 text-orange-950',
  rmit: 'border-green-600 bg-green-50 text-green-950',
  other: 'border-gray-600 bg-gray-50 text-gray-950',
} as const;

function includesProgramCode(programName: string, code: string) {
  return new RegExp(`(^|[^a-z0-9])${code}([^a-z0-9]|$)`, 'i').test(programName);
}

export function getProgramColorStyles(programName: string | null | undefined) {
  const normalizedProgramName = String(programName ?? '').trim();

  if (includesProgramCode(normalizedProgramName, 'rsjp')) return programColorStyles.rsjp;
  if (/rutgers/i.test(normalizedProgramName)) return programColorStyles.rutgers;
  if (includesProgramCode(normalizedProgramName, 'rdsp')) return programColorStyles.rdsp;
  if (includesProgramCode(normalizedProgramName, 'ou')) return programColorStyles.ou;
  if (includesProgramCode(normalizedProgramName, 'bnu')) return programColorStyles.bnu;
  if (includesProgramCode(normalizedProgramName, 'rmit')) return programColorStyles.rmit;
  return programColorStyles.other;
}
