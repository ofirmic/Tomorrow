import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WeatherData } from '../types';

interface WeatherDisplayProps {
  data: WeatherData;
  location: string;
}

export function WeatherDisplay({ data, location }: WeatherDisplayProps) {
  const formatTemperature = (temp: number | null) => 
    temp !== null ? `${temp.toFixed(1)}°C` : 'N/A';
  
  const formatWindSpeed = (speed: number | null) => 
    speed !== null ? `${speed.toFixed(1)} m/s` : 'N/A';
  
  const formatPrecipitation = (precip: number) => 
    `${precip.toFixed(1)} mm/hr`;

  return (
    <View style={styles.container}>
      <Text style={styles.location}>{location}</Text>
      
      <View style={styles.mainMetric}>
        <Text style={styles.temperature}>
          {formatTemperature(data.temperatureC)}
        </Text>
        <Text style={styles.temperatureLabel}>Temperature</Text>
      </View>
      
      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>
            {formatWindSpeed(data.windSpeedMps)}
          </Text>
          <Text style={styles.metricLabel}>Wind Speed</Text>
        </View>
        
        <View style={styles.metric}>
          <Text style={styles.metricValue}>
            {formatPrecipitation(data.precipitationMmHr)}
          </Text>
          <Text style={styles.metricLabel}>Precipitation</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    margin: 16,
    alignItems: 'center',
  },
  location: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 20,
  },
  mainMetric: {
    alignItems: 'center',
    marginBottom: 24,
  },
  temperature: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  temperatureLabel: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 4,
  },
  metrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  metric: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#10b981',
  },
  metricLabel: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
});
