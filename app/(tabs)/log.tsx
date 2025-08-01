import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DataService } from '@/services/DataService';
import { NotificationService } from '@/services/NotificationService';
import ValidationModal from '@/components/ValidationModal';
import { Activity, ActivityType } from '@/types/Activity';

export default function LogActivity() {
  const [selectedType, setSelectedType] = useState<ActivityType | null>(null);
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [validationModal, setValidationModal] = useState({
    visible: false,
    title: '',
    message: '',
  });

  const activityTypes = [
    { type: 'feeding' as ActivityType, icon: 'nutrition', color: '#4A90E2', label: 'Feeding' },
    { type: 'sleep' as ActivityType, icon: 'moon', color: '#7ED321', label: 'Sleep' },
    { type: 'nappy' as ActivityType, icon: 'medical', color: '#FF6B6B', label: 'Nappy Change' },
    { type: 'weight' as ActivityType, icon: 'scale', color: '#8B5CF6', label: 'Weight' },
  ];

  const handleLogActivity = async () => {
    if (!selectedType) {
      Alert.alert('Error', 'Please select an activity type');
      return;
    }

    try {
      const activity: Activity = {
        id: Date.now().toString(),
        type: selectedType,
        timestamp: new Date().toISOString(),
        duration: duration ? parseInt(duration) : undefined,
        notes: notes.trim(),
      };

      await DataService.addActivity(activity);
      await NotificationService.scheduleNextReminder(selectedType);

      Alert.alert('Success', `${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} logged successfully!`);

      setSelectedType(null);
      setNotes('');
      setDuration('');
      setShowModal(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to log activity';
      setValidationModal({
        visible: true,
        title: 'Cannot Log Activity',
        message: errorMessage,
      });
    }
  };

  const openDetailModal = (type: ActivityType) => {
    setSelectedType(type);
    setShowModal(true);
  };

  const renderGuidelinesText = (type: ActivityType) => {
    switch (type) {
      case 'feeding':
        return 'Newborns typically feed every 2–3 hours, 8–12 times per day.';
      case 'sleep':
        return 'Newborns sleep 14–17 hours per day, usually in 2–4 hour stretches.';
      case 'nappy':
        return 'Expect 6–8 wet nappies and 3–4 dirty nappies per day for newborns.';
      case 'weight':
        return 'Track weight regularly to monitor healthy growth patterns.';
      default:
        return '';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Log Activity</Text>
        <Text style={styles.subtitle}>Record your baby's activities</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.activityGrid}>
          {activityTypes.map((item) => (
            <TouchableOpacity
              key={item.type}
              style={[
                styles.activityCard,
                { borderColor: item.color },
                selectedType === item.type && { backgroundColor: `${item.color}20` },
              ]}
              onPress={() => openDetailModal(item.type)}>
              <View style={[styles.activityIcon, { backgroundColor: item.color }]}>
                <Ionicons name={item.icon} size={32} color="#FFFFFF" />
              </View>
              <Text style={styles.activityLabel}>{item.label}</Text>
              <View style={styles.quickLogButton}>
                <Text style={styles.quickLogText}>Quick Log</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>💡 Logging Tips</Text>
         <Text style={styles.tipsText}>
  {'\u2022'} Log activities as they happen for better accuracy{'\n'}
  {'\u2022'} Use the quick log buttons for faster entry{'\n'}
  {'\u2022'} Add notes for anything unusual or noteworthy{'\n'}
  {'\u2022'} Track sleep duration to understand patterns
</Text>

        </View>
      </ScrollView>

      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              Log {selectedType && activityTypes.find(t => t.type === selectedType)?.label}
            </Text>
            <TouchableOpacity onPress={handleLogActivity}>
              <Text style={styles.saveButton}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedType === 'sleep' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Duration (minutes)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g., 30 (will show as 30m) or 90 (will show as 1h 30m)"
                  value={duration}
                  onChangeText={setDuration}
                  keyboardType="numeric"
                />
                <Text style={styles.inputHint}>
                  Enter duration in minutes. Will display as hours and minutes for longer sleeps.
                </Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Notes (optional)</Text>
              <TextInput
                style={[styles.textInput, styles.notesInput]}
                placeholder="Add any notes about this activity..."
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
              />
            </View>

            {selectedType && (
              <View style={styles.guidelinesCard}>
                <Text style={styles.guidelinesTitle}>NHS Guidelines</Text>
                <Text style={styles.guidelinesText}>{renderGuidelinesText(selectedType)}</Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <ValidationModal
        visible={validationModal.visible}
        title={validationModal.title}
        message={validationModal.message}
        onClose={() => setValidationModal({ visible: false, title: '', message: '' })}
      />
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
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  activityCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activityIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  activityLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  quickLogButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  quickLogText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  tipsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  tipsText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
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
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90E2',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
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
  notesInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  guidelinesCard: {
    backgroundColor: '#EBF8FF',
    borderRadius: 8,
    padding: 16,
    marginTop: 20,
  },
  guidelinesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 8,
  },
  guidelinesText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
});
