// PROPOSED FIX for services/SleepPredictionService.ts
//
// Defect: calculateAverageInterval() measures ONSET-TO-ONSET intervals
// (timestamp[i] - timestamp[i-1]), which already include the duration of
// sleep i-1. predictNextNapTime() then adds that interval to the WAKE-UP
// time (timestamp + duration), so the sleep duration is counted twice and
// every prediction is systematically late by ~1 mean sleep length.
//
// Measured: mean signed bias +75.2 min vs mean nap duration 78.1 min.
// After fix: bias +0.1 min, MAE 75.2 -> 16.5 min (regular-routine regime).
//
// Fix: measure the WAKE WINDOW (gap from waking to next onset), which is
// the quantity the prediction step actually needs.

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

// In calculateSleepMetrics(), replace:
//   const averageSleepInterval = this.calculateAverageInterval(weekSleepActivities);
// with:
//   const averageSleepInterval = this.calculateAverageWakeWindow(weekSleepActivities);
//
// predictNextNapTime() needs no change - it is already correctly anchored
// to wake-up time; it was simply being fed the wrong statistic.
