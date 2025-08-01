import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DataService } from '@/services/DataService';
import { CustomReminder, ActivityType } from '@/types/Activity';

interface CustomReminderModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
}

export default function CustomReminderModal({ 
  visible, 
  onClose, 
  onSave 
}: CustomReminderModalProps) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [selectedActivityType, setSelectedActivityType] = useState<ActivityType>('feeding');
  const [selectedHour, setSelectedHour] = useState(9);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [isRecurring, setIsRecurring] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  const activityTypes: { type: ActivityType; label: string; icon: string }[] = [
    { type: 'feeding', label: 'Feed', icon: 'nutrition' },
    { type: 'sleep', label: 'Sleep', icon: 'moon' },
  ];

  const daysOfWeek = [
    { day: 0, label: 'Sun' },
    { day: 1, label: 'Mon' },
    { day: 2, label: 'Tue' },
    { day: 3, label: 'Wed' },
    { day: 4, label: 'Thu' },
    { day: 5, label: 'Fri' },
    { day: 6, label: 'Sat' },
  ];

  const handleSaveReminder = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title for the reminder');
      return;
    }

    if (!message.trim()) {
      Alert.alert('Error', 'Please enter a message for the reminder');
      return;
    }

    if (isRecurring && selectedDays.length === 0) {
      Alert.alert('Error', 'Please select at least one day for recurring reminders');
      return;
    }

    try {
      const reminder: CustomReminder = {
        id: Date.now().toString(),
        title: title.trim(),
        message: message.trim(),
        activityType: selectedActivityType,
        time: `${selectedHour.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`,
        isRecurring,
        recurringDays: isRecurring ? selectedDays : undefined,
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      await DataService.addCustomReminder(reminder);
      
      // Reset form
      setTitle('');
      setMessage('');
      setSelectedActivityType('feeding');
      setSelectedHour(9);
      setSelectedMinute(0);
      setIsRecurring(false);
      setSelectedDays([]);
      
      onSave();
      onClose();
      
      Alert.alert('Success', 'Reminder created successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to create reminder');
    }
  };

  const toggleDay = (day: number) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    );
  };

  const generateSuggestions = () => {
    const suggestions = {
      feeding: {
        title: 'Time for feeding',
        message: "It's time for baby's feeding"
      },
      sleep: {
        title: 'Nap time',
        message: "Time to put baby down for a nap"
      },
      nappy: {
        title: 'Nappy check',
        message: "Time to check baby's nappy"
      },
      weight: {
        title: 'Weight check',
        message: "Time to weigh the baby"
      }
    };

    const suggestion = suggestions[selectedActivityType];
    setTitle(suggestion.title);
    setMessage(suggestion.message);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.title}>Create Reminder</Text>
          <TouchableOpacity onPress={handleSaveReminder}>
            <Text style={styles.saveButton}>Save Reminder</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <Text style={styles.subtitle}>Set up a reminder for your baby's routine</Text>

          {/* Activity Type */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Activity Type</Text>
            <View style={styles.activityTypeGrid}>
              {activityTypes.map((type) => (
                <TouchableOpacity
                  key={type.type}
                  style={[
                    styles.activityTypeButton,
                    selectedActivityType === type.type && styles.activityTypeButtonActive
                  ]}
                  onPress={() => setSelectedActivityType(type.type)}>
                  <Ionicons 
                    name={type.icon} 
                    size={20} 
                    color={selectedActivityType === type.type ? '#FFFFFF' : '#6B7280'} 
                  />
                  <Text style={[
                    styles.activityTypeText,
                    selectedActivityType === type.type && styles.activityTypeTextActive
                  ]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Title */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Title</Text>
              <TouchableOpacity onPress={generateSuggestions}>
                <Text style={styles.suggestionButton}>Use suggestion</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., Time for feeding"
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* Message */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Message</Text>
            <TextInput
              style={[styles.textInput, styles.messageInput]}
              placeholder="e.g., It's time for baby's feeding"
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Time */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Time</Text>
            <View style={styles.timePickerContainer}>
              <View style={styles.timePickerSection}>
                <Text style={styles.timePickerLabel}>Hour</Text>
                <View style={styles.timePickerDropdown}>
                  <TouchableOpacity
                    style={styles.timePickerButton}
                    onPress={() => {
                      // Create hour options (0-23)
                      const hours = Array.from({ length: 24 }, (_, i) => i);
                      // For simplicity, we'll cycle through common hours
                      const commonHours = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
                      const currentIndex = commonHours.indexOf(selectedHour);
                      const nextIndex = (currentIndex + 1) % commonHours.length;
                      setSelectedHour(commonHours[nextIndex]);
                    }}>
                    <Text style={styles.timePickerButtonText}>
                      {selectedHour.toString().padStart(2, '0')}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#6B7280" />
                  </TouchableOpacity>
                </View>
              </View>
              
              <Text style={styles.timeSeparator}>:</Text>
              
              <View style={styles.timePickerSection}>
                <Text style={styles.timePickerLabel}>Minute</Text>
                <View style={styles.timePickerDropdown}>
                  <TouchableOpacity
                    style={styles.timePickerButton}
                    onPress={() => {
                      // Cycle through 15-minute intervals
                      const minutes = [0, 15, 30, 45];
                      const currentIndex = minutes.indexOf(selectedMinute);
                      const nextIndex = (currentIndex + 1) % minutes.length;
                      setSelectedMinute(minutes[nextIndex]);
                    }}>
                    <Text style={styles.timePickerButtonText}>
                      {selectedMinute.toString().padStart(2, '0')}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#6B7280" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            
            <View style={styles.timePreview}>
              <Ionicons name="time" size={16} color="#4A90E2" />
              <Text style={styles.timePreviewText}>
                Reminder set for {selectedHour.toString().padStart(2, '0')}:{selectedMinute.toString().padStart(2, '0')}
              </Text>
            </View>
          </View>

          {/* Recurring Reminder */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.recurringToggle}
              onPress={() => setIsRecurring(!isRecurring)}>
              <View style={styles.recurringToggleLeft}>
                <View style={[
                  styles.checkbox,
                  isRecurring && styles.checkboxActive
                ]}>
                  {isRecurring && (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  )}
                </View>
                <View>
                  <Text style={styles.recurringTitle}>Recurring Reminder</Text>
                  <Text style={styles.recurringSubtitle}>
                    This reminder will repeat on selected days
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {isRecurring && (
              <View style={styles.daysSelector}>
                <Text style={styles.daysSelectorTitle}>Select Days</Text>
                <View style={styles.daysGrid}>
                  {daysOfWeek.map((day) => (
                    <TouchableOpacity
                      key={day.day}
                      style={[
                        styles.dayButton,
                        selectedDays.includes(day.day) && styles.dayButtonActive
                      ]}
                      onPress={() => toggleDay(day.day)}>
                      <Text style={[
                        styles.dayButtonText,
                        selectedDays.includes(day.day) && styles.dayButtonTextActive
                      ]}>
                        {day.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4A90E2',
  },
  content: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
    lineHeight: 22,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  suggestionButton: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: '500',
  },
  activityTypeGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  activityTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    justifyContent: 'center',
  },
  activityTypeButtonActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  activityTypeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 8,
  },
  activityTypeTextActive: {
    color: '#FFFFFF',
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 12,
    padding: 18,
    fontSize: 17,
    color: '#1F2937',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    marginTop: 4,
  },
  messageInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  recurringToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    marginTop: 4,
  },
  recurringToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  recurringTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  recurringSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  daysSelector: {
    marginTop: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  daysSelectorTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dayButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    minWidth: 48,
    alignItems: 'center',
    marginBottom: 8,
  },
  dayButtonActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  dayButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  dayButtonTextActive: {
    color: '#FFFFFF',
  },
  timePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    marginTop: 4,
  },
  timePickerSection: {
    alignItems: 'center',
  },
  timePickerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timePickerDropdown: {
    minWidth: 80,
  },
  timePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 80,
  },
  timePickerButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  timeSeparator: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginHorizontal: 16,
  },
  timePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#EBF8FF',
    borderRadius: 8,
  },
  timePreviewText: {
    fontSize: 14,
    color: '#1E40AF',
    marginLeft: 8,
    fontWeight: '500',
  },
});