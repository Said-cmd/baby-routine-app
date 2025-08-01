import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { DataService } from '@/services/DataService';
import { NotificationService } from '@/services/NotificationService';
import ValidationModal from '@/components/ValidationModal';
import WeightTracker from '@/components/WeightTracker';
import CustomReminderModal from '@/components/CustomReminderModal';
import NHSInsightsCard from '@/components/NHSInsightsCard';
import { Activity, ActivityType } from '@/types/Activity';

interface BabyInfo {
  name: string;
  birthDate: string;
  gender: 'boy' | 'girl' | 'other';
  birthWeight: number;
  birthWeightUnit: 'kg' | 'lbs';
  feedingType: 'breastfeeding' | 'bottle' | 'mixed';
  createdAt: string;
  updatedAt: string;
}

export default function Dashboard() {
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [customReminders, setCustomReminders] = useState<any[]>([]);
  const [showSleepModal, setShowSleepModal] = useState(false);
  const [customDuration, setCustomDuration] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(false);
  const [validationModal, setValidationModal] = useState({
    visible: false,
    title: '',
    message: '',
  });
  const [showWeightTracker, setShowWeightTracker] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showBabyInfoModal, setShowBabyInfoModal] = useState(false);
  const [babyInfo, setBabyInfo] = useState<BabyInfo>({
    name: '',
    birthDate: '',
    gender: 'boy',
    birthWeight: 0,
    birthWeightUnit: 'kg',
    feedingType: 'breastfeeding',
    createdAt: '',
    updatedAt: '',
  });
  const [showInAppNotification, setShowInAppNotification] = useState(false);
  const [inAppNotificationText, setInAppNotificationText] = useState('');
  const [todayStats, setTodayStats] = useState({
    feeds: 0,
    sleeps: 0,
    nappies: 0,
    lastActivity: null as Activity | null,
  });

  const babyName = babyInfo.name;
  const babyBirthDate = babyInfo.birthDate;

  useFocusEffect(
    React.useCallback(() => {
      loadData();
      loadBabyInfo();
      checkNotificationPermission();
    }, [])
  );

  const checkNotificationPermission = async () => {
    const hasPermission = await NotificationService.getPermissionStatus();
    setNotificationPermission(hasPermission);
  };

  const requestNotificationPermission = async () => {
    const granted = await NotificationService.requestPermissions();
    setNotificationPermission(granted);
    
    if (granted) {
      Alert.alert('Success', 'Notifications enabled! You\'ll receive reminders for baby activities.');
      // Schedule a test notification
      await NotificationService.scheduleTestNotification();
    } else {
      Alert.alert('Permission Denied', 'You can enable notifications later in your device settings.');
    }
  };

  const loadData = async () => {
    try {
      // Load recent activities with enhanced error handling
      const recent = await DataService.getRecentActivities(5);
      setRecentActivities(recent);

      // Load custom reminders
      const reminders = await DataService.getCustomReminders();
      setCustomReminders(reminders);

      // Get all activities for today's stats
      const activities = await DataService.getActivities();
      const today = new Date();
      const todayActivities = activities.filter(
        (activity) =>
          new Date(activity.timestamp).toDateString() === today.toDateString()
      );

      const stats = {
        feeds: todayActivities.filter((a) => a.type === 'feeding').length,
        sleeps: todayActivities.filter((a) => a.type === 'sleep').length,
        nappies: todayActivities.filter((a) => a.type === 'nappy').length,
        lastActivity: activities[0] || null,
      };

      setTodayStats(stats);
    } catch (error) {
      console.error('Error loading data:', error);
      // Show user-friendly error message
      Alert.alert('Data Error', 'There was a problem loading your data. Please try again.');
    }
  };

  const loadBabyInfo = async () => {
    try {
      const loadedBabyInfo = await DataService.getBabyInfo();
      if (loadedBabyInfo) {
        setBabyInfo(loadedBabyInfo);
      }
    } catch (error) {
      console.error('Error loading baby info:', error);
    }
  };

  const calculateAge = () => {
    if (!babyInfo.birthDate) return '';
    
    const birthDate = new Date(babyInfo.birthDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - birthDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 7) {
      return `${diffDays} day${diffDays === 1 ? '' : 's'} old`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} week${weeks === 1 ? '' : 's'} old`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months === 1 ? '' : 's'} old`;
    } else {
      const years = Math.floor(diffDays / 365);
      return `${years} year${years === 1 ? '' : 's'} old`;
    }
  };

  const handleSaveBabyInfo = async () => {
    try {
      if (!babyInfo.name.trim()) {
        Alert.alert('Error', 'Please enter your baby\'s name');
        return;
      }
      
      if (!babyInfo.birthDate.trim()) {
        Alert.alert('Error', 'Please enter your baby\'s birth date');
        return;
      }
      
      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(babyInfo.birthDate)) {
        Alert.alert('Error', 'Please enter the date in YYYY-MM-DD format (e.g., 2024-01-15)');
        return;
      }
      
      // Validate that the date is not in the future
      const birthDate = new Date(babyInfo.birthDate);
      const today = new Date();
      if (birthDate > today) {
        Alert.alert('Error', 'Birth date cannot be in the future');
        return;
      }
      
      if (babyInfo.birthWeight <= 0) {
        Alert.alert('Error', 'Please enter a valid birth weight');
        return;
      }
      
      if (!babyInfo.feedingType) {
        Alert.alert('Error', 'Please select a feeding method');
        return;
      }
      
      const infoToSave: BabyInfo = {
        ...babyInfo,
        name: babyInfo.name.trim(),
        birthDate: babyInfo.birthDate.trim(),
        createdAt: babyInfo.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      await DataService.saveBabyInfo(infoToSave);
      
      setShowBabyInfoModal(false);
      loadData();
      Alert.alert('Success', 'Baby information saved successfully!');
    } catch (error) {
      console.error('Error saving baby info:', error);
      Alert.alert('Error', 'Failed to save baby information. Please try again.');
    }
  };

  const quickLog = async (type: ActivityType) => {
    console.log(`Attempting to log ${type} activity...`);
    
    try {
      // For sleep, validate BEFORE showing the modal
      if (type === 'sleep') {
        // Create a temporary activity to test validation
        const tempActivity: Activity = {
          id: 'temp',
          type: 'sleep',
          timestamp: new Date().toISOString(),
          duration: 0,
          notes: '',
        };

        // If validation passes, show the sleep modal
        setShowSleepModal(true);
        return;
      }

      const activity: Activity = {
        id: Date.now().toString(),
        type,
        timestamp: new Date().toISOString(),
        duration: type === 'sleep' ? 0 : undefined,
        notes: '',
      };

      await DataService.addActivity(activity);
      await NotificationService.scheduleNextReminder(type);
      loadData();
      console.log(`Successfully logged ${type} activity`);
      Alert.alert('Success', `${type.charAt(0).toUpperCase() + type.slice(1)} logged successfully!`);
    } catch (error) {
      console.error('Caught error in quickLog:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to log activity';
      console.log('About to show validation modal with message:', errorMessage);
      
      setValidationModal({
        visible: true,
        title: 'Cannot Log Activity',
        message: errorMessage,
      });
    }
  };

  const handleSleepDuration = async (durationMinutes: number) => {
    console.log(`Attempting to log sleep with duration: ${durationMinutes} minutes`);
    
    // Validate sleep duration (minimum 5 minutes, maximum 4 hours)
    if (durationMinutes < 5) {
      setValidationModal({
        visible: true,
        title: 'Invalid Sleep Duration',
        message: 'Sleep duration must be at least 5 minutes to be meaningful for tracking.',
      });
      return;
    }
    
    if (durationMinutes > 240) { // 4 hours
      setValidationModal({
        visible: true,
        title: 'Invalid Sleep Duration',
        message: 'Sleep duration cannot exceed 4 hours. For longer sleep periods, please log them as separate sleep sessions.',
      });
      return;
    }
    
    try {
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - (durationMinutes * 60 * 1000));

      const activity: Activity = {
        id: Date.now().toString(),
        type: 'sleep',
        timestamp: endTime.toISOString(),
        duration: durationMinutes,
        notes: '',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      };

      await DataService.addActivity(activity);
      await NotificationService.scheduleNextReminder('sleep');
      loadData();
      setShowSleepModal(false);
      console.log('Successfully logged sleep activity');
      Alert.alert('Success', `Sleep logged successfully! (${durationMinutes} minutes)`);
    } catch (error) {
      console.error('Caught error in handleSleepDuration:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to log sleep activity';
      console.log('About to show sleep validation modal with message:', errorMessage);
      
      setValidationModal({
        visible: true,
        title: 'Cannot Log Sleep',
        message: errorMessage,
      });
    }
  };

  const handleCustomDuration = async () => {
    const duration = parseInt(customDuration);
    if (isNaN(duration) || duration <= 0) {
      Alert.alert('Error', 'Please enter a valid duration greater than 0 minutes');
      return;
    }
    
    // Validate custom duration limits
    if (duration < 5) {
      setValidationModal({
        visible: true,
        title: 'Invalid Sleep Duration',
        message: 'Sleep duration must be at least 5 minutes to be meaningful for tracking.',
      });
      return;
    }
    
    if (duration > 240) { // 4 hours
      setValidationModal({
        visible: true,
        title: 'Invalid Sleep Duration',
        message: 'Sleep duration cannot exceed 4 hours. For longer sleep periods, please log them as separate sleep sessions.',
      });
      return;
    }
    
    await handleSleepDuration(duration);
    setCustomDuration('');
    setShowCustomInput(false);
  };

  const getDailyTip = () => {
    const tips = [
      "Track activities as they happen for the most accurate patterns",
      "Babies' routines change frequently - don't worry if patterns shift",
      "Look for hunger cues: rooting, lip smacking, or fussiness",
      "Newborns typically sleep 14-17 hours per day in short stretches",
      "Wet nappies are a good sign your baby is getting enough milk",
      "Every baby is different - trust your instincts as a parent",
      "Growth spurts may temporarily increase feeding frequency"
    ];
    
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    return tips[dayOfYear % tips.length];
  };

  const resetSleepModal = () => {
    setShowSleepModal(false);
    setShowCustomInput(false);
    setCustomDuration('');
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case 'feeding':
        return 'nutrition';
      case 'sleep':
        return 'moon';
      case 'nappy':
        return 'medical';
      default:
        return 'ellipse';
    }
  };

  const getActivityColor = (type: ActivityType) => {
    switch (type) {
      case 'feeding':
        return '#4A90E2';
      case 'sleep':
        return '#7ED321';
      case 'nappy':
        return '#FF6B6B';
      default:
        return '#9CA3AF';
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffMinutes = Math.floor((now.getTime() - activityTime.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return null; // Don't show for older activities
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Baby Routine</Text>
        <Text style={styles.subtitle}>Track your little one's day</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Baby Info Card */}
        <View style={styles.babyInfoCard}>
          <View style={styles.babyInfoHeader}>
            <View style={styles.babyInfoIconContainer}>
              <Ionicons name="person" size={20} color="#4A90E2" />
            </View>
            <View style={styles.babyInfoContent}>
              {babyInfo.name && babyInfo.birthDate ? (
                <>
                  <Text style={styles.babyName}>{babyInfo.name}</Text>
                  <Text style={styles.babyAge}>{calculateAge()}</Text>
                </>
              ) : (
                <>
                  <Text style={styles.babyInfoTitle}>Baby Information</Text>
                  <Text style={styles.babyInfoSubtitle}>Set your baby's details for personalised insights</Text>
                </>
              )}
            </View>
            <TouchableOpacity
              style={styles.setBabyInfoButton}
              onPress={() => setShowBabyInfoModal(true)}>
              <Ionicons name={babyInfo.name && babyInfo.birthDate ? "create" : "add"} size={20} color="#4A90E2" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Today's Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Today's Summary</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: '#4A90E2' }]}>
                <Ionicons name="nutrition" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.statNumber}>{todayStats.feeds}</Text>
              <Text style={styles.statLabel}>Feeds</Text>
            </View>
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: '#7ED321' }]}>
                <Ionicons name="moon" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.statNumber}>{todayStats.sleeps}</Text>
              <Text style={styles.statLabel}>Sleeps</Text>
            </View>
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: '#FF6B6B' }]}>
                <Ionicons name="medical" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.statNumber}>{todayStats.nappies}</Text>
              <Text style={styles.statLabel}>Nappies</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.cardTitle}>Quick Log</Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#4A90E2' }]}
              onPress={() => quickLog('feeding')}>
              <Ionicons name="nutrition" size={28} color="#FFFFFF" />
              <Text style={styles.actionText}>Feed</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#7ED321' }]}
              onPress={() => quickLog('sleep')}>
              <Ionicons name="moon" size={28} color="#FFFFFF" />
              <Text style={styles.actionText}>Sleep</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#FF6B6B' }]}
              onPress={() => quickLog('nappy')}>
              <Ionicons name="medical" size={28} color="#FFFFFF" />
              <Text style={styles.actionText}>Nappy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#8B5CF6' }]}
              onPress={() => setShowWeightTracker(true)}>
              <Ionicons name="scale" size={28} color="#FFFFFF" />
              <Text style={styles.actionText}>Weight</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Activities */}
        <View style={styles.recentCard}>
          <Text style={styles.cardTitle}>Recent Activities</Text>
          {recentActivities.length === 0 ? (
            <Text style={styles.emptyText}>No activities logged yet</Text>
          ) : (
            recentActivities.map((activity) => (
              <View key={activity.id} style={styles.activityItem}>
                <View
                  style={[
                    styles.activityIcon,
                    { backgroundColor: getActivityColor(activity.type) },
                  ]}>
                  <Ionicons
                    name={getActivityIcon(activity.type)}
                    size={20}
                    color="#FFFFFF"
                  />
                </View>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityType}>
                    {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}
                  </Text>
                  <Text style={styles.activityTime}>
                    {formatTime(activity.timestamp)}
                    {activity.duration && ` • ${activity.duration >= 60 ? `${Math.floor(activity.duration / 60)}h ${activity.duration % 60}m` : `${activity.duration}m`}`}
                  </Text>
                </View>
                {getTimeAgo(activity.timestamp) && (
                  <Text style={styles.timeAgo}>
                    {getTimeAgo(activity.timestamp)}
                  </Text>
                )}
              </View>
            ))
          )}
        </View>

        {/* Daily Tip */}
        <View style={styles.tipCard}>
          <View style={styles.tipHeader}>
            <Ionicons name="bulb" size={20} color="#1E40AF" />
            <Text style={styles.tipTitle}>Daily Tip</Text>
          </View>
          <Text style={styles.tipText}>{getDailyTip()}</Text>
        </View>

        {/* NHS Development Insights */}
        {babyName && babyBirthDate && (
          <View style={styles.nhsInsightsContainer}>
            <NHSInsightsCard onWeightTrackingPress={() => setShowWeightTracker(true)} />
          </View>
        )}

        {/* Custom Reminders */}
        <View style={styles.remindersCard}>
          <View style={styles.remindersHeader}>
            <View style={styles.remindersIconContainer}>
              <Ionicons name="notifications" size={20} color="#4A90E2" />
            </View>
            <Text style={styles.cardTitle}>Custom Reminders</Text>
            <TouchableOpacity
              style={styles.addReminderButton}
              onPress={() => setShowReminderModal(true)}>
              <Ionicons name="add" size={20} color="#4A90E2" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.remindersDescription}>
            Set personalized notifications for your baby's routine activities.
          </Text>
          
          <View style={styles.remindersFeatures}>
            <View style={styles.reminderFeature}>
              <Ionicons name="checkmark-circle" size={16} color="#4A90E2" />
              <Text style={styles.featureText}>Set feeding and sleep reminders</Text>
            </View>
            <View style={styles.reminderFeature}>
              <Ionicons name="checkmark-circle" size={16} color="#4A90E2" />
              <Text style={styles.featureText}>Recurring daily reminders</Text>
            </View>
            <View style={styles.reminderFeature}>
              <Ionicons name="checkmark-circle" size={16} color="#4A90E2" />
              <Text style={styles.featureText}>Personalized messages</Text>
            </View>
          </View>
          
          {customReminders.length === 0 && (
            <TouchableOpacity
              style={styles.createReminderButton}
              onPress={() => setShowReminderModal(true)}>
              <Ionicons name="add-circle" size={16} color="#1E40AF" />
              <Text style={styles.createReminderText}>Create Your First Reminder</Text>
              <Ionicons name="chevron-forward" size={16} color="#1E40AF" />
            </TouchableOpacity>
          )}
          
          {customReminders.length > 0 && (
            <View style={styles.activeReminders}>
              <Text style={styles.activeRemindersTitle}>Active Reminders</Text>
              
              {/* Test Notifications Button */}
              <TouchableOpacity
                style={styles.testNotificationButton}
                onPress={async () => {
                  try {
                    console.log('Testing notifications...');
                    
                    // Get debug info first
                    const debugInfo = await NotificationService.getNotificationDebugInfo();
                    console.log('Notification debug info:', debugInfo);
                    
                    await NotificationService.scheduleTestNotification();
                    
                    // Show in-app notification as fallback
                    setInAppNotificationText(`🧪 Test notification sent! ${debugInfo.permission === 'granted' ? 'Check your browser/system notifications.' : 'Please enable notifications in browser settings.'}`);
                    setShowInAppNotification(true);
                    
                    // Auto-hide after 5 seconds
                    setTimeout(() => {
                      setShowInAppNotification(false);
                    }, 5000);
                    
                    let alertMessage = 'A test notification should appear shortly. If you don\'t see it:\n\n';
                    
                    if (!debugInfo.supported) {
                      alertMessage += '❌ Your browser doesn\'t support notifications\n';
                    } else if (debugInfo.permission !== 'granted') {
                      alertMessage += `❌ Notifications not allowed (${debugInfo.permission})\n`;
                      alertMessage += '• Click the 🔒 icon in address bar\n';
                      alertMessage += '• Select "Allow" for notifications\n';
                    } else if (!debugInfo.isSecure) {
                      alertMessage += '❌ Notifications require HTTPS or localhost\n';
                    } else {
                      alertMessage += '✅ Notifications should work\n';
                      alertMessage += '• Check your system notification center\n';
                      alertMessage += '• Look for browser notification settings\n';
                      alertMessage += '• Try clicking away from this tab and back\n';
                    }
                    
                    alertMessage += `\nBrowser: ${debugInfo.userAgent.split(' ').pop()}\n`;
                    alertMessage += `Protocol: ${debugInfo.protocol}\n`;
                    alertMessage += `Permission: ${debugInfo.permission}`;
                    
                    Alert.alert(
                      'Test Notification Debug 🧪', 
                      alertMessage,
                      [{ text: 'OK', style: 'default' }]
                    );
                  } catch (error) {
                    console.error('Test notification error:', error);
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                    
                    let troubleshootingSteps = '\n\nTroubleshooting steps:\n';
                    troubleshootingSteps += '1. Click the 🔒 icon in your browser\'s address bar\n';
                    troubleshootingSteps += '2. Find "Notifications" and set to "Allow"\n';
                    troubleshootingSteps += '3. Refresh the page and try again\n';
                    troubleshootingSteps += '4. Check your browser\'s notification settings\n';
                    troubleshootingSteps += '5. Make sure "Do Not Disturb" is off';
                    
                    Alert.alert('Test Failed ❌', `${errorMessage}${troubleshootingSteps}`);
                  }
                }}>
                <Ionicons name="flask" size={16} color="#1E40AF" />
                <Text style={styles.testNotificationText}>Test Notifications</Text>
              </TouchableOpacity>
              
              {customReminders.map((reminder) => (
                <View key={reminder.id} style={styles.reminderItem}>
                  <View style={styles.reminderIcon}>
                    <Ionicons name="notifications" size={16} color="#4A90E2" />
                  </View>
                  <View style={styles.reminderInfo}>
                    <Text style={styles.reminderTitle}>{reminder.title}</Text>
                    <Text style={styles.reminderTime}>{reminder.time}</Text>
                  </View>
                  <View style={[styles.reminderStatus, { backgroundColor: '#10B981' }]}>
                    <Text style={styles.reminderStatusText}>Active</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Notification Permission Card */}
        {!notificationPermission && (
          <View style={styles.notificationCard}>
            <View style={styles.notificationHeader}>
              <Ionicons name="notifications" size={24} color="#F59E0B" />
              <Text style={styles.notificationTitle}>Enable Notifications</Text>
            </View>
            <Text style={styles.notificationText}>
              Get helpful reminders for feeding times, sleep schedules, and other important baby care activities.
            </Text>
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={requestNotificationPermission}>
              <Text style={styles.notificationButtonText}>Enable Notifications</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Sleep Duration Modal */}
      <Modal
        visible={showSleepModal}
        animationType="slide"
        presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={resetSleepModal}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Sleep Duration</Text>
            <View style={styles.modalHeaderSpacer} />
          </View>

          <View style={styles.modalContent}>
            {!showCustomInput ? (
              <>
                <Text style={styles.cardTitle}>How long did your baby sleep?</Text>
                <View style={styles.durationOptions}>
                  {[15, 30, 45, 60, 90, 120].map((minutes) => (
                    <TouchableOpacity
                      key={minutes}
                      style={styles.durationOption}
                      onPress={() => handleSleepDuration(minutes)}>
                      <View style={styles.durationIconContainer}>
                        <Ionicons name="moon" size={20} color="#4A90E2" />
                      </View>
                      <Text style={styles.durationLabel}>
                        {minutes < 60 ? `${minutes} minutes` : `${minutes / 60} hour${minutes > 60 ? 's' : ''}`}
                      </Text>
                      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                  ))}
                  
                  <TouchableOpacity
                    style={styles.customDurationOption}
                    onPress={() => setShowCustomInput(true)}>
                    <View style={styles.durationIconContainer}>
                      <Ionicons name="create" size={20} color="#4A90E2" />
                    </View>
                    <Text style={styles.durationLabel}>Custom duration</Text>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.customInputContainer}>
                <Text style={styles.customInputTitle}>Enter custom duration</Text>
                <View style={styles.customInputRow}>
                  <TextInput
                    style={styles.customInput}
                    value={customDuration}
                    onChangeText={setCustomDuration}
                    placeholder="60"
                    keyboardType="numeric"
                    autoFocus
                  />
                  <Text style={styles.customInputUnit}>minutes</Text>
                </View>
                <View style={styles.customInputButtons}>
                  <TouchableOpacity
                    style={styles.customInputButton}
                    onPress={() => setShowCustomInput(false)}>
                    <Text style={styles.customInputButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.customInputButton, styles.customInputButtonPrimary]}
                    onPress={handleCustomDuration}>
                    <Text style={[styles.customInputButtonText, styles.customInputButtonTextPrimary]}>
                      Log Sleep
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

     <Modal
  visible={showBabyInfoModal}
  animationType="slide"
  presentationStyle="pageSheet">
  <View style={styles.modalContainer}>
    <View style={styles.modalHeader}>
      <TouchableOpacity onPress={() => setShowBabyInfoModal(false)}>
        <Ionicons name="close" size={24} color="#6B7280" />
      </TouchableOpacity>
      <Text style={styles.modalTitle}>Baby Profile</Text>
      <TouchableOpacity onPress={handleSaveBabyInfo}>
        <Text style={[styles.modalTitle, { color: '#4A90E2' }]}>Save</Text>
      </TouchableOpacity>
    </View>

    <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.babyInfoModalSubtitle}>
        Create a complete profile for your little one to get personalized insights, growth tracking, and age-appropriate guidance.
      </Text>

      {/* Basic Information */}
      <View style={styles.sectionHeader}>
        <Ionicons name="person" size={20} color="#4A90E2" />
        <Text style={styles.sectionTitle}>Basic Information</Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Baby's Name</Text>
        <TextInput
          style={styles.textInput}
          value={babyInfo.name}
          onChangeText={(text) => setBabyInfo(prev => ({ ...prev, name: text }))}
          placeholder="Enter your baby's name"
          autoCapitalize="words"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Gender</Text>
        <View style={styles.genderSelector}>
          {[
            { value: 'boy', label: 'Boy', icon: 'male' },
            { value: 'girl', label: 'Girl', icon: 'female' },
            { value: 'other', label: 'Other', icon: 'person' }
          ].map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.genderOption,
                babyInfo.gender === option.value && styles.genderOptionActive
              ]}
              onPress={() => setBabyInfo(prev => ({ ...prev, gender: option.value as 'boy' | 'girl' | 'other' }))}>
              <Ionicons 
                name={option.icon} 
                size={20} 
                color={babyInfo.gender === option.value ? '#FFFFFF' : '#6B7280'} 
              />
              <Text style={[
                styles.genderOptionText,
                babyInfo.gender === option.value && styles.genderOptionTextActive
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Birth Date</Text>
        <TextInput
          style={styles.textInput}
          value={babyInfo.birthDate}
          onChangeText={(text) => setBabyInfo(prev => ({ ...prev, birthDate: text }))}
          placeholder="YYYY-MM-DD"
          keyboardType="numeric"
        />
        <Text style={styles.inputHint}>
          Format: YYYY-MM-DD (e.g., 2024-01-15)
        </Text>
      </View>

      {/* Birth Information */}
      <View style={styles.sectionHeader}>
        <Ionicons name="scale" size={20} color="#4A90E2" />
        <Text style={styles.sectionTitle}>Birth Information</Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Birth Weight</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextInput
            style={[styles.textInput, { flex: 1, marginRight: 12 }]}
            value={babyInfo.birthWeight ? babyInfo.birthWeight.toString() : ''}
            onChangeText={(text) => setBabyInfo(prev => ({ ...prev, birthWeight: parseFloat(text) || 0 }))}
            placeholder="3.5"
            keyboardType="decimal-pad"
          />
          <View style={{ flexDirection: 'row' }}>
            {['kg', 'lbs'].map((unit) => (
              <TouchableOpacity
                key={unit}
                onPress={() => setBabyInfo(prev => ({ ...prev, birthWeightUnit: unit as 'kg' | 'lbs' }))}
                style={{
                  backgroundColor: babyInfo.birthWeightUnit === unit ? '#4A90E2' : '#E5E7EB',
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  borderRadius: 6,
                  marginLeft: unit === 'lbs' ? 8 : 0,
                }}
              >
                <Text style={{ color: babyInfo.birthWeightUnit === unit ? '#fff' : '#374151', fontWeight: '600' }}>{unit}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Feeding Information */}
      <View style={styles.sectionHeader}>
        <Ionicons name="nutrition" size={20} color="#4A90E2" />
        <Text style={styles.sectionTitle}>Feeding Information</Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Primary Feeding Method</Text>
        {[
          {
            value: 'breastfeeding',
            label: 'Breastfeeding',
            description: 'Exclusively breastfeeding',
            icon: 'heart',
          },
          {
            value: 'bottle',
            label: 'Bottle',
            description: 'Formula or expressed milk',
            icon: 'nutrition',
          },
          {
            value: 'mixed',
            label: 'Mixed',
            description: 'Combination feeding',
            icon: 'restaurant',
          },
        ].map((option) => {
          const isSelected = babyInfo.feedingType === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              onPress={() => setBabyInfo((prev) => ({ ...prev, feedingType: option.value as any }))}
              style={{
                backgroundColor: isSelected ? '#DBEAFE' : '#FFFFFF',
                borderColor: isSelected ? '#3B82F6' : '#E5E7EB',
                borderWidth: 2,
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <View style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: isSelected ? '#BFDBFE' : '#F3F4F6',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 16,
              }}>
                <Ionicons
                  name={option.icon}
                  size={20}
                  color={isSelected ? '#1D4ED8' : '#6B7280'}
                />
              </View>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>
                  {option.label}
                </Text>
                <Text style={{ fontSize: 13, color: '#4B5563' }}>{option.description}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  </View>
</Modal>



      {/* Validation Modal */}
      <ValidationModal
        visible={validationModal.visible}
        title={validationModal.title}
        message={validationModal.message}
        onClose={() => setValidationModal({ visible: false, title: '', message: '' })}
      />

      {/* Weight Tracker Modal */}
      <WeightTracker
        visible={showWeightTracker}
        onClose={() => setShowWeightTracker(false)}
        onSave={loadData}
      />

      {/* Custom Reminder Modal */}
      <CustomReminderModal
        visible={showReminderModal}
        onClose={() => setShowReminderModal(false)}
        onSave={() => {
          loadData();
          setShowReminderModal(false);
        }}
      />

      {/* In-App Notification Overlay */}
      {showInAppNotification && (
        <View style={styles.inAppNotificationOverlay}>
          <View style={styles.inAppNotification}>
            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            <Text style={styles.inAppNotificationText}>{inAppNotificationText}</Text>
            <TouchableOpacity
              style={styles.inAppNotificationClose}
              onPress={() => setShowInAppNotification(false)}>
              <Ionicons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  quickActions: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  recentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyText: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 16,
    paddingVertical: 20,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  activityTime: {
    fontSize: 14,
    color: '#6B7280',
  },
  activityDuration: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  lastActivityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lastActivityContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lastActivityIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  lastActivityType: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  lastActivityTime: {
    fontSize: 14,
    color: '#6B7280',
  },
  timeAgo: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  remindersCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  remindersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  remindersIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EBF8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  addReminderButton: {
    marginLeft: 'auto',
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  remindersDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 20,
  },
  remindersFeatures: {
    marginBottom: 24,
  },
  reminderFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  createReminderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F9FF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  createReminderText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E40AF',
    marginLeft: 8,
    marginRight: 8,
    flex: 1,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    flex: 1,
  },
  modalHeaderSpacer: {
    width: 24,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  durationOptions: {
    marginTop: 20,
  },
  durationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  durationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  durationLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    flex: 1,
  },
  customDurationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  customInputContainer: {
    padding: 20,
  },
  customInputTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 20,
    textAlign: 'center',
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  customInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#4A90E2',
    borderRadius: 8,
    padding: 16,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    minWidth: 100,
    marginRight: 12,
  },
  customInputUnit: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  customInputButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  customInputButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  customInputButtonPrimary: {
    backgroundColor: '#4A90E2',
  },
  customInputButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  customInputButtonTextPrimary: {
    color: '#FFFFFF',
  },
  notificationCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  notificationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#92400E',
    marginLeft: 12,
  },
  notificationText: {
    fontSize: 14,
    color: '#92400E',
    marginBottom: 16,
    lineHeight: 20,
  },
  notificationButton: {
    backgroundColor: '#F59E0B',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  notificationButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  tipCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
    marginLeft: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  babyInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  babyInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  babyInfoIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EBF8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  babyInfoContent: {
    flex: 1,
  },
  babyName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  babyAge: {
    fontSize: 14,
    color: '#6B7280',
  },
  babyInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  babyInfoSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  setBabyInfoButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  babyInfoModalSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 22,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  inputHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
    fontStyle: 'italic',
  },
  genderSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  genderOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  genderOptionActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  genderOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: 8,
  },
  genderOptionTextActive: {
    color: '#FFFFFF',
  },
  nhsInsightsContainer: {
    marginBottom: 20,
  },
  activeReminders: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  activeRemindersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    marginBottom: 8,
  },
  reminderIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EBF8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  reminderInfo: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  reminderTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  reminderStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  reminderStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  setBirthDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F9FF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginTop: 12,
  },
  setBirthDateText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E40AF',
    marginLeft: 8,
  },
  testNotificationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F9FF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginBottom: 16,
  },
  testNotificationText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E40AF',
    marginLeft: 8,
  },
  inAppNotificationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  inAppNotification: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    maxWidth: 350,
  },
  inAppNotificationText: {
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 12,
    flex: 1,
    lineHeight: 22,
  },
  inAppNotificationClose: {
    padding: 4,
    marginLeft: 8,
  },
});