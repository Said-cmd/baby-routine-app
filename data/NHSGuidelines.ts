import { NHSGuideline } from '@/types/Activity';

export const NHS_GUIDELINES: NHSGuideline[] = [
  {
    ageRangeWeeks: [0, 2],
    feedingFrequency: '8-12 times per day (every 2-3 hours)',
    sleepHours: '14-17 hours per day in 2-4 hour stretches',
    nappyChanges: '6-8 wet nappies, 3-4 dirty nappies per day',
    tips: [
      'Newborns need frequent feeding around the clock',
      'Sleep patterns are irregular - this is normal',
      'Expect frequent nappy changes, especially after feeds',
      'Watch for signs of hunger: rooting, lip smacking, fussiness'
    ]
  },
  {
    ageRangeWeeks: [2, 8],
    feedingFrequency: '6-8 times per day (every 3-4 hours)',
    sleepHours: '12-16 hours per day, longer stretches at night',
    nappyChanges: '6-8 wet nappies, 2-3 dirty nappies per day',
    tips: [
      'Feeding patterns become more predictable',
      'Night sleep stretches may extend to 4-6 hours',
      'Establish bedtime routine for better sleep',
      'Growth spurts may temporarily increase feeding'
    ]
  },
  {
    ageRangeWeeks: [8, 16],
    feedingFrequency: '5-6 times per day (every 4-5 hours)',
    sleepHours: '11-15 hours per day, 6-8 hours at night',
    nappyChanges: '5-7 wet nappies, 1-2 dirty nappies per day',
    tips: [
      'Longer periods between feeds',
      'More consolidated nighttime sleep',
      'May start sleeping through the night',
      'Daytime naps become more regular'
    ]
  }
];

export const getGuidelinesForAge = (ageInWeeks: number): NHSGuideline | null => {
  return NHS_GUIDELINES.find(
    guideline => ageInWeeks >= guideline.ageRangeWeeks[0] && ageInWeeks <= guideline.ageRangeWeeks[1]
  ) || null;
};