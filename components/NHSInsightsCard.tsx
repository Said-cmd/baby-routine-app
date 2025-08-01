import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NHSInsightsService } from '@/services/NHSInsightsService';
import { DataService } from '@/services/DataService';
import { NHSInsight } from '@/types/Activity';

interface NHSInsightsCardProps {
  onWeightTrackingPress: () => void;
}

export default function NHSInsightsCard({ onWeightTrackingPress }: NHSInsightsCardProps) {
  const [insights, setInsights] = useState<NHSInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [babyAge, setBabyAge] = useState<string>('');

  useEffect(() => {
    loadInsights();
  }, []);


  const loadInsights = async () => {
    try {
      // Get baby info for age calculation
      const babyInfo = await DataService.getBabyInfo();
      let birthDate: string | undefined;
      let babyName: string | undefined;
      
      if (babyInfo?.birthDate) {
        birthDate = babyInfo.birthDate;
        babyName = babyInfo.name;
        const babyGender = babyInfo.gender;
        const birth = new Date(birthDate);
        const now = new Date();
        const ageInWeeks = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 7));
        setBabyAge(`${ageInWeeks} weeks`);
      } else {
        setBabyAge('Age not set');
      }

      // Generate insights
      const generatedInsights = await NHSInsightsService.generateInsights(birthDate, babyName, babyInfo?.gender);
      setInsights(generatedInsights);
    } catch (error) {
      console.error('Error loading NHS insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: 'info' | 'warning' | 'alert') => {
    switch (severity) {
      case 'alert':
        return '#EF4444';
      case 'warning':
        return '#F59E0B';
      case 'info':
      default:
        return '#3B82F6';
    }
  };

  const getSeverityIcon = (severity: 'info' | 'warning' | 'alert') => {
    switch (severity) {
      case 'alert':
        return 'alert-circle';
      case 'warning':
        return 'warning';
      case 'info':
      default:
        return 'information-circle';
    }
  };

  const getSeverityBackgroundColor = (severity: 'info' | 'warning' | 'alert') => {
    switch (severity) {
      case 'alert':
        return '#FEF2F2';
      case 'warning':
        return '#FFFBEB';
      case 'info':
      default:
        return '#EBF8FF';
    }
  };

  const handleInsightPress = (insight: NHSInsight) => {
    if (insight.type === 'weight') {
      onWeightTrackingPress();
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading insights...</Text>
      </View>
    );
  }

  if (insights.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="checkmark-circle" size={48} color="#10B981" />
        <Text style={styles.emptyTitle}>All Good!</Text>
        <Text style={styles.emptyText}>
          No concerns found. Keep up the great work tracking your baby's routine!
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>NHS Development Insights</Text>
        {babyAge && (
          <View style={styles.ageIndicator}>
            <Ionicons name="calendar" size={16} color="#6B7280" />
            <Text style={styles.ageText}>{babyAge}</Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.insightsContainer} showsVerticalScrollIndicator={false}>
        {insights.map((insight, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.insightCard,
              { 
                backgroundColor: getSeverityBackgroundColor(insight.severity),
                borderLeftColor: getSeverityColor(insight.severity)
              }
            ]}
            onPress={() => handleInsightPress(insight)}>
            <View style={styles.insightHeader}>
              <View style={styles.insightIconContainer}>
                <Ionicons 
                  name={insight.icon} 
                  size={20} 
                  color={getSeverityColor(insight.severity)} 
                />
              </View>
              <View style={styles.insightHeaderText}>
                <Text style={[
                  styles.insightTitle,
                  { color: getSeverityColor(insight.severity) }
                ]}>
                  {insight.title}
                </Text>
                <View style={styles.severityIndicator}>
                  <Ionicons 
                    name={getSeverityIcon(insight.severity)} 
                    size={14} 
                    color={getSeverityColor(insight.severity)} 
                  />
                </View>
              </View>
            </View>
            
            <Text style={[
              styles.insightMessage,
              { color: getSeverityColor(insight.severity) }
            ]}>
              {insight.message}
            </Text>
            
            <Text style={styles.insightRecommendation}>
              {insight.recommendation}
            </Text>

            {insight.type === 'weight' && (
              <View style={styles.actionHint}>
                <Ionicons name="touch-app" size={14} color="#6B7280" />
                <Text style={styles.actionHintText}>Tap to add weight measurement</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  loadingContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#10B981',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  ageIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ageText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
    fontWeight: '500',
  },
  insightsContainer: {
    maxHeight: 300,
  },
  insightCard: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  insightHeaderText: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  severityIndicator: {
    marginLeft: 8,
  },
  insightMessage: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    lineHeight: 20,
  },
  insightRecommendation: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  actionHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  actionHintText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
    fontStyle: 'italic',
  },
});