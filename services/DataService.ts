import AsyncStorage from '@react-native-async-storage/async-storage';
import { Activity, DailySummary, WeightRecord, CustomReminder } from '@/types/Activity';

const ACTIVITIES_KEY = 'baby_routine_activities';
const SETTINGS_KEY = 'baby_routine_settings';
const BACKUP_KEY = 'baby_routine_backup';
const WEIGHT_KEY = 'baby_routine_weight';
const REMINDERS_KEY = 'baby_routine_reminders';

export class DataService {
  // Enhanced activity retrieval with error handling and sorting
  static async getActivities(): Promise<Activity[]> {
    try {
      const data = await AsyncStorage.getItem(ACTIVITIES_KEY);
      if (data) {
        const activities = JSON.parse(data);
        // Ensure all activities have required fields and sort by timestamp
        const validActivities = activities.filter((activity: Activity) => 
          activity.id && activity.type && activity.timestamp
        );
        return validActivities.sort((a: Activity, b: Activity) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      }
      return [];
    } catch (error) {
      console.error('Error getting activities:', error);
      // Try to recover from backup
      return await this.getActivitiesFromBackup();
    }
  }

  // Get activities from backup storage
  private static async getActivitiesFromBackup(): Promise<Activity[]> {
    try {
      const backupData = await AsyncStorage.getItem(BACKUP_KEY);
      if (backupData) {
        const activities = JSON.parse(backupData);
        console.log('Recovered activities from backup');
        return activities.sort((a: Activity, b: Activity) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      }
      return [];
    } catch (error) {
      console.error('Error recovering from backup:', error);
      return [];
    }
  }

  // Enhanced activity addition with backup
  static async addActivity(activity: Activity): Promise<void> {
    try {
      // Validate activity before adding
      await this.validateActivity(activity);
      
      const activities = await this.getActivities();
      activities.unshift(activity);
      
      // Save to primary storage
      await AsyncStorage.setItem(ACTIVITIES_KEY, JSON.stringify(activities));
      
      // Create backup
      await this.createBackup(activities);
      
      console.log(`Added ${activity.type} activity:`, activity.id);
    } catch (error) {
      console.error('Error adding activity:', error);
      // Re-throw the error to be caught by the calling function
      throw new Error(error instanceof Error ? error.message : 'Failed to add activity');
    }
  }

  // Validate activity to prevent unrealistic logging
  static async validateActivity(newActivity: Activity): Promise<void> {
    console.log(`Validating ${newActivity.type} activity...`);
    const activities = await this.getActivities();
    const now = new Date(newActivity.timestamp);
    
    // Define minimum intervals between same activity types (in minutes)
    const minimumIntervals = {
      feeding: 30,    // 30 minutes between feeds
      sleep: 15,      // 15 minutes between sleep logs
      nappy: 10,      // 10 minutes between nappy changes
      weight: 60      // 1 hour between weight measurements
    };
    
    const minInterval = minimumIntervals[newActivity.type];
    console.log(`Minimum interval for ${newActivity.type}: ${minInterval} minutes`);
    
    // Check for recent activities of the same type
    const recentSameTypeActivities = activities.filter(activity => {
      if (activity.type !== newActivity.type) return false;
      
      const activityTime = new Date(activity.timestamp);
      const timeDiffMinutes = (now.getTime() - activityTime.getTime()) / (1000 * 60);
      
      return timeDiffMinutes < minInterval;
    });
    
    console.log(`Found ${recentSameTypeActivities.length} recent ${newActivity.type} activities`);
    
    if (recentSameTypeActivities.length > 0) {
      const lastActivity = recentSameTypeActivities[0];
      const lastActivityTime = new Date(lastActivity.timestamp);
      const timeDiffMinutes = Math.round((now.getTime() - lastActivityTime.getTime()) / (1000 * 60));
      
      const errorMessage = `Please wait ${minInterval - timeDiffMinutes} more minutes before logging another ${newActivity.type} activity.\n\nLast ${newActivity.type} was ${timeDiffMinutes} minutes ago.`;
      console.log('Validation failed - throwing error:', errorMessage);
      throw new Error(
        errorMessage
      );
    }
    
    // Additional validation: Check for too many activities in a short period
    const last30Minutes = activities.filter(activity => {
      const activityTime = new Date(activity.timestamp);
      const timeDiffMinutes = (now.getTime() - activityTime.getTime()) / (1000 * 60);
      return timeDiffMinutes <= 30;
    });
    
    if (last30Minutes.length >= 5) {
      const errorMessage = 'Too many activities logged in the last 30 minutes.\n\nPlease wait before logging more activities to ensure realistic tracking.';
      console.log('Too many activities validation failed - throwing error:', errorMessage);
      throw new Error(
        errorMessage
      );
    }
    
    console.log(`Validation passed for ${newActivity.type} activity`);
  }

  // Enhanced activity update with validation
  static async updateActivity(updatedActivity: Activity): Promise<void> {
    try {
      if (!updatedActivity.id) {
        throw new Error('Activity ID is required for update');
      }
      
      const activities = await this.getActivities();
      const index = activities.findIndex(a => a.id === updatedActivity.id);
      
      if (index !== -1) {
        activities[index] = updatedActivity;
        await AsyncStorage.setItem(ACTIVITIES_KEY, JSON.stringify(activities));
        await this.createBackup(activities);
        console.log(`Updated activity:`, updatedActivity.id);
      } else {
        throw new Error('Activity not found for update');
      }
    } catch (error) {
      console.error('Error updating activity:', error);
      throw error;
    }
  }

  // Enhanced activity deletion with confirmation
  static async deleteActivity(id: string): Promise<void> {
    try {
      if (!id) {
        throw new Error('Activity ID is required for deletion');
      }
      
      const activities = await this.getActivities();
      const activityToDelete = activities.find(a => a.id === id);
      
      if (!activityToDelete) {
        throw new Error('Activity not found for deletion');
      }
      
      const filtered = activities.filter(a => a.id !== id);
      await AsyncStorage.setItem(ACTIVITIES_KEY, JSON.stringify(filtered));
      await this.createBackup(filtered);
      
      console.log(`Deleted ${activityToDelete.type} activity:`, id);
    } catch (error) {
      console.error('Error deleting activity:', error);
      throw error;
    }
  }

  // Get activities by type for specific analysis
  static async getActivitiesByType(type: 'feeding' | 'sleep' | 'nappy'): Promise<Activity[]> {
    try {
      const activities = await this.getActivities();
      return activities.filter(activity => activity.type === type);
    } catch (error) {
      console.error(`Error getting ${type} activities:`, error);
      return [];
    }
  }

  // Get recent activities (last N activities)
  static async getRecentActivities(limit: number = 10): Promise<Activity[]> {
    try {
      const activities = await this.getActivities();
      return activities.slice(0, limit);
    } catch (error) {
      console.error('Error getting recent activities:', error);
      return [];
    }
  }

  // Get activities for a specific date range
  static async getActivitiesInRange(startDate: Date, endDate: Date): Promise<Activity[]> {
    try {
      const activities = await this.getActivities();
      return activities.filter(activity => {
        const activityDate = new Date(activity.timestamp);
        return activityDate >= startDate && activityDate <= endDate;
      });
    } catch (error) {
      console.error('Error getting activities in range:', error);
      return [];
    }
  }

  // Create backup of activities
  private static async createBackup(activities: Activity[]): Promise<void> {
    try {
      await AsyncStorage.setItem(BACKUP_KEY, JSON.stringify(activities));
    } catch (error) {
      console.error('Error creating backup:', error);
    }
  }

  // Clear all data (with confirmation)
  static async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([ACTIVITIES_KEY, SETTINGS_KEY, BACKUP_KEY]);
      console.log('All data cleared');
    } catch (error) {
      console.error('Error clearing data:', error);
      throw error;
    }
  }

