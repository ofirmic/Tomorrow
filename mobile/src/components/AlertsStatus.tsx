import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { AlertWithState } from '../types';

interface AlertsStatusProps {
  alerts: AlertWithState[];
}

export function AlertsStatus({ alerts }: AlertsStatusProps) {
  const triggeredAlerts = alerts.filter(alert => alert.lastState === true);
  
  if (alerts.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.noAlertsText}>No alerts configured</Text>
      </View>
    );
  }
  
  if (triggeredAlerts.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.allClearContainer}>
          <Text style={styles.allClearIcon}>✅</Text>
          <Text style={styles.allClearText}>All Clear</Text>
          <Text style={styles.allClearSubtext}>
            No weather alerts are currently triggered
          </Text>
        </View>
      </View>
    );
  }

  const renderAlert = ({ item }: { item: AlertWithState }) => (
    <View style={styles.alertItem}>
      <View style={styles.alertHeader}>
        <Text style={styles.alertIcon}>⚠️</Text>
        <Text style={styles.alertName}>
          {item.name || `Alert ${item.id.slice(0, 8)}`}
        </Text>
      </View>
      
      {item.lastValue !== undefined && (
        <Text style={styles.alertValue}>
          Current value: {item.lastValue.toFixed(1)}
        </Text>
      )}
      
      {item.lastEvaluatedAt && (
        <Text style={styles.alertTime}>
          Last checked: {new Date(item.lastEvaluatedAt).toLocaleTimeString()}
        </Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>⚠️ Active Alerts</Text>
      <FlatList
        data={triggeredAlerts}
        renderItem={renderAlert}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    margin: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f59e0b',
    marginBottom: 16,
    textAlign: 'center',
  },
  noAlertsText: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  allClearContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  allClearIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  allClearText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 8,
  },
  allClearSubtext: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
  },
  alertItem: {
    backgroundColor: '#dc2626',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  alertName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
  },
  alertValue: {
    fontSize: 14,
    color: '#fecaca',
    marginBottom: 4,
  },
  alertTime: {
    fontSize: 12,
    color: '#fca5a5',
  },
});
