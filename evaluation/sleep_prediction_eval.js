// Evaluation harness for Baby Routine's SleepPredictionService.
// The two functions below are copied VERBATIM from
// services/SleepPredictionService.ts (only `private static` -> `function`,
// and typing removed) so that what is measured is the shipped algorithm.

// ---------- SHIPPED ALGORITHM (verbatim) ----------
function calculateAverageInterval(sleepActivities) {
  if (sleepActivities.length < 2) {
    return 180; // Default 3 hours if insufficient data
  }
  const intervals = [];
  for (let i = 1; i < sleepActivities.length; i++) {
    const currentTime = new Date(sleepActivities[i].timestamp).getTime();
    const previousTime = new Date(sleepActivities[i - 1].timestamp).getTime();
    const intervalMinutes = (currentTime - previousTime) / (1000 * 60);
    // Only consider reasonable intervals (30 minutes to 8 hours)
    if (intervalMinutes >= 30 && intervalMinutes <= 480) {
      intervals.push(intervalMinutes);
    }
  }
  if (intervals.length === 0) {
    return 180; // Default 3 hours
  }
  intervals.sort((a, b) => a - b);
  const q1 = intervals[Math.floor(intervals.length * 0.25)];
  const q3 = intervals[Math.floor(intervals.length * 0.75)];
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  const filteredIntervals = intervals.filter(
    (interval) => interval >= lowerBound && interval <= upperBound
  );
  const average =
    filteredIntervals.reduce((sum, interval) => sum + interval, 0) /
    filteredIntervals.length;
  return Math.round(average);
}

function predictNextNapTime(sleepActivities, averageInterval, now) {
  if (sleepActivities.length === 0) return null;
  const lastSleep = sleepActivities[0]; // Most recent sleep (desc order)
  const lastSleepTime = new Date(lastSleep.timestamp);
  const lastSleepDuration = lastSleep.duration || 0;
  const wakeUpTime = new Date(lastSleepTime.getTime() + lastSleepDuration * 60 * 1000);
  const predictedNapTime = new Date(wakeUpTime.getTime() + averageInterval * 60 * 1000);
  if (predictedNapTime <= now) {
    const intervalsPassed = Math.ceil(
      (now.getTime() - predictedNapTime.getTime()) / (averageInterval * 60 * 1000)
    );
    return new Date(predictedNapTime.getTime() + intervalsPassed * averageInterval * 60 * 1000);
  }
  return predictedNapTime;
}

function calculateConfidenceLevel(dataPoints) {
  if (dataPoints >= 10) return 'high';
  else if (dataPoints >= 5) return 'medium';
  else return 'low';
}

// ---------- BASELINE VARIANTS (for comparison) ----------
function intervalFixed180() { return 180; }

// Corrected: measure the WAKE WINDOW (gap between waking and next sleep),
// which is the quantity the prediction step actually needs, since the
// prediction is anchored to wake-up time rather than to sleep onset.
function intervalWakeWindow(acts) {
  if (acts.length < 2) return 180;
  const w = [];
  for (let i = 1; i < acts.length; i++) {
    const prevEnd = new Date(acts[i - 1].timestamp).getTime() + (acts[i - 1].duration || 0) * 60000;
    const gap = (new Date(acts[i].timestamp).getTime() - prevEnd) / 60000;
    if (gap >= 30 && gap <= 480) w.push(gap);
  }
  if (!w.length) return 180;
  w.sort((a, b) => a - b);
  const q1 = w[Math.floor(w.length * 0.25)], q3 = w[Math.floor(w.length * 0.75)];
  const iqr = q3 - q1;
  const f = w.filter((x) => x >= q1 - 1.5 * iqr && x <= q3 + 1.5 * iqr);
  return Math.round(f.reduce((a, b) => a + b, 0) / f.length);
}

function intervalPlainMean(acts) {
  if (acts.length < 2) return 180;
  const iv = [];
  for (let i = 1; i < acts.length; i++) {
    iv.push((new Date(acts[i].timestamp) - new Date(acts[i - 1].timestamp)) / 60000);
  }
  return Math.round(iv.reduce((a, b) => a + b, 0) / iv.length);
}

function intervalTrueMedian(acts) {
  // What the REPORT describes: median of IQR-filtered intervals
  if (acts.length < 2) return 180;
  const intervals = [];
  for (let i = 1; i < acts.length; i++) {
    const m = (new Date(acts[i].timestamp) - new Date(acts[i - 1].timestamp)) / 60000;
    if (m >= 30 && m <= 480) intervals.push(m);
  }
  if (intervals.length === 0) return 180;
  intervals.sort((a, b) => a - b);
  const q1 = intervals[Math.floor(intervals.length * 0.25)];
  const q3 = intervals[Math.floor(intervals.length * 0.75)];
  const iqr = q3 - q1;
  const f = intervals.filter((x) => x >= q1 - 1.5 * iqr && x <= q3 + 1.5 * iqr);
  const mid = Math.floor(f.length / 2);
  return Math.round(f.length % 2 ? f[mid] : (f[mid - 1] + f[mid]) / 2);
}