  // Get storage statistics
  static async getStorageStats(): Promise<{
    totalActivities: number;
    feedingCount: number;
    sleepCount: number;
    nappyCount: number;
    oldestActivity: string | null;
    newestActivity: string | null;
  }> {
    try {
      const activities = await this.getActivities();
      
      return {
        totalActivities: activities.length,
        feedingCount: activities.filter(a => a.type === 'feeding').length,
        sleepCount: activities.filter(a => a.type === 'sleep').length,
        nappyCount: activities.filter(a => a.type === 'nappy').length,
        oldestActivity: activities.length > 0 ? activities[activities.length - 1].timestamp : null,
        newestActivity: activities.length > 0 ? activities[0].timestamp : null,
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return {
        totalActivities: 0,
        feedingCount: 0,
        sleepCount: 0,
        nappyCount: 0,
        oldestActivity: null,
        newestActivity: null,
      };
    }
  }
  static async getDailySummary(date: Date): Promise<DailySummary> {
    try {
      const activities = await this.getActivities();
      const dayActivities = activities.filter(activity => {
        const activityDate = new Date(activity.timestamp);
        return activityDate.toDateString() === date.toDateString();
      });

      const feeds = dayActivities.filter(a => a.type === 'feeding');
      const sleeps = dayActivities.filter(a => a.type === 'sleep');
      const nappies = dayActivities.filter(a => a.type === 'nappy');

      const totalSleepDuration = sleeps.reduce((sum, sleep) => sum + (sleep.duration || 0), 0);
      const longestSleepStretch = Math.max(...sleeps.map(s => s.duration || 0), 0);

      let averageTimeBetweenFeeds = 0;
      if (feeds.length > 1) {
        const feedTimes = feeds.map(f => new Date(f.timestamp).getTime());
        feedTimes.sort((a, b) => a - b);
        const intervals = [];
        for (let i = 1; i < feedTimes.length; i++) {
          intervals.push((feedTimes[i] - feedTimes[i-1]) / (1000 * 60)); // minutes
        }
        averageTimeBetweenFeeds = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
      }

      return {
        date: date.toISOString().split('T')[0],
        totalFeeds: feeds.length,
        totalSleepDuration,
        totalNappyChanges: nappies.length,
        longestSleepStretch,
        averageTimeBetweenFeeds,
        activities: dayActivities
      };
    } catch (error) {
      console.error('Error getting daily summary:', error);
      throw error;
    }
  }

  static async getWeeklySummaries(startDate: Date): Promise<DailySummary[]> {
    const summaries: DailySummary[] = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() - i);
      const summary = await this.getDailySummary(date);
      summaries.push(summary);
    }
    
