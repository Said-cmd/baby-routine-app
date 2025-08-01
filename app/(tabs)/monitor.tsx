import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ScrollView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AudioService } from '@/services/AudioService';
import { DataService } from '@/services/DataService';
import { Activity } from '@/types/Activity';

export default function Monitor() {
  const [isListening, setIsListening] = useState(false);
  const [cryingDetected, setCryingDetected] = useState(false);
  const [cryingCount, setCryingCount] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (isListening) {
      startPulseAnimation();
    } else {
      stopPulseAnimation();
    }
  }, [isListening]);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopPulseAnimation = () => {
    pulseAnim.setValue(1);
  };

  const handleStartListening = async () => {
    try {
      await AudioService.startCryingDetection(handleCryingDetected);
      setIsListening(true);
      setSessionStartTime(new Date());
      setCryingCount(0);
      setCryingDetected(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to start listening. Please check microphone permissions.');
    }
  };

  const handleStopListening = async () => {
    try {
      await AudioService.stopCryingDetection();
      setIsListening(false);
      setSessionStartTime(null);
      setCryingDetected(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to stop listening.');
    }
  };

  const handleCryingDetected = () => {
    setCryingDetected(true);
    setCryingCount(prev => prev + 1);
    
    // Show alert with quick action options
    Alert.alert(
      'Crying Detected! 👶',
      'Your baby seems to be crying. What would you like to do?',
      [
        { text: 'Dismiss', style: 'cancel' },
        { text: 'Log Feed', onPress: () => quickLogActivity('feeding') },
        { text: 'Log Nappy', onPress: () => quickLogActivity('nappy') },
        { text: 'Log Sleep', onPress: () => quickLogActivity('sleep') },
      ]
    );

    // Reset crying detected state after 5 seconds
    setTimeout(() => setCryingDetected(false), 5000);
  };

  const quickLogActivity = async (type: 'feeding' | 'sleep' | 'nappy') => {
    try {
      const activity: Activity = {
        id: Date.now().toString(),
        type,
        timestamp: new Date().toISOString(),
        notes: 'Logged from crying detection',
      };

      await DataService.addActivity(activity);
      Alert.alert('Success', `${type.charAt(0).toUpperCase() + type.slice(1)} logged successfully!`);
    } catch (error) {
      console.error('Error in quickLogActivity:', error);
      Alert.alert(
        'Cannot Log Activity', 
        error instanceof Error ? error.message : 'Failed to log activity',
        [{ text: 'OK', style: 'default' }]
      );
    }
  };

  const formatSessionTime = () => {
    if (!sessionStartTime) return '0:00';
    
    const now = new Date();
    const diff = now.getTime() - sessionStartTime.getTime();
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Baby Monitor</Text>
        <Text style={styles.subtitle}>Audio crying detection</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Monitor Status */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Ionicons 
              name={isListening ? 'mic' : 'mic-off'} 
              size={24} 
              color={isListening ? '#4A90E2' : '#6B7280'} 
            />
            <Text style={styles.statusTitle}>
              {isListening ? 'Listening...' : 'Not Listening'}
            </Text>
          </View>
          
          {isListening && (
            <View style={styles.statusDetails}>
              <Text style={styles.statusTime}>Session: {formatSessionTime()}</Text>
              <Text style={styles.statusCount}>Crying events: {cryingCount}</Text>
            </View>
          )}
        </View>

        {/* Main Control */}
        <View style={styles.controlCard}>
          <Animated.View 
            style={[
              styles.microphoneContainer,
              { transform: [{ scale: pulseAnim }] }
            ]}>
            <TouchableOpacity
              style={[
                styles.microphoneButton,
                { backgroundColor: isListening ? '#FF6B6B' : '#4A90E2' },
                cryingDetected && styles.cryingDetectedButton
              ]}
              onPress={isListening ? handleStopListening : handleStartListening}>
              <Ionicons 
                name={isListening ? 'stop' : 'mic'} 
                size={48} 
                color="#FFFFFF" 
              />
            </TouchableOpacity>
          </Animated.View>
          
          <Text style={styles.controlText}>
            {isListening ? 'Tap to stop monitoring' : 'Tap to start monitoring'}
          </Text>
          
          {cryingDetected && (
            <View style={styles.cryingAlert}>
              <Ionicons name="alert-circle" size={20} color="#FF6B6B" />
              <Text style={styles.cryingAlertText}>Crying detected!</Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsCard}>
          <Text style={styles.cardTitle}>Quick Actions</Text>
          <Text style={styles.cardSubtitle}>
            When crying is detected, you can quickly log activities
          </Text>
          
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#4A90E2' }]}
              onPress={() => quickLogActivity('feeding')}>
              <Ionicons name="nutrition" size={24} color="#FFFFFF" />
              <Text style={styles.actionText}>Feed</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#7ED321' }]}
              onPress={() => quickLogActivity('sleep')}>
              <Ionicons name="moon" size={24} color="#FFFFFF" />
              <Text style={styles.actionText}>Sleep</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#FF6B6B' }]}
              onPress={() => quickLogActivity('nappy')}>
              <Ionicons name="medical" size={24} color="#FFFFFF" />
              <Text style={styles.actionText}>Nappy</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tips */}
        <View style={styles.tipsCard}>
          <Text style={styles.cardTitle}>💡 Monitor Tips</Text>
          <View style={styles.tipsList}>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={16} color="#4A90E2" />
              <Text style={styles.tipText}>
                Place your device close to baby's sleep area
              </Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={16} color="#4A90E2" />
              <Text style={styles.tipText}>
                Keep the app open and prevent screen lock
              </Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={16} color="#4A90E2" />
              <Text style={styles.tipText}>
                Monitor works best in quiet environments
              </Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={16} color="#4A90E2" />
              <Text style={styles.tipText}>
                Remember to stop monitoring when not needed
              </Text>
            </View>
          </View>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimerCard}>
          <Ionicons name="information-circle" size={20} color="#F59E0B" />
          <Text style={styles.disclaimerText}>
            This monitor is a helpful tool but should not replace parental supervision. 
            Always ensure your baby's safety and wellbeing.
          </Text>
        </View>
      </ScrollView>
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
  statusCard: {
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
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 12,
  },
  statusDetails: {
    paddingLeft: 36,
  },
  statusTime: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  statusCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  controlCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 40,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  microphoneContainer: {
    marginBottom: 20,
  },
  microphoneButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cryingDetectedButton: {
    backgroundColor: '#FF6B6B',
  },
  controlText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  cryingAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  cryingAlertText: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '600',
    marginLeft: 8,
  },
  quickActionsCard: {
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
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
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
  tipsCard: {
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
  tipsList: {
    marginTop: 8,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
    flex: 1,
  },
  disclaimerCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#FED7AA',
    marginBottom: 20,
  },
  disclaimerText: {
    fontSize: 14,
    color: '#92400E',
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
});