// ---------- SYNTHETIC DATA GENERATION ----------
// Seeded RNG for reproducibility
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gauss(rnd, mu, sd) {
  const u = 1 - rnd(), v = rnd();
  return mu + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * Generate a plausible infant sleep log.
 * Structure reflects documented infant sleep: several short daytime naps
 * separated by wake windows, plus one long consolidated night sleep.
 * regularity: sd of the wake-window in minutes (lower = more regular baby)
 */
function generateLog(rnd, days, wakeWindowMean, regularity) {
  const acts = [];
  let t = new Date('2025-03-01T07:00:00Z').getTime();
  for (let d = 0; d < days; d++) {
    const napsToday = 4;
    for (let n = 0; n < napsToday; n++) {
      const dur = Math.max(20, Math.round(gauss(rnd, 75, 25))); // nap length
      acts.push({ timestamp: new Date(t).toISOString(), duration: dur });
      const wake = Math.max(30, Math.round(gauss(rnd, wakeWindowMean, regularity)));
      t += (dur + wake) * 60000;
    }
    // night sleep
    const nightDur = Math.max(360, Math.round(gauss(rnd, 600, 60)));
    acts.push({ timestamp: new Date(t).toISOString(), duration: nightDur });
    const morningWake = Math.max(30, Math.round(gauss(rnd, wakeWindowMean, regularity)));
    t += (nightDur + morningWake) * 60000;
  }
  return acts;
}

// ---------- EVALUATION ----------
function evaluate(strategyFn, logsAsc) {
  // Walk-forward: for each sleep event i (with >=2 priors), use only events
  // up to i-1 to predict when event i will start. Compare to ground truth.
  const errors = [];
  const signed = [];
  const byConfidence = { high: [], medium: [], low: [] };
  for (let i = 2; i < logsAsc.length; i++) {
    const historyAsc = logsAsc.slice(Math.max(0, i - 20), i); // recent window
    const actual = new Date(logsAsc[i].timestamp);
    const interval = strategyFn(historyAsc);
    const desc = [...historyAsc].reverse(); // service expects desc order
    // "now" = moment the last known sleep ended (realistic decision point)
    const last = historyAsc[historyAsc.length - 1];
    const now = new Date(new Date(last.timestamp).getTime() + (last.duration || 0) * 60000);
    const pred = predictNextNapTime(desc, interval, now);
    if (!pred) continue;
    const errMin = Math.abs((pred - actual) / 60000);
    signed.push((pred - actual) / 60000);
    errors.push(errMin);
    byConfidence[calculateConfidenceLevel(historyAsc.length)].push(errMin);
  }
  return { errors, signed, byConfidence };
}

function stats(arr) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const median = s[Math.floor(s.length / 2)];
  const p90 = s[Math.floor(s.length * 0.9)];
  const within30 = (arr.filter((e) => e <= 30).length / arr.length) * 100;
  const within60 = (arr.filter((e) => e <= 60).length / arr.length) * 100;
  return { n: arr.length, mae: mean, median, p90, within30, within60 };
}

// ---------- RUN ----------
const SEEDS = 200;
const DAYS = 14;
const strategies = {
  'Shipped (IQR-filtered mean)': calculateAverageInterval,
  'Report-described (IQR-filtered median)': intervalTrueMedian,
  'Plain mean (no filtering)': intervalPlainMean,
  'Fixed 3h baseline': intervalFixed180,
  'Corrected (wake-window mean)': intervalWakeWindow,
};

const scenarios = [
  { name: 'Regular routine (wake window sd=20 min)', ww: 150, reg: 20 },
  { name: 'Irregular routine (wake window sd=60 min)', ww: 150, reg: 60 },
];

const results = {};
for (const sc of scenarios) {
  results[sc.name] = {};
  const pooled = {};
  for (const k of Object.keys(strategies)) pooled[k] = { errors: [], signed: [], byConfidence: { high: [], medium: [], low: [] } };
  for (let s = 0; s < SEEDS; s++) {
    const rnd = mulberry32(s + 1);
    const log = generateLog(rnd, DAYS, sc.ww, sc.reg);
    for (const [name, fn] of Object.entries(strategies)) {
      const r = evaluate(fn, log);
      pooled[name].errors.push(...r.errors);
      pooled[name].signed.push(...r.signed);
      for (const c of ['high', 'medium', 'low']) pooled[name].byConfidence[c].push(...r.byConfidence[c]);
    }
  }
  for (const [name, p] of Object.entries(pooled)) {
    const mb = p.signed.reduce((a, b) => a + b, 0) / p.signed.length;
    results[sc.name][name] = { meanBias: mb, overall: stats(p.errors), byConfidence: {
      high: stats(p.byConfidence.high), medium: stats(p.byConfidence.medium), low: stats(p.byConfidence.low) } };
  }
}

console.log(JSON.stringify({ SEEDS, DAYS, results }, null, 2));
