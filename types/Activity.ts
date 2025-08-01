export type ActivityType = 'feeding' | 'sleep' | 'nappy' | 'weight';

export interface Activity {
  id: string;
  type: ActivityType;
  timestamp: string;
  duration?: number; // in minutes
  notes?: string;
  startTime?: string;
  endTime?: string;
  feedingType?: 'breast' | 'bottle' | 'mixed';
  napiyType?: 'wet' | 'dirty' | 'both';
  sleepQuality?: 'good' | 'restless' | 'poor';
  weight?: number; // in kg for weight activities
  weightUnit?: 'kg' | 'lbs';
}

export interface DailySummary {
  date: string;
  totalFeeds: number;
  totalSleepDuration: number;
  totalNappyChanges: number;
  longestSleepStretch: number;
  averageTimeBetweenFeeds: number;
  activities: Activity[];
}

export interface NHSGuideline {
  ageRangeWeeks: [number, number];
  feedingFrequency: string;
  sleepHours: string;
  nappyChanges: string;
  tips: string[];
}

export interface WeightRecord {
  id: string;
  weight: number;
  unit: 'kg' | 'lbs';
  timestamp: string;
  notes?: string;
}

export interface BabyInfo {
  name: string;
  birthDate: string;
  gender: 'boy' | 'girl' | 'other';
  birthWeight: number;
  birthWeightUnit: 'kg' | 'lbs';
  currentWeight?: number;
  currentWeightUnit?: 'kg' | 'lbs';
  feedingType: 'breastfeeding' | 'bottle' | 'mixed';
  pediatrician?: string;
  allergies?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomReminder {
  id: string;
  title: string;
  message: string;
  activityType: ActivityType;
  time: string; // HH:MM format
  date?: string; // Optional for one-time reminders
  isRecurring: boolean;
  recurringDays?: number[]; // 0-6 for Sunday-Saturday
  isActive: boolean;
  createdAt: string;
}

export interface NHSInsight {
  type: 'weight' | 'sleep' | 'feeding';
  severity: 'info' | 'warning' | 'alert';
  title: string;
  message: string;
  recommendation: string;
  icon: string;
}