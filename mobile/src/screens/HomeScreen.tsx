import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  RefreshControl, 
  Alert,
  ActivityIndicator 
} from 'react-native';
import { WeatherDisplay } from '../components/WeatherDisplay';
import { AlertsStatus } from '../components/AlertsStatus';
import { api } from '../services/api';
import { WeatherData, AlertWithState } from '../types';

const DEFAULT_LOCATION = {
  latitude: 42.3601,
  longitude: -71.0589,
  name: 'Boston, MA'
};

export function HomeScreen() {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [alertsData, setAlertsData] = useState<AlertWithState[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Fetch both weather and alerts data in parallel
      const [weather, alerts] = await Promise.all([
        api.getWeather(DEFAULT_LOCATION.latitude, DEFAULT_LOCATION.longitude),
        api.getAlertStates()
      ]);

      setWeatherData(weather);
      setAlertsData(alerts);
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'Failed to fetch data. Please check your connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading weather data...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} />
      }
    >
      <Text style={styles.title}>Weather Alerts</Text>
      
      {weatherData && (
        <WeatherDisplay 
          data={weatherData} 
          location={DEFAULT_LOCATION.name}
        />
      )}
      
      <AlertsStatus alerts={alertsData} />
      
      <Text style={styles.pullToRefresh}>
        Pull down to refresh
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 16,
    fontSize: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f1f5f9',
    textAlign: 'center',
    marginTop: 60,
    marginBottom: 20,
  },
  pullToRefresh: {
    color: '#64748b',
    textAlign: 'center',
    fontSize: 14,
    marginVertical: 20,
    fontStyle: 'italic',
  },
});
