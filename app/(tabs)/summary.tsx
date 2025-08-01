import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { DataService } from '@/services/DataService';
import { DailySummary, WeightRecord } from '@/types/Activity';
import { SleepPredictionService, SleepMetrics } from '@/services/SleepPredictionService';
import { getGuidelinesForAge, NHS_GUIDELINES } from '@/data/NHSGuidelines';

const screenWidth = Dimensions.get('window').width;

export default function Summary() {
  const [weeklySummaries, setWeeklySummaries] = useState<DailySummary[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>('week');
  const [babyAge, setBabyAge] = useState<number>(4); // Default to 4 weeks
  const [loading, setLoading] = useState(true);
  const [sleepMetrics, setSleepMetrics] = useState<SleepMetrics | null>(null);
  const [weightRecords, setWeightRecords] = useState<WeightRecord[]>([]);

  useEffect(() => {
    loadSummaryData();
    loadBabyAge();
    loadSleepPrediction();
    loadWeightData();
  }, []);

  const loadSummaryData = async () => {
    try {
      // Enhanced data loading with better error handling
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 6); // Last 7 days
      
      const summaries = await DataService.getWeeklySummaries(endDate);
      setWeeklySummaries(summaries);
      
      // Log data for debugging
      console.log(`Loaded ${summaries.length} daily summaries`);
    } catch (error) {
      console.error('Error loading summary data:', error);
      // Provide fallback empty data
      setWeeklySummaries([]);
    } finally {
      setLoading(false);
    }
  };

  const loadWeightData = async () => {
    try {
      const records = await DataService.getWeightRecords();
      setWeightRecords(records.slice(0, 10)); // Last 10 records for chart
    } catch (error) {
      console.error('Error loading weight data:', error);
    }
  };

  const loadSleepPrediction = async () => {
    try {
      const metrics = await SleepPredictionService.calculateSleepMetrics();
      setSleepMetrics(metrics);
      console.log('Sleep prediction metrics:', metrics);
    } catch (error) {
      console.error('Error loading sleep prediction:', error);
    }
  };
  const loadBabyAge = async () => {
    try {
      const babyInfo = await DataService.getBabyInfo();
      if (babyInfo?.birthDate) {
        const birthDate = new Date(babyInfo.birthDate);
        const today = new Date();
        const ageInWeeks = Math.floor((today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
        setBabyAge(ageInWeeks);
      }
    } catch (error) {
      console.error('Error loading baby age:', error);
    }
  };

  const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.7,
    useShadowColorFromDataset: false,
  };

  const feedingData = {
    labels: weeklySummaries.map(s => {
      const date = new Date(s.date);
      return date.toLocaleDateString('en-GB', { weekday: 'short' });
    }),
    datasets: [{
      data: weeklySummaries.map(s => s.totalFeeds),
      color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`,
      strokeWidth: 2,
    }],
  };

  const sleepData = {
    labels: weeklySummaries.map(s => {
      const date = new Date(s.date);
      return date.toLocaleDateString('en-GB', { weekday: 'short' });
    }),
    datasets: [{
      data: weeklySummaries.map(s => s.totalSleepDuration / 60), // Convert to hours
      color: (opacity = 1) => `rgba(126, 211, 33, ${opacity})`,
      strokeWidth: 2,
    }],
  };

  const weightData = weightRecords.length >= 2 ? {
    labels: weightRecords.slice(0, 7).reverse().map(record => 
      new Date(record.timestamp).toLocaleDateString('en-GB', { 
        month: 'short', 
        day: 'numeric' 
      })
    ),
    datasets: [{
      data: weightRecords.slice(0, 7).reverse().map(record => record.weight),
      color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
      strokeWidth: 2,
    }],
  } : null;

  const guidelines = getGuidelinesForAge(babyAge);

  const getComparisonText = (type: 'feeding' | 'sleep' | 'nappy', value: number) => {
    if (!guidelines) return '';
    
    switch (type) {
      case 'feeding':
        if (value >= 8 && value <= 12) return '✅ Normal';
        if (value < 8) return '⚠️ Low';
        return '📈 High';
      case 'sleep':
        if (value >= 12 && value <= 17) return '✅ Normal';
        if (value < 12) return '⚠️ Low';
        return '📈 High';
      case 'nappy':
        if (value >= 6 && value <= 10) return '✅ Normal';
        if (value < 6) return '⚠️ Low';
        return '📈 High';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading summary...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Weekly Summary</Text>
        <Text style={styles.subtitle}>Your baby's routine overview</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          <TouchableOpacity
            style={[
              styles.periodButton,
              selectedPeriod === 'week' && styles.periodButtonActive
            ]}
            onPress={() => setSelectedPeriod('week')}>
            <Text style={[
              styles.periodButtonText,
              selectedPeriod === 'week' && styles.periodButtonTextActive
            ]}>Week</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.periodButton,
              selectedPeriod === 'month' && styles.periodButtonActive
            ]}
            onPress={() => setSelectedPeriod('month')}>
            <Text style={[
              styles.periodButtonText,
              selectedPeriod === 'month' && styles.periodButtonTextActive
            ]}>Month</Text>
          </TouchableOpacity>
        </View>

        {/* Feeding Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Daily Feeding Frequency</Text>
          <LineChart
            data={feedingData}
            width={screenWidth - 60}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        </View>

        {/* Sleep Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Daily Sleep Duration (Hours)</Text>
          <BarChart
            data={sleepData}
            width={screenWidth - 60}
            height={220}
            chartConfig={{
              ...chartConfig,
              color: (opacity = 1) => `rgba(126, 211, 33, ${opacity})`,
            }}
            style={styles.chart}
          />
        </View>

        {/* Weight Chart */}
        {weightData && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Weight Progress (kg)</Text>
            <LineChart
              data={weightData}
              width={screenWidth - 60}
              height={220}
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
              }}
              bezier
              style={styles.chart}
            />
            {weightRecords.length >= 2 && (
              <View style={styles.weightInsight}>
                <View style={styles.weightInsightItem}>
                  <Text style={styles.weightInsightLabel}>Latest Weight</Text>
                  <Text style={styles.weightInsightValue}>
                    {weightRecords[0].weight}{weightRecords[0].unit}
                  </Text>
                </View>
                <View style={styles.weightInsightItem}>
                  <Text style={styles.weightInsightLabel}>Weight Change</Text>
                  <Text style={[
                    styles.weightInsightValue,
                    { color: weightRecords[0].weight > weightRecords[1].weight ? '#10B981' : '#EF4444' }
                  ]}>
                    {weightRecords[0].weight > weightRecords[1].weight ? '+' : ''}
                    {(weightRecords[0].weight - weightRecords[1].weight).toFixed(2)}{weightRecords[0].unit}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Weekly Stats */}
        <View style={styles.statsCard}>
          <Text style={styles.cardTitle}>This Week's Averages</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: '#4A90E2' }]}>
                <Ionicons name="nutrition" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.statNumber}>
                {(weeklySummaries.reduce((sum, s) => sum + s.totalFeeds, 0) / 7).toFixed(1)}
              </Text>
              <Text style={styles.statLabel}>Feeds/day</Text>
              <Text style={styles.statComparison}>
                {getComparisonText('feeding', (weeklySummaries.reduce((sum, s) => sum + s.totalFeeds, 0) / 7))}
              </Text>
            </View>
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: '#7ED321' }]}>
                <Ionicons name="moon" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.statNumber}>
                {Math.round(weeklySummaries.reduce((sum, s) => sum + s.totalSleepDuration, 0) / 7 / 60 * 10) / 10}h
              </Text>
              <Text style={styles.statLabel}>Sleep/day</Text>
              <Text style={styles.statComparison}>
                {getComparisonText('sleep', (weeklySummaries.reduce((sum, s) => sum + s.totalSleepDuration, 0) / 7 / 60))}
              </Text>
            </View>
            <View style={styles.statItem}>
              <View style={[styles.statIcon, { backgroundColor: '#FF6B6B' }]}>
                <Ionicons name="medical" size={20} color="#FFFFFF" />
              </View>
              <Text style={styles.statNumber}>
                {(weeklySummaries.reduce((sum, s) => sum + s.totalNappyChanges, 0) / 7).toFixed(1)}
              </Text>
              <Text style={styles.statLabel}>Nappies/day</Text>
              <Text style={styles.statComparison}>
                {getComparisonText('nappy', (weeklySummaries.reduce((sum, s) => sum + s.totalNappyChanges, 0) / 7))}
              </Text>
            </View>
            {weightRecords.length > 0 && (
              <View style={styles.statItem}>
                <View style={[styles.statIcon, { backgroundColor: '#8B5CF6' }]}>
                  <Ionicons name="scale" size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.statNumber}>
                  {weightRecords[0].weight}{weightRecords[0].unit}
                </Text>
                <Text style={styles.statLabel}>Current</Text>
                <Text style={styles.statComparison}>
                  {weightRecords.length >= 2 
                    ? (weightRecords[0].weight > weightRecords[1].weight ? '📈 Growing' : '📉 Check')
                    : '📊 Tracked'
                  }
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* NHS Guidelines Comparison */}
        {guidelines && (
          <View style={styles.guidelinesCard}>
            <Text style={styles.cardTitle}>NHS Guidelines ({babyAge} weeks old)</Text>
            <View style={styles.guidelineItem}>
              <Ionicons name="nutrition" size={20} color="#4A90E2" />
              <View style={styles.guidelineContent}>
                <Text style={styles.guidelineTitle}>Feeding</Text>
                <Text style={styles.guidelineText}>{guidelines.feedingFrequency}</Text>
              </View>
            </View>
            <View style={styles.guidelineItem}>
              <Ionicons name="moon" size={20} color="#7ED321" />
              <View style={styles.guidelineContent}>
                <Text style={styles.guidelineTitle}>Sleep</Text>
                <Text style={styles.guidelineText}>{guidelines.sleepHours}</Text>
              </View>
            </View>
            <View style={styles.guidelineItem}>
              <Ionicons name="medical" size={20} color="#FF6B6B" />
              <View style={styles.guidelineContent}>
                <Text style={styles.guidelineTitle}>Nappies</Text>
                <Text style={styles.guidelineText}>{guidelines.nappyChanges}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Sleep Prediction Card */}
        {sleepMetrics && (
          <View style={styles.predictionCard}>
            <Text style={styles.cardTitle}>Sleep Insights</Text>
            
            {/* Health Warnings */}
            {sleepMetrics.healthWarnings.length > 0 && (
              <View style={styles.warningsContainer}>
                {sleepMetrics.healthWarnings.map((warning, index) => (
                  <View 
                    key={index} 
                    style={[
                      styles.warningCard,
                      { borderLeftColor: SleepPredictionService.getWarningColor(warning.severity) }
                    ]}>
                    <View style={styles.warningHeader}>
                      <Ionicons 
                        name={SleepPredictionService.getWarningIcon(warning.severity)} 
                        size={20} 
                        color={SleepPredictionService.getWarningColor(warning.severity)} 
                      />
                      <Text style={[
                        styles.warningMessage,
                        { color: SleepPredictionService.getWarningColor(warning.severity) }
                      ]}>
                        {warning.message}
                      </Text>
                    </View>
                    <Text style={styles.warningRecommendation}>
                      {warning.recommendation}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            
            <View style={styles.predictionRow}>
              <View style={styles.predictionItem}>
                <View style={[styles.predictionIcon, { backgroundColor: '#7ED321' }]}>
                  <Ionicons name="moon" size={20} color="#FFFFFF" />
                </View>
                <View style={styles.predictionContent}>
                  <Text style={styles.predictionLabel}>Last 24h Sleep</Text>
                  <Text style={styles.predictionValue}>
                    {SleepPredictionService.formatDuration(sleepMetrics.totalSleepLast24Hours)}
                  </Text>
                </View>
              </View>
              
              <View style={styles.predictionItem}>
                <View style={[styles.predictionIcon, { backgroundColor: '#4A90E2' }]}>
                  <Ionicons name="time" size={20} color="#FFFFFF" />
                </View>
                <View style={styles.predictionContent}>
                  <Text style={styles.predictionLabel}>Next Nap In</Text>
                  <Text style={styles.predictionValue}>
                    {SleepPredictionService.formatTimeUntilNextNap(sleepMetrics.nextNapPrediction)}
                  </Text>
                </View>
              </View>
            </View>
            
            <View style={styles.predictionDetails}>
              <View style={styles.predictionDetailItem}>
                <Text style={styles.predictionDetailLabel}>Sleep Sessions Today</Text>
                <Text style={styles.predictionDetailValue}>{sleepMetrics.sleepSessionsLast24Hours}</Text>
              </View>
              <View style={styles.predictionDetailItem}>
                <Text style={styles.predictionDetailLabel}>Average Interval</Text>
                <Text style={styles.predictionDetailValue}>
                  {SleepPredictionService.formatDuration(sleepMetrics.averageSleepInterval)}
                </Text>
              </View>
              <View style={styles.predictionDetailItem}>
                <Text style={styles.predictionDetailLabel}>Longest Sleep</Text>
                <Text style={styles.predictionDetailValue}>
                  {SleepPredictionService.formatDuration(sleepMetrics.longestSleepStreak)}
                </Text>
              </View>
            </View>
            
            <View style={styles.confidenceIndicator}>
              <View 
                style={[
                  styles.confidenceDot, 
                  { backgroundColor: SleepPredictionService.getConfidenceColor(sleepMetrics.confidenceLevel) }
                ]} 
              />
              <Text style={styles.confidenceText}>
                Prediction confidence: {sleepMetrics.confidenceLevel}
                {sleepMetrics.confidenceLevel === 'low' && ' (need more data)'}
              </Text>
            </View>
          </View>
        )}
        {/* Tips */}
        {guidelines && (
          <View style={styles.tipsCard}>
            <Text style={styles.cardTitle}>💡 Tips for This Age</Text>
            {guidelines.tips.map((tip, index) => (
              <View key={index} style={styles.tipItem}>
                <Text style={styles.tipBullet}>•</Text>
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 4,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  periodButtonActive: {
    backgroundColor: '#4A90E2',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
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
  statsCard: {
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
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  statComparison: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '500',
  },
  guidelinesCard: {
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
  guidelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  guidelineContent: {
    marginLeft: 12,
    flex: 1,
  },
  guidelineTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  guidelineText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
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
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  tipBullet: {
    fontSize: 16,
    color: '#4A90E2',
    marginRight: 8,
    marginTop: 2,
  },
  tipText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    flex: 1,
  },
  predictionCard: {
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
  predictionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  predictionItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  predictionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  predictionContent: {
    flex: 1,
  },
  predictionLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  predictionValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  predictionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginBottom: 16,
  },
  predictionDetailItem: {
    alignItems: 'center',
  },
  predictionDetailLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
    textAlign: 'center',
  },
  predictionDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  confidenceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confidenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  confidenceText: {
    fontSize: 12,
    color: '#6B7280',
  },
  weightInsight: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  weightInsightItem: {
    alignItems: 'center',
  },
  weightInsightLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  weightInsightValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  warningsContainer: {
    marginBottom: 20,
  },
  warningCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  warningMessage: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  warningRecommendation: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
});