/** Pure streak calculator for sorted or unsorted YYYY-MM-DD completed dates. */
export function calculateHabitStreaks(completedDates: readonly string[], today: string): {
  currentStreak: number;
  bestStreak: number;
  completedToday: boolean;
} {
  const unique = Array.from(new Set(completedDates)).sort();
  if (unique.length === 0) {
    return { currentStreak: 0, bestStreak: 0, completedToday: false };
  }
  const completedToday = unique.includes(today);
  const toEpochDay = (dateKey: string) => Math.floor(Date.parse(`${dateKey}T00:00:00Z`) / 86_400_000);

  let bestStreak = 0;
  let run = 0;
  let prevDay: number | null = null;
  for (const date of unique) {
    const day = toEpochDay(date);
    if (prevDay !== null && day === prevDay + 1) {
      run += 1;
    } else {
      run = 1;
    }
    if (run > bestStreak) bestStreak = run;
    prevDay = day;
  }

  const todayEpoch = toEpochDay(today);
  const anchor = completedToday ? todayEpoch : todayEpoch - 1;
  const daySet = new Set(unique.map(toEpochDay));
  let currentStreak = 0;
  let cursor = anchor;
  while (daySet.has(cursor)) {
    currentStreak += 1;
    cursor -= 1;
  }

  return { currentStreak, bestStreak, completedToday };
}
