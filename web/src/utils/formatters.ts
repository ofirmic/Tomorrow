// Utility functions for data formatting and display

export const formatters = {
  temperature: (temp: number | null): string => 
    temp !== null ? `${temp.toFixed(1)}°C` : 'N/A',
  
  windSpeed: (speed: number | null): string => 
    speed !== null ? `${speed.toFixed(1)} m/s` : 'N/A',
  
  precipitation: (precip: number): string => 
    `${precip.toFixed(1)} mm/hr`,
  
  dateTime: (date: string | Date): string => {
    const d = new Date(date);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },
  
  relativeTime: (date: string | Date): string => {
    const now = new Date();
    const target = new Date(date);
    const diffMs = now.getTime() - target.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  },
  
  alertParameter: (param: string): string => {
    const map: Record<string, string> = {
      'TEMPERATURE': 'Temperature',
      'WIND_SPEED': 'Wind Speed', 
      'PRECIPITATION': 'Precipitation'
    };
    return map[param] || param;
  },
  
  alertOperator: (op: string): string => {
    const map: Record<string, string> = {
      'GT': 'greater than',
      'GTE': 'greater than or equal to',
      'LT': 'less than',
      'LTE': 'less than or equal to',
      'EQ': 'equal to',
      'NE': 'not equal to'
    };
    return map[op] || op;
  },
  
  coordinates: (lat: number, lon: number): string => 
    `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
  
  // Return text only; icons are chosen by UI to keep visuals stable
  weatherConditionText: (temp: number | null, wind: number | null, precip: number): string => {
    if (precip > 5) return 'Heavy rain';
    if (precip > 1) return 'Light rain';
    if (wind && wind > 10) return 'Windy';
    if (temp && temp > 30) return 'Hot';
    if (temp && temp < 0) return 'Freezing';
    return 'Clear';
  },
  
  alertStatus: (state: boolean | null): { icon: string; text: string; color: string } => {
    if (state === true) return { icon: '🚨', text: 'Triggered', color: '#dc2626' };
    if (state === false) return { icon: '✅', text: 'Clear', color: '#10b981' };
    return { icon: '⏳', text: 'Pending', color: '#6b7280' };
  }
};
