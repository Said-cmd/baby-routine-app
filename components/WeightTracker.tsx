import React, { useState, useEffect } from 'react';
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
import { LineChart } from 'react-native-chart-kit';
import { DataService } from '@/services/DataService';
import { WeightRecord } from '@/types/Activity';
import { Dimensions } from 'react-native';

const screenWidth = Dimensions.get('window').width;

interface WeightTrackerProps {
  visible: boolean;
  onClose: () => void;
}

export default function WeightTracker({ visible, onClose }: WeightTrackerProps) {
  const [weightRecords, setWeightRecords] = useState<WeightRecord[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWeight, setNewWeight] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<'kg' | 'lbs'>('kg');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      loadWeightRecords();
    }
  }, [visible]);

  const loadWeightRecords = async () => {
    try {
      const records = await DataService.getWeightRecords();
      setWeightRecords(records);
    } catch (error) {
      console.error('Error loading weight records:', error);
      Alert.alert('Error', 'Failed to load weight records');
    } finally {
      setLoading(false);
    }
  };

  const handleAddWeight = async () => {
    const weight = parseFloat(newWeight);
    if (isNaN(weight) || weight <= 0) {
      Alert.alert('Error', 'Please enter a valid weight');
      return;
    }

    try {
      const record: WeightRecord = {
        id: Date.now().toString(),
        weight,
        unit: selectedUnit,
        timestamp: new Date().toISOString(),
        notes: notes.trim() || undefined,
      };

      await DataService.addWeightRecord(record);
      await loadWeightRecords();
      
      // Reset form
      setNewWeight('');
      setNotes('');
      setShowAddModal(false);
      
      Alert.alert('Success', 'Weight recorded successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to record weight');
    }
  };

  const handleDeleteRecord = (record: WeightRecord) => {
    Alert.alert(
      'Delete Weight Record',
      `Are you sure you want to delete this weight record (${record.weight}${record.unit})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await DataService.deleteWeightRecord(record.id);
              await loadWeightRecords();
              Alert.alert('Success', 'Weight record deleted');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete weight record');
            }
          },
        },
      ]
    );
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-GB', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const getChartData = () => {
    if (weightRecords.length < 2) return null;

    // Take last 10 records and reverse for chronological order
    const recentRecords = weightRecords.slice(0, 10).reverse();
    
    return {
      labels: recentRecords.map(record => 
        new Date(record.timestamp).toLocaleDateString('en-GB', { 
          month: 'short', 
          day: 'numeric' 
        })
      ),
      datasets: [{
        data: recentRecords.map(record => record.weight),
        color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
        strokeWidth: 2,
      }],
    };
  };

  const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.7,
    useShadowColorFromDataset: false,
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
          <Text style={styles.title}>Weight Tracker</Text>
          <TouchableOpacity onPress={() => setShowAddModal(true)}>
            <Ionicons name="add" size={24} color="#4A90E2" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Chart */}
          {getChartData() && (
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Weight Progress</Text>
              <LineChart
                data={getChartData()!}
                width={screenWidth - 60}
                height={220}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
              />
            </View>
          )}

          {/* Weight Records */}
          <View style={styles.recordsCard}>
            <Text style={styles.cardTitle}>Weight Records</Text>
            {weightRecords.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="scale" size={48} color="#9CA3AF" />
                <Text style={styles.emptyTitle}>No Weight Records</Text>
                <Text style={styles.emptyText}>
                  Start tracking your baby's weight to monitor growth
                </Text>
              </View>
            ) : (
              weightRecords.map((record) => (
                <View key={record.id} style={styles.recordItem}>
                  <View style={styles.recordIcon}>
                    <Ionicons name="scale" size={20} color="#4A90E2" />
                  </View>
                  <View style={styles.recordInfo}>
                    <Text style={styles.recordWeight}>
                      {record.weight}{record.unit}
                    </Text>
                    <Text style={styles.recordDate}>
                      {formatDate(record.timestamp)}
                    </Text>
                    {record.notes && (
                      <Text style={styles.recordNotes}>{record.notes}</Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteRecord(record)}>
                    <Ionicons name="trash" size={16} color="#FF6B6B" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </ScrollView>

        {/* Add Weight Modal */}
        <Modal
          visible={showAddModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowAddModal(false)}>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Add Weight</Text>
              <TouchableOpacity onPress={handleAddWeight}>
                <Text style={styles.saveButton}>Save</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Weight</Text>
                <View style={styles.weightInputRow}>
                  <TextInput
                    style={styles.weightInput}
                    placeholder="0.0"
                    value={newWeight}
                    onChangeText={setNewWeight}
                    keyboardType="decimal-pad"
                  />
                  <View style={styles.unitSelector}>
                    <TouchableOpacity
                      style={[
                        styles.unitButton,
                        selectedUnit === 'kg' && styles.unitButtonActive
                      ]}
                      onPress={() => setSelectedUnit('kg')}>
                      <Text style={[
                        styles.unitButtonText,
                        selectedUnit === 'kg' && styles.unitButtonTextActive
                      ]}>kg</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.unitButton,
                        selectedUnit === 'lbs' && styles.unitButtonActive
                      ]}
                      onPress={() => setSelectedUnit('lbs')}>
                      <Text style={[
                        styles.unitButtonText,
                        selectedUnit === 'lbs' && styles.unitButtonTextActive
                      ]}>lbs</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Notes (optional)</Text>
                <TextInput
                  style={[styles.textInput, styles.notesInput]}
                  placeholder="e.g., After feeding, doctor visit..."
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  chartCard: {
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
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  chart: {
    borderRadius: 8,
  },
  recordsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  recordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  recordIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EBF8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recordInfo: {
    flex: 1,
  },
  recordWeight: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  recordDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  recordNotes: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#FEF2F2',
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
  weightInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weightInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
    marginRight: 12,
  },
  unitSelector: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 2,
  },
  unitButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  unitButtonActive: {
    backgroundColor: '#4A90E2',
  },
  unitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  unitButtonTextActive: {
    color: '#FFFFFF',
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
    height: 80,
    textAlignVertical: 'top',
  },
});