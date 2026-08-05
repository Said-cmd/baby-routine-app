private static calculateAverageWakeWindow(sleepActivities: any[]): number {
  if (sleepActivities.length < 2) {
    return 180; // Default 3 hours if insufficient data
  }

  const windows: number[] = [];
  for (let i = 1; i < sleepActivities.length; i++) {
    const prev = sleepActivities[i - 1];
    const prevEnd =
      new Date(prev.timestamp).getTime() + (prev.duration || 0) * 60 * 1000;
    const gapMinutes =
      (new Date(sleepActivities[i].timestamp).getTime() - prevEnd) / (1000 * 60);

    // Only consider reasonable wake windows (30 minutes to 8 hours)
    if (gapMinutes >= 30 && gapMinutes <= 480) {
      windows.push(gapMinutes);
    }
  }

  if (windows.length === 0) return 180;

  windows.sort((a, b) => a - b);
  const q1 = windows[Math.floor(windows.length * 0.25)];
  const q3 = windows[Math.floor(windows.length * 0.75)];
  const iqr = q3 - q1;
  const filtered = windows.filter(
    (w) => w >= q1 - 1.5 * iqr && w <= q3 + 1.5 * iqr
  );

  return Math.round(
    filtered.reduce((sum, w) => sum + w, 0) / filtered.length
  );
}
