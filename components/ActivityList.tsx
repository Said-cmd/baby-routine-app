import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DataService } from '@/services/DataService';
import { Activity, ActivityType } from '@/types/Activity';

interface ActivityListProps {
  limit?: number;
  showDelete?: boolean;
  filterType?: ActivityType;
  onActivityDeleted?: () => void;
}

export default function ActivityList({ 
  limit, 
  showDelete = false, 
  filterType,
  onActivityDeleted 
}: ActivityListProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadActivities();
  }, [filterType, limit]);

  const loadActivities = async () => {
    try {
      let loadedActivities: Activity[];
      
      if (filterType) {
        loadedActivities = await DataService.getActivitiesByType(filterType);
      } else if (limit) {
        loadedActivities = await DataService.getRecentActivities(limit);
      } else {
        loadedActivities = await DataService.getActivities();
      }
      
      setActivities(loadedActivities);
    } catch (error) {
      console.error('Error loading activities:', error);
      Alert.alert('Error', 'Failed to load activities');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadActivities();
  };

  const handleDeleteActivity = (activity: Activity) => {
    Alert.alert(
      'Delete Activity',
      `Are you sure you want to delete this ${activity.type} activity?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await DataService.deleteActivity(activity.id);
              await loadActivities();
              onActivityDeleted?.();
              Alert.alert('Success', 'Activity deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete activity');
            }
          },
        },
      ]
    );
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-GB', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    }
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

  const renderActivity = ({ item }: { item: Activity }) => (
    <View style={styles.activityItem}>
      <View style={[styles.activityIcon, { backgroundColor: getActivityColor(item.type) }]}>
        <Ionicons name={getActivityIcon(item.type)} size={20} color="#FFFFFF" />
      </View>
      
      <View style={styles.activityInfo}>
        <Text style={styles.activityType}>
          {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
        </Text>
        <Text style={styles.activityTime}>
          {formatDate(item.timestamp)} at {formatTime(item.timestamp)}
        </Text>
        {item.notes && (
          <Text style={styles.activityNotes} numberOfLines={2}>
            {item.notes}
          </Text>
        )}
      </View>
      
      <View style={styles.activityMeta}>
        {item.duration && (
          <Text style={styles.activityDuration}>
            {item.duration >= 60 ? `${Math.floor(item.duration / 60)}h ${item.duration % 60}m` : `${item.duration}m`}
          </Text>
        )}
        {showDelete && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteActivity(item)}>
            <Ionicons name="trash" size={16} color="#FF6B6B" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading activities...</Text>
      </View>
    );
  }

  if (activities.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="calendar-outline" size={48} color="#9CA3AF" />
        <Text style={styles.emptyTitle}>No Activities Yet</Text>
        <Text style={styles.emptyText}>
          {filterType 
            ? `No ${filterType} activities found`
            : 'Start logging your baby\'s activities to see them here'
          }
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={activities}
      renderItem={renderActivity}
      keyExtractor={(item) => item.id}
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  activityInfo: {
    flex: 1,
  },
  activityType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  activityNotes: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  activityMeta: {
    alignItems: 'flex-end',
  },
  activityDuration: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 8,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#FEF2F2',
  },
});