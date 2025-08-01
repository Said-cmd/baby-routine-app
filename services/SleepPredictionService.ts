export interface SleepMetrics {
  totalSleepLast24Hours: number; // in minutes
  averageSleepInterval: number; // in minutes
  nextNapPrediction: Date | null;
  sleepSessionsLast24Hours: number;
  longestSleepStreak: number; // in minutes
  shortestSleepStreak: number; // in minutes
  lastSleepTime: Date | null;
  confidenceLevel: 'high' | 'medium' | 'low';
  healthWarnings: SleepHealthWarning[];
}

export interface SleepHealthWarning {
  type: 'insufficient_sleep' | 'long_gap';
  severity: 'warning' | 'alert';
  message: string;
  recommendation: string;
}

export class SleepPredictionService {
  /**
   * Calculate comprehensive sleep metrics from stored data
   */
  static async calculateSleepMetrics(): Promise<SleepMetrics> {
    try {
      const { DataService } = await import('@/services/DataService');
      
      // Get all sleep activities
      const sleepActivities = await DataService.getActivitiesByType('sleep');
      
      if (sleepActivities.length === 0) {
        return this.getEmptyMetrics();
      }

      const now = new Date();
      const last24Hours = new Date(now.getTime() - (24 * 60 * 60 * 1000));
      
      // Filter activities from last 24 hours
      const recentSleepActivities = sleepActivities.filter(activity => {
        const activityDate = new Date(activity.timestamp);
        return activityDate >= last24Hours;
      });

      // Calculate total sleep in last 24 hours
      const totalSleepLast24Hours = recentSleepActivities.reduce((total, activity) => {
        return total + (activity.duration || 0);
      }, 0);

      // Get sleep sessions for interval calculation (use more data for better prediction)
      const last7Days = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
      const weekSleepActivities = sleepActivities.filter(activity => {
        const activityDate = new Date(activity.timestamp);
        return activityDate >= last7Days;
      }).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      // Calculate average interval between sleep sessions
      const averageSleepInterval = this.calculateAverageInterval(weekSleepActivities);
      
      // Predict next nap time
      const nextNapPrediction = this.predictNextNapTime(sleepActivities, averageSleepInterval);
      
      // Calculate additional metrics
      const sleepDurations = recentSleepActivities
        .map(activity => activity.duration || 0)
        .filter(duration => duration > 0);
      
      const longestSleepStreak = sleepDurations.length > 0 ? Math.max(...sleepDurations) : 0;
      const shortestSleepStreak = sleepDurations.length > 0 ? Math.min(...sleepDurations) : 0;
      
      const lastSleepTime = sleepActivities.length > 0 
        ? new Date(sleepActivities[0].timestamp) 
        : null;

      // Determine confidence level based on data availability
      const confidenceLevel = this.calculateConfidenceLevel(weekSleepActivities.length);

      // Calculate health warnings
      const healthWarnings = this.calculateHealthWarnings(
        totalSleepLast24Hours,
        recentSleepActivities,
        sleepActivities
      );

      return {
        totalSleepLast24Hours,
        averageSleepInterval,
        nextNapPrediction,
        sleepSessionsLast24Hours: recentSleepActivities.length,
        longestSleepStreak,
        shortestSleepStreak,
        lastSleepTime,
        confidenceLevel,
        healthWarnings
      };

    } catch (error) {
      console.error('Error calculating sleep metrics:', error);
      return this.getEmptyMetrics();
    }
  }

