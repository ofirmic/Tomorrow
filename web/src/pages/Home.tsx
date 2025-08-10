import { useEffect, useState } from 'react';
import { MetricTile } from '../components/MetricTile';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { api, type WeatherData } from '../lib/api';
import { formatters } from '../utils/formatters';
import { LOCATION_PRESETS, REFRESH_INTERVALS } from '../utils/constants';

export function Home() {
  const [coordinates, setCoordinates] = useState({ lat: '42.3601', lon: '-71.0589' });
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchWeather = async () => {
    const lat = parseFloat(coordinates.lat);
    const lon = parseFloat(coordinates.lon);
    
    if (isNaN(lat) || isNaN(lon)) {
      setError('Please enter valid coordinates');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const data = await api.getWeather(lat, lon);
      setWeatherData(data);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
    const interval = setInterval(fetchWeather, REFRESH_INTERVALS.WEATHER_DATA);
    return () => clearInterval(interval);
  }, [coordinates]);

  const applyPreset = (preset: (typeof LOCATION_PRESETS)[number]) => {
    setCoordinates({ lat: preset.lat.toString(), lon: preset.lon.toString() });
  };

  const weatherCondition = weatherData 
    ? formatters.weatherCondition(
        weatherData.temperatureC, 
        weatherData.windSpeedMps, 
        weatherData.precipitationMmHr
      )
    : null;

  return (
    <div className="page">
      <div className="page-header">
        <h1>🌤️ Current Weather</h1>
        <p>Real-time weather data with automatic updates</p>
      </div>

      {/* Quick Location Presets */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1em' }}>📍 Quick Locations</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {LOCATION_PRESETS.map((preset) => (
            <button
              key={preset.name}
              className="btn"
              onClick={() => applyPreset(preset)}
              style={{
                fontSize: '0.9em',
                padding: '8px 12px',
                background: 
                  coordinates.lat === preset.lat.toString() && coordinates.lon === preset.lon.toString()
                    ? '#3b82f6' : '#374151'
              }}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Coordinates */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1em' }}>🗺️ Custom Location</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: '0.9em', color: '#9ca3af' }}>
              Latitude
            </label>
            <input 
              className="input" 
              type="number"
              step="any"
              value={coordinates.lat} 
              onChange={(e) => setCoordinates(prev => ({ ...prev, lat: e.target.value }))}
              placeholder="42.3601"
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 4, fontSize: '0.9em', color: '#9ca3af' }}>
              Longitude
            </label>
            <input 
              className="input" 
              type="number"
              step="any"
              value={coordinates.lon} 
              onChange={(e) => setCoordinates(prev => ({ ...prev, lon: e.target.value }))}
              placeholder="-71.0589"
            />
          </div>
          <button 
            className="btn" 
            onClick={fetchWeather} 
            disabled={loading}
            style={{ background: loading ? '#6b7280' : '#3b82f6' }}
          >
            {loading ? '⏳' : '🔄'} Refresh
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="card" style={{ 
          background: '#3a1d06', 
          borderColor: '#92400e', 
          color: '#f59e0b',
          marginBottom: 20 
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Loading State */}
      {loading && !weatherData && (
        <div className="card">
          <LoadingSpinner text="Fetching weather data..." />
        </div>
      )}

      {/* Weather Display */}
      {weatherData && (
        <>
          {/* Current Condition Summary */}
          <div className="card" style={{ 
            background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
            color: 'white',
            textAlign: 'center',
            marginBottom: 24 
          }}>
            <div style={{ fontSize: '3em', marginBottom: 8 }}>
              {weatherCondition}
            </div>
            <div style={{ fontSize: '1.2em', opacity: 0.9 }}>
              {formatters.coordinates(parseFloat(coordinates.lat), parseFloat(coordinates.lon))}
            </div>
            {lastUpdated && (
              <div style={{ fontSize: '0.9em', opacity: 0.7, marginTop: 8 }}>
                Last updated: {formatters.relativeTime(lastUpdated)}
              </div>
            )}
          </div>

          {/* Weather Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20 }}>
            <MetricTile
              label="🌡️ Temperature"
              value={formatters.temperature(weatherData.temperatureC)}
              color={weatherData.temperatureC && weatherData.temperatureC > 25 ? '#ef4444' : '#10b981'}
            />
            <MetricTile
              label="💨 Wind Speed"
              value={formatters.windSpeed(weatherData.windSpeedMps)}
              color={weatherData.windSpeedMps && weatherData.windSpeedMps > 5 ? '#f59e0b' : '#10b981'}
            />
            <MetricTile
              label="🌧️ Precipitation"
              value={formatters.precipitation(weatherData.precipitationMmHr || 0)}
              color={(weatherData.precipitationMmHr || 0) > 1 ? '#3b82f6' : '#10b981'}
            />
          </div>

          {/* Additional Info */}
          <div className="card" style={{ marginTop: 24, fontSize: '0.9em', color: '#9ca3af' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>💡 Weather data updates automatically every 30 seconds</span>
              <span>📡 Data source: Tomorrow.io API</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}