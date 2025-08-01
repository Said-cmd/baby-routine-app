import { DataService } from './DataService';
import { NHSInsight, WeightRecord, Activity } from '@/types/Activity';

export class NHSInsightsService {
  /**
   * Generate NHS development insights based on baby's data
   */
  static async generateInsights(babyBirthDate?: string, babyName?: string, babyGender?: string): Promise<NHSInsight[]> {
    const insights: NHSInsight[] = [];
    
    try {
      // Calculate baby's age in weeks
      const ageInWeeks = babyBirthDate 
        ? this.calculateAgeInWeeks(new Date(babyBirthDate))
        : 4; // Default to 4 weeks if no birth date

      // Always provide positive developmental insights for healthy babies
      const developmentalInsights = await this.getDevelopmentalInsights(ageInWeeks, babyName, babyGender);
      insights.push(...developmentalInsights);

      // Get weight insights
      const weightInsights = await this.getWeightInsights(ageInWeeks, babyName);
      insights.push(...weightInsights);

      // Get sleep insights
      const sleepInsights = await this.getSleepInsights(ageInWeeks, babyName);
      insights.push(...sleepInsights);

      // Get feeding insights
      const feedingInsights = await this.getFeedingInsights(ageInWeeks, babyName);
      insights.push(...feedingInsights);

      return insights;
    } catch (error) {
      console.error('Error generating NHS insights:', error);
      return [];
    }
  }

  private static async getDevelopmentalInsights(ageInWeeks: number, babyName?: string, babyGender?: string): Promise<NHSInsight[]> {
    const insights: NHSInsight[] = [];
    const name = babyName || 'Baby';
    const pronoun = babyGender === 'girl' ? 'she' : babyGender === 'boy' ? 'he' : 'they';
    const possessive = babyGender === 'girl' ? 'her' : babyGender === 'boy' ? 'his' : 'their';
    
    // Provide age-appropriate developmental insights
    if (ageInWeeks >= 24) { // 6+ months
      insights.push({
        type: 'feeding',
        severity: 'info',
        title: 'Weaning Stage',
        message: `${name} is at the perfect age to explore solid foods alongside ${possessive} milk feeds.`,
        recommendation: `Introduce a variety of textures and flavors. Baby-led weaning can help develop ${possessive} motor skills.`,
        icon: 'nutrition'
      });
      
      insights.push({
        type: 'sleep',
        severity: 'info',
        title: 'Sleep Development',
        message: `At 6+ months, ${name} can typically sleep for longer stretches at night.`,
        recommendation: `Most babies this age can sleep 6-8 hours continuously. Consider establishing a consistent bedtime routine for ${possessive} better sleep.`,
        icon: 'moon'
      });
    } else if (ageInWeeks >= 16) { // 4+ months
      insights.push({
        type: 'sleep',
        severity: 'info',
        title: 'Sleep Patterns',
        message: `${name} is developing more predictable sleep patterns.`,
        recommendation: 'Sleep cycles are maturing. You might notice longer naps and better nighttime sleep.',
        icon: 'moon'
      });
    } else if (ageInWeeks >= 8) { // 2+ months
      insights.push({
        type: 'feeding',
        severity: 'info',
        title: 'Feeding Routine',
        message: `${name} is establishing more regular feeding patterns.`,
        recommendation: 'Feeding intervals may extend to 3-4 hours as baby grows.',
        icon: 'nutrition'
      });
    } else { // Newborn
      insights.push({
        type: 'sleep',
        severity: 'info',
        title: 'Newborn Sleep',
        message: `${name} is in the newborn phase with frequent sleep-wake cycles.`,
        recommendation: 'Newborns sleep 14-17 hours per day in short 2-4 hour stretches. This is completely normal.',
        icon: 'moon'
      });
    }
    
    return insights;
  }