  /**
   * Calculate average interval between sleep sessions
   */
  private static calculateAverageInterval(sleepActivities: any[]): number {
    if (sleepActivities.length < 2) {
      return 180; // Default 3 hours if insufficient data
    }

    const intervals: number[] = [];
    
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

    // Calculate average, removing outliers
    intervals.sort((a, b) => a - b);
    const q1 = intervals[Math.floor(intervals.length * 0.25)];
    const q3 = intervals[Math.floor(intervals.length * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    const filteredIntervals = intervals.filter(interval => 
      interval >= lowerBound && interval <= upperBound
    );

    const average = filteredIntervals.reduce((sum, interval) => sum + interval, 0) / filteredIntervals.length;
    return Math.round(average);
  }

  /**
   * Predict next nap time based on last sleep and average interval
   */
  private static predictNextNapTime(sleepActivities: any[], averageInterval: number): Date | null {
    if (sleepActivities.length === 0) {
      return null;
    }

    const lastSleep = sleepActivities[0]; // Most recent sleep
    const lastSleepTime = new Date(lastSleep.timestamp);
    const lastSleepDuration = lastSleep.duration || 0;
    
    // Add the sleep duration to get when baby woke up
    const wakeUpTime = new Date(lastSleepTime.getTime() + (lastSleepDuration * 60 * 1000));
    
    // Add average interval to predict next nap
    const predictedNapTime = new Date(wakeUpTime.getTime() + (averageInterval * 60 * 1000));
    
    // Don't predict times in the past
    const now = new Date();
    if (predictedNapTime <= now) {
      // If prediction is in the past, add intervals until we get a future time
      const intervalsPassed = Math.ceil((now.getTime() - predictedNapTime.getTime()) / (averageInterval * 60 * 1000));
      return new Date(predictedNapTime.getTime() + (intervalsPassed * averageInterval * 60 * 1000));
    }
    
    return predictedNapTime;
  }

  /**
   * Calculate confidence level based on available data
   */
  private static calculateConfidenceLevel(dataPoints: number): 'high' | 'medium' | 'low' {
    if (dataPoints >= 10) {
      return 'high';
    } else if (dataPoints >= 5) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Get empty metrics when no data is available
   */
  private static getEmptyMetrics(): SleepMetrics {
    return {
      totalSleepLast24Hours: 0,
      averageSleepInterval: 180, // Default 3 hours
      nextNapPrediction: null,
      sleepSessionsLast24Hours: 0,
      longestSleepStreak: 0,
      shortestSleepStreak: 0,
      lastSleepTime: null,
      confidenceLevel: 'low',
      healthWarnings: []
    };
  }

  /**
   * Calculate health warnings based on sleep patterns
   */
  private static calculateHealthWarnings(
    totalSleepLast24Hours: number,
    recentSleepActivities: any[],
    allSleepActivities: any[]
  ): SleepHealthWarning[] {
    const warnings: SleepHealthWarning[] = [];
    const totalSleepHours = totalSleepLast24Hours / 60;

    // Check for insufficient sleep (less than 10 hours in 24 hours)
    if (totalSleepHours < 10) {
      const severity = totalSleepHours < 8 ? 'alert' : 'warning';
      warnings.push({
        type: 'insufficient_sleep',
        severity,
        message: `Only ${totalSleepHours.toFixed(1)} hours of sleep in the last 24 hours`,
        recommendation: severity === 'alert' 
          ? 'Babies need 14-17 hours of sleep per day. Consider consulting your pediatrician.'
          : 'Try to encourage more frequent naps. Newborns typically need 14-17 hours of sleep per day.'
      });
    }

    // Check for long gaps between sleep sessions (greater than 5 hours)
    if (allSleepActivities.length >= 2) {
      const sortedActivities = [...allSleepActivities]
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      let longestGap = 0;
      let gapCount = 0;
      
      for (let i = 1; i < sortedActivities.length; i++) {
        const currentTime = new Date(sortedActivities[i].timestamp).getTime();
        const previousEndTime = new Date(sortedActivities[i - 1].timestamp).getTime() + 
          ((sortedActivities[i - 1].duration || 0) * 60 * 1000);
        
        const gapMinutes = (currentTime - previousEndTime) / (1000 * 60);
        const gapHours = gapMinutes / 60;
        
        if (gapHours > 5) {
          longestGap = Math.max(longestGap, gapHours);
          gapCount++;
        }
      }
      
      if (longestGap > 0) {
        const severity = longestGap > 8 ? 'alert' : 'warning';
        warnings.push({
          type: 'long_gap',
          severity,
          message: `${gapCount} sleep gap${gapCount > 1 ? 's' : ''} longer than 5 hours (longest: ${longestGap.toFixed(1)}h)`,
          recommendation: severity === 'alert'
            ? 'Very long gaps between sleep may indicate feeding or comfort issues. Consider consulting your pediatrician.'
            : 'Try to encourage shorter, more frequent naps. Babies typically sleep in 2-4 hour stretches.'
        });
      }
    }

    return warnings;
  }

  /**
   * Format time until next nap for display
   */
  static formatTimeUntilNextNap(nextNapTime: Date | null): string {
    if (!nextNapTime) {
      return 'No prediction available';
    }

    const now = new Date();
    const timeDiff = nextNapTime.getTime() - now.getTime();
    
    if (timeDiff <= 0) {
      return 'Nap time now!';
    }

    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  /**
   * Format duration in hours and minutes
   */
  static formatDuration(minutes: number): string {
    if (minutes === 0) {
      return '0h 0m';
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    } else {
      return `${remainingMinutes}m`;
    }
  }

  /**
   * Get warning color for UI display
   */
  static getWarningColor(severity: 'warning' | 'alert'): string {
    switch (severity) {
      case 'alert':
        return '#EF4444'; // Red
      case 'warning':
        return '#F59E0B'; // Yellow
      default:
        return '#6B7280'; // Gray
    }
  }

  /**
   * Get warning icon for UI display
   */
  static getWarningIcon(severity: 'warning' | 'alert'): string {
    switch (severity) {
      case 'alert':
        return 'alert-circle';
      case 'warning':
        return 'warning';
      default:
        return 'information-circle';
    }
  }

  /**
   * Get confidence color for UI display
   */
  static getConfidenceColor(confidence: 'high' | 'medium' | 'low'): string {
    switch (confidence) {
      case 'high':
        return '#10B981'; // Green
      case 'medium':
        return '#F59E0B'; // Yellow
      case 'low':
        return '#EF4444'; // Red
      default:
        return '#6B7280'; // Gray
    }
  }
}