    return summaries.reverse();
  }

  static async saveBabyInfo(info: BabyInfo): Promise<void> {
    try {
      info.updatedAt = new Date().toISOString();
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(info));
    } catch (error) {
      console.error('Error saving baby info:', error);
      throw error;
    }
  }

  static async getBabyInfo(): Promise<BabyInfo | null> {
    try {
      const data = await AsyncStorage.getItem(SETTINGS_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting baby info:', error);
      return null;
    }
  }

  // Weight tracking methods
  static async getWeightRecords(): Promise<WeightRecord[]> {
    try {
      const data = await AsyncStorage.getItem(WEIGHT_KEY);
      if (data) {
        const records = JSON.parse(data);
        return records.sort((a: WeightRecord, b: WeightRecord) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      }
      return [];
    } catch (error) {
      console.error('Error getting weight records:', error);
      return [];
    }
  }

  static async addWeightRecord(record: WeightRecord): Promise<void> {
    try {
      const records = await this.getWeightRecords();
      records.unshift(record);
      await AsyncStorage.setItem(WEIGHT_KEY, JSON.stringify(records));
      console.log('Added weight record:', record.weight, record.unit);
    } catch (error) {
      console.error('Error adding weight record:', error);
      throw error;
    }
  }

  static async deleteWeightRecord(id: string): Promise<void> {
    try {
      const records = await this.getWeightRecords();
      const filtered = records.filter(r => r.id !== id);
      await AsyncStorage.setItem(WEIGHT_KEY, JSON.stringify(filtered));
      console.log('Deleted weight record:', id);
    } catch (error) {
      console.error('Error deleting weight record:', error);
      throw error;
    }
  }

  // Custom reminders methods
  static async getCustomReminders(): Promise<CustomReminder[]> {
    try {
      const data = await AsyncStorage.getItem(REMINDERS_KEY);
      if (data) {
        return JSON.parse(data);
      }
      return [];
    } catch (error) {
      console.error('Error getting custom reminders:', error);
      return [];
    }
  }

  static async addCustomReminder(reminder: CustomReminder): Promise<void> {
    try {
      const reminders = await this.getCustomReminders();
      reminders.push(reminder);
      await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders));
      console.log('Added custom reminder:', reminder.title);
    } catch (error) {
      console.error('Error adding custom reminder:', error);
      throw error;
    }
  }

  static async updateCustomReminder(updatedReminder: CustomReminder): Promise<void> {
    try {
      const reminders = await this.getCustomReminders();
      const index = reminders.findIndex(r => r.id === updatedReminder.id);
      if (index !== -1) {
        reminders[index] = updatedReminder;
        await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders));
        console.log('Updated custom reminder:', updatedReminder.title);
      }
    } catch (error) {
      console.error('Error updating custom reminder:', error);
      throw error;
    }
  }

  static async deleteCustomReminder(id: string): Promise<void> {
    try {
      const reminders = await this.getCustomReminders();
      const filtered = reminders.filter(r => r.id !== id);
      await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(filtered));
      console.log('Deleted custom reminder:', id);
    } catch (error) {
      console.error('Error deleting custom reminder:', error);
      throw error;
    }
  }
}