  private static calculateAgeInWeeks(birthDate: Date): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - birthDate.getTime());
    const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
    return diffWeeks;
  }

  private static async getWeightInsights(ageInWeeks: number, babyName?: string): Promise<NHSInsight[]> {
    const insights: NHSInsight[] = [];
    const name = babyName || 'Baby';
    
    try {
      const weightRecords = await DataService.getWeightRecords();
      
      if (weightRecords.length === 0) {
        insights.push({
          type: 'weight',
          severity: 'info',
          title: 'Weight',
          message: `No weight records found yet. Regular weight tracking helps monitor ${name}'s growth and development.`,
          recommendation: 'Add a weight measurement to track growth',
          icon: 'scale'
        });
        return insights;
      }

      // Check for recent weight measurements
      const lastWeightRecord = weightRecords[0];
      const daysSinceLastWeight = Math.floor(
        (new Date().getTime() - new Date(lastWeightRecord.timestamp).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceLastWeight > 14) {
        insights.push({
          type: 'weight',
          severity: 'warning',
          title: 'Weight Tracking',
          message: `Last weight measurement was ${daysSinceLastWeight} days ago.`,
          recommendation: 'Regular weight checks help ensure healthy growth. Consider weighing your baby weekly.',
          icon: 'scale'
        });
      }

      // Check weight gain pattern (if we have multiple records)
      if (weightRecords.length >= 2) {
        const recentWeight = weightRecords[0].weight;
        const previousWeight = weightRecords[1].weight;
        const weightDiff = recentWeight - previousWeight;
        
        // Convert to grams for easier calculation
        const weightDiffGrams = weightDiff * 1000;
        const daysBetween = Math.floor(
          (new Date(weightRecords[0].timestamp).getTime() - 
           new Date(weightRecords[1].timestamp).getTime()) / (1000 * 60 * 60 * 24)
        );
        
        const dailyWeightGain = weightDiffGrams / daysBetween;
        
        // NHS guidelines: babies should gain 150-200g per week (21-28g per day)
        if (dailyWeightGain < 15) {
          insights.push({
            type: 'weight',
            severity: 'alert',
            title: 'Weight Gain Concern',
            message: `${name} is gaining weight slowly (${Math.round(dailyWeightGain)}g/day).`,
            recommendation: 'Consult your healthcare provider about feeding frequency and weight gain patterns.',
            icon: 'trending-down'
          });
        } else if (dailyWeightGain > 40) {
          insights.push({
            type: 'weight',
            severity: 'warning',
            title: 'Rapid Weight Gain',
            message: `${name} is gaining weight quickly (${Math.round(dailyWeightGain)}g/day).`,
            recommendation: 'This may be normal during growth spurts, but discuss with your healthcare provider.',
            icon: 'trending-up'
          });
        }
      }

    } catch (error) {
      console.error('Error getting weight insights:', error);
    }

    return insights;
  }

  private static async getSleepInsights(ageInWeeks: number, babyName?: string): Promise<NHSInsight[]> {
    const insights: NHSInsight[] = [];
    const name = babyName || 'Baby';
    
    try {
      const sleepActivities = await DataService.getActivitiesByType('sleep');
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const recentSleep = sleepActivities.filter(activity => 
        new Date(activity.timestamp) >= last24Hours
      );
      
      const totalSleepMinutes = recentSleep.reduce((sum, activity) => 
        sum + (activity.duration || 0), 0
      );
      const totalSleepHours = totalSleepMinutes / 60;

      // NHS guidelines by age
      let recommendedSleepHours = 16; // Default for newborns
      if (ageInWeeks >= 16) recommendedSleepHours = 13;
      else if (ageInWeeks >= 8) recommendedSleepHours = 14;
      else if (ageInWeeks >= 2) recommendedSleepHours = 15;

      if (totalSleepHours < recommendedSleepHours - 2) {
        insights.push({
          type: 'sleep',
          severity: 'warning',
          title: 'Sleep',
          message: `${name} is sleeping less than the recommended amount for their age. Consider creating a more consistent sleep routine.`,
          recommendation: `Babies aged ${ageInWeeks} weeks typically need ${recommendedSleepHours} hours of sleep per day.`,
          icon: 'moon'
        });
      }

    } catch (error) {
      console.error('Error getting sleep insights:', error);
    }

    return insights;
  }

  private static async getFeedingInsights(ageInWeeks: number, babyName?: string): Promise<NHSInsight[]> {
    const insights: NHSInsight[] = [];
    const name = babyName || 'Baby';
    
    try {
      const feedingActivities = await DataService.getActivitiesByType('feeding');
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const recentFeeds = feedingActivities.filter(activity => 
        new Date(activity.timestamp) >= last24Hours
      );

      // NHS guidelines by age
      let recommendedFeeds = 10; // Default for newborns
      if (ageInWeeks >= 16) recommendedFeeds = 6;
      else if (ageInWeeks >= 8) recommendedFeeds = 7;
      else if (ageInWeeks >= 2) recommendedFeeds = 8;

      if (recentFeeds.length < recommendedFeeds - 2) {
        insights.push({
          type: 'feeding',
          severity: 'warning',
          title: 'Feed',
          message: `${name} is feeding less frequently than recommended for their age. Ensure adequate nutrition and consult with a healthcare provider if concerned.`,
          recommendation: `Babies aged ${ageInWeeks} weeks typically need ${recommendedFeeds} feeds per day.`,
          icon: 'nutrition'
        });
      }

    } catch (error) {
      console.error('Error getting feeding insights:', error);
    }

    return insights;
  }
}