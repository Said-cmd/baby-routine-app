import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { ActivityType } from '@/types/Activity';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export class NotificationService {
  private static hasPermission = false;

  static async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        // Web notifications require different handling
        if ('Notification' in window) {
          const permission = await Notification.requestPermission();
          this.hasPermission = permission === 'granted';
          return this.hasPermission;
        }
        return false;
      }

      // Mobile platforms
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      this.hasPermission = finalStatus === 'granted';
      return this.hasPermission;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  static async getPermissionStatus(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        if ('Notification' in window) {
          const permission = Notification.permission === 'granted';
          this.hasPermission = permission;
          console.log('Web notification permission status:', Notification.permission);
          return permission;
        }
        return false;
      }

      const { status } = await Notifications.getPermissionsAsync();
      this.hasPermission = status === 'granted';
      return this.hasPermission;
    } catch (error) {
      console.error('Error getting notification permissions:', error);
      return false;
    }
  }

  static async scheduleNextReminder(lastActivity: ActivityType): Promise<void> {
    try {
      // Check permissions first
      const hasPermission = await this.getPermissionStatus();
      if (!hasPermission) {
        console.log('No notification permission, skipping reminder scheduling');
        return;
      }

      // Cancel any existing reminders for this activity type
      await this.cancelRemindersForActivity(lastActivity);

      // Define reminder intervals (in seconds for testing, would be hours in production)
      const reminderIntervals = {
        feeding: 3 * 60 * 60, // 3 hours
        sleep: 2 * 60 * 60,   // 2 hours  
        nappy: 4 * 60 * 60    // 4 hours
      };

      const interval = reminderIntervals[lastActivity];
      
      // Define notification content
      const notificationContent = {
        feeding: {
          title: '🍼 Feeding Time',
          body: 'It might be time for your baby\'s next feeding',
        },
        sleep: {
          title: '😴 Sleep Check',
          body: 'Check if your baby is ready for sleep',
        },
        nappy: {
          title: '👶 Nappy Check',
          body: 'Time to check your baby\'s nappy',
        }
      };

      const content = notificationContent[lastActivity];

      if (Platform.OS === 'web') {
        // Schedule web notification
        setTimeout(() => {
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(content.title, {
              body: content.body,
              icon: '/assets/images/icon.png',
              tag: `baby-reminder-${lastActivity}`,
            });
          }
        }, interval * 1000);
      } else {
        // Schedule mobile notification
        await Notifications.scheduleNotificationAsync({
          content: {
            title: content.title,
            body: content.body,
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: {
            seconds: interval,
          },
          identifier: `baby-reminder-${lastActivity}`,
        });
      }

      console.log(`Scheduled ${lastActivity} reminder for ${interval / 3600} hours from now`);
    } catch (error) {
      console.error('Error scheduling reminder:', error);
    }
  }

  static async cancelRemindersForActivity(activityType: ActivityType): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // Web notifications don't have a direct cancel method for scheduled notifications
        // They're handled by the setTimeout approach above
        return;
      }

      const identifier = `baby-reminder-${activityType}`;
      await Notifications.cancelScheduledNotificationAsync(identifier);
      console.log(`Cancelled ${activityType} reminders`);
    } catch (error) {
      console.error('Error cancelling reminders:', error);
    }
  }

  static async cancelAllReminders(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // For web, we can't cancel setTimeout-based notifications easily
        // In a production app, you'd want to track these and clear them
        console.log('Cancelling all web reminders');
        return;
      }

      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('Cancelled all reminders');
    } catch (error) {
      console.error('Error cancelling all reminders:', error);
    }
  }

  static async getScheduledReminders(): Promise<Notifications.NotificationRequest[]> {
    try {
      if (Platform.OS === 'web') {
        // Web doesn't have a way to list scheduled notifications
        return [];
      }

      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error getting scheduled reminders:', error);
      return [];
    }
  }

  static async scheduleTestNotification(): Promise<void> {
    try {
      console.log('Starting test notification process...');
      
      const hasPermission = await this.getPermissionStatus();
      console.log('Permission status:', hasPermission);
      
      if (!hasPermission) {
        throw new Error('Notification permission not granted. Please enable notifications in your browser settings.');
      }

      if (Platform.OS === 'web') {
        // Check if notifications are supported
        if (!('Notification' in window)) {
          throw new Error('This browser does not support notifications');
        }
        
        console.log('Notification permission:', Notification.permission);
        console.log('Document visibility:', document.visibilityState);
        console.log('Window focus:', document.hasFocus());
        
        // Double-check permission synchronously
        if (Notification.permission !== 'granted') {
          // Try to request permission again
          const permission = await Notification.requestPermission();
          console.log('Re-requested permission result:', permission);
          
          if (permission !== 'granted') {
            throw new Error(`Notification permission denied. Current status: ${permission}. Please click the 🔒 icon in your browser's address bar and allow notifications.`);
          }
        }
        
        // Create notification with more options
        console.log('Creating notification...');
        const notification = new Notification('🧪 Baby Routine Test', {
          body: 'Notifications are working correctly!',
          tag: 'baby-routine-test-' + Date.now(),
          requireInteraction: false,
          silent: false,
          icon: '/assets/images/icon.png',
          badge: '/assets/images/icon.png',
          timestamp: Date.now(),
          renotify: true,
        });
        
        console.log('Notification created:', notification);
        
        // Add click handler
        notification.onclick = () => {
          console.log('Notification clicked');
          window.focus();
          notification.close();
        };
        
        // Add error handler
        notification.onerror = (error) => {
          console.error('Notification error:', error);
        };
        
        // Add show handler
        notification.onshow = () => {
          console.log('Notification shown successfully');
        };
        
        // Auto-close after 5 seconds
        setTimeout(() => {
          console.log('Auto-closing notification');
          notification.close();
        }, 5000);
        
        console.log('Web notification sent successfully');
        return;
      } else {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '🧪 Test Notification',
            body: 'Notifications are working correctly!',
            sound: 'default',
          },
          trigger: {
            seconds: 1,
          },
        });
        console.log('Mobile notification scheduled successfully');
      }
    } catch (error) {
      console.error('Error scheduling test notification:', error);
      throw error;
    }
  }

  /**
   * Get detailed notification status for debugging
   */
  static async getNotificationDebugInfo(): Promise<{
    supported: boolean;
    permission: string;
    userAgent: string;
    protocol: string;
    isSecure: boolean;
    documentState: string;
    hasFocus: boolean;
  }> {
    return {
      supported: 'Notification' in window,
      permission: 'Notification' in window ? Notification.permission : 'not-supported',
      userAgent: navigator.userAgent,
      protocol: window.location.protocol,
      isSecure: window.location.protocol === 'https:' || window.location.hostname === 'localhost',
      documentState: document.visibilityState,
      hasFocus: document.hasFocus(),
    };
  }
}