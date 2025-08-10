import { useEffect, useState } from 'react';
import { apiUrl } from '../lib/api';

type Alert = {
  id: string;
  name?: string;
  description?: string;
  cityName?: string;
  latitude?: number;
  longitude?: number;
  parameter: 'TEMPERATURE' | 'WIND_SPEED' | 'PRECIPITATION';
  operator: 'GT' | 'GTE' | 'LT' | 'LTE' | 'EQ' | 'NE';
  threshold: number;
  createdAt: string;
  lastState: boolean | null;
  lastValue: number | null;
  lastEvaluatedAt: string | null;
};

type LocationPreset = { name: string; lat: string; lon: string };

const locationPresets: LocationPreset[] = [
  { name: 'Boston', lat: '42.3601', lon: '-71.0589' },
  { name: 'New York', lat: '40.7128', lon: '-74.0060' },
  { name: 'San Francisco', lat: '37.7749', lon: '-122.4194' },
  { name: 'London', lat: '51.5074', lon: '0.1278' },
  { name: 'Tokyo', lat: '35.6895', lon: '139.6917' },
];

const alertTemplates = [
  { name: 'Heat Wave Alert', parameter: 'TEMPERATURE', operator: 'GTE', threshold: '30', description: 'Temperature above 30°C' },
  { name: 'Freeze Warning', parameter: 'TEMPERATURE', operator: 'LTE', threshold: '0', description: 'Temperature at or below 0°C' },
  { name: 'High Wind Alert', parameter: 'WIND_SPEED', operator: 'GTE', threshold: '15', description: 'Wind speed above 15 m/s' },
  { name: 'Heavy Rain Alert', parameter: 'PRECIPITATION', operator: 'GTE', threshold: '5', description: 'Precipitation above 5 mm/hr' },
];

export function Alerts() {
  const [form, setForm] = useState({
    name: '', description: '', latitude: '42.3601', longitude: '-71.0589', parameter: 'TEMPERATURE', operator: 'GT', threshold: '30',
  });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/alerts?page=${page}&pageSize=${pageSize}`));
      const json = await res.json();
      setAlerts(json.items ?? []);
      setTotal(json.total ?? 0);
    } catch (e) {
      console.error('Failed to fetch alerts:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAlerts(); }, [page]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const applyTemplate = (template: typeof alertTemplates[0]) => {
    setForm(prev => ({ ...prev, name: template.name, description: template.description, parameter: template.parameter, operator: template.operator, threshold: template.threshold }));
  };

  const applyLocationPreset = (preset: LocationPreset) => {
    setForm(prev => ({ ...prev, latitude: preset.lat, longitude: preset.lon }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setFormError(null);
    try {
      const res = await fetch(apiUrl('/api/alerts'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name || undefined, description: form.description || undefined,
          latitude: Number(form.latitude), longitude: Number(form.longitude),
          parameter: form.parameter, operator: form.operator, threshold: Number(form.threshold),
        }),
      });
      if (!res.ok) { const err = await res.json(); setFormError(err.error?.message || JSON.stringify(err)); }
      else { setForm({ name: '', description: '', latitude: '42.3601', longitude: '-71.0589', parameter: 'TEMPERATURE', operator: 'GT', threshold: '30', }); await fetchAlerts(); }
    } catch (e: any) { setFormError(e.message || 'An unexpected error occurred.'); }
    finally { setLoading(false); }
  };

  const deleteAlert = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this alert?')) return;
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/alerts/${id}`), { method: 'DELETE' });
      if (!res.ok) { const err = await res.json(); alert('Error deleting alert: ' + (err.error || JSON.stringify(err))); }
      else { await fetchAlerts(); }
    } catch (e: any) { alert('Network error deleting alert: ' + e.message); }
    finally { setLoading(false); }
  };

  const clearAllAlerts = async () => {
    if (!window.confirm(`Are you sure you want to delete ALL ${total} alerts? This action cannot be undone.`)) return;
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/alerts'), { method: 'DELETE' });
      if (!res.ok) { 
        const err = await res.json(); 
        alert('Error clearing alerts: ' + (err.error || JSON.stringify(err))); 
      } else { 
        const result = await res.json();
        alert(`Successfully deleted ${result.count} alerts`);
        await fetchAlerts(); 
      }
    } catch (e: any) { 
      alert('Network error clearing alerts: ' + e.message); 
    } finally { 
      setLoading(false); 
    }
  };

  const getParameterIcon = (param: string) => {
    switch (param) {
      case 'TEMPERATURE': return '🌡️';
      case 'WIND_SPEED': return '💨';
      case 'PRECIPITATION': return '🌧️';
      default: return '📊';
    }
  };

  const getOperatorSymbol = (op: string) => {
    switch (op) {
      case 'GT': return '>';
      case 'GTE': return '≥';
      case 'LT': return '<';
      case 'LTE': return '≤';
      case 'EQ': return '=';
      case 'NE': return '≠';
      default: return op;
    }
  };

  const getParameterUnit = (param: string) => {
    switch (param) {
      case 'TEMPERATURE': return '°C';
      case 'WIND_SPEED': return ' m/s';
      case 'PRECIPITATION': return ' mm/hr';
      default: return '';
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>⚠️ Weather Alerts</h2>
      
      {/* Create New Alert */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 20px 0', fontSize: '1.2em' }}>➕ Create New Alert</h3>
        
        {/* Alert Templates */}
        <div style={{ marginBottom: 20 }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '0.95em', color: '#9ca3af' }}>Quick Templates:</h4>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {alertTemplates.map((template, idx) => (
              <button
                key={idx}
                onClick={() => applyTemplate(template)}
                style={{
                  background: '#374151',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  padding: '6px 12px',
                  cursor: 'pointer',
                  fontSize: '0.85em',
                  transition: 'background 0.2s',
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#4b5563'}
                onMouseOut={(e) => e.currentTarget.style.background = '#374151'}
              >
                {getParameterIcon(template.parameter)} {template.name}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Locations */}
        <div style={{ marginBottom: 20 }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '0.95em', color: '#9ca3af' }}>Quick Locations:</h4>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {locationPresets.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => applyLocationPreset(preset)}
                style={{
                  background: '#1e40af',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  padding: '6px 12px',
                  cursor: 'pointer',
                  fontSize: '0.85em',
                  transition: 'background 0.2s',
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#1d4ed8'}
                onMouseOut={(e) => e.currentTarget.style.background = '#1e40af'}
              >
                📍 {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={submit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.9em', color: '#9ca3af' }}>
                Alert Name
              </label>
              <input 
                className="input" 
                placeholder="e.g., Boston Heat Alert" 
                name="name"
                value={form.name} 
                onChange={handleFormChange} 
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.9em', color: '#9ca3af' }}>
                Description (Optional)
              </label>
              <input 
                className="input" 
                placeholder="e.g., Alert for extreme temperatures" 
                name="description"
                value={form.description} 
                onChange={handleFormChange} 
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.9em', color: '#9ca3af' }}>
                Latitude
              </label>
              <input 
                className="input" 
                placeholder="42.3601" 
                name="latitude"
                value={form.latitude} 
                onChange={handleFormChange} 
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.9em', color: '#9ca3af' }}>
                Longitude
              </label>
              <input 
                className="input" 
                placeholder="-71.0589" 
                name="longitude"
                value={form.longitude} 
                onChange={handleFormChange} 
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto', gap: 16, marginBottom: 20, alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.9em', color: '#9ca3af' }}>
                Parameter
              </label>
              <select 
                className="input" 
                name="parameter"
                value={form.parameter} 
                onChange={handleFormChange}
              >
                <option value="TEMPERATURE">🌡️ Temperature</option>
                <option value="WIND_SPEED">💨 Wind Speed</option>
                <option value="PRECIPITATION">🌧️ Precipitation</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.9em', color: '#9ca3af' }}>
                Operator
              </label>
              <select 
                className="input" 
                name="operator"
                value={form.operator} 
                onChange={handleFormChange}
              >
                <option value="GT">Greater than (&gt;)</option>
                <option value="GTE">Greater or equal (≥)</option>
                <option value="LT">Less than (&lt;)</option>
                <option value="LTE">Less or equal (≤)</option>
                <option value="EQ">Equal (=)</option>
                <option value="NE">Not equal (≠)</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '0.9em', color: '#9ca3af' }}>
                Threshold
              </label>
              <input 
                className="input" 
                type="number" 
                step="0.1"
                placeholder="30" 
                name="threshold"
                value={form.threshold} 
                onChange={handleFormChange} 
                required
              />
            </div>
            <button 
              className="btn" 
              type="submit" 
              disabled={loading}
              style={{ 
                background: loading ? '#6b7280' : '#059669',
                minWidth: 120,
                height: 42
              }}
            >
              {loading ? '⏳ Creating...' : '✅ Create Alert'}
            </button>
          </div>
        </form>

        {formError && (
          <div style={{ 
            background: '#3a1d06', 
            color: '#f59e0b', 
            padding: 12, 
            borderRadius: 6,
            border: '1px solid #92400e'
          }}>
            ⚠️ {formError}
          </div>
        )}
      </div>

      {/* Alerts List */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: '1.2em' }}>📋 Saved Alerts ({total} total)</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button 
              className="btn" 
              onClick={fetchAlerts}
              style={{ background: '#374151', fontSize: '0.9em' }}
            >
              🔄 Refresh
            </button>
            {total > 0 && (
              <button 
                className="btn" 
                onClick={clearAllAlerts}
                style={{ background: '#dc2626', fontSize: '0.9em' }}
              >
                🗑️ Clear All
              </button>
            )}
          </div>
        </div>

        {alerts.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            color: '#9ca3af', 
            padding: 40,
            border: '2px dashed #374151',
            borderRadius: 8
          }}>
            📭 No alerts created yet. Use the form above to create your first alert!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {alerts.map((alert) => (
              <div 
                key={alert.id} 
                className="card" 
                style={{ 
                  borderLeft: `4px solid ${
                    alert.lastState === true ? '#f59e0b' : 
                    alert.lastState === false ? '#10b981' : '#6b7280'
                  }`,
                  margin: 0,
                  background: '#1f2937'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ 
                      margin: '0 0 8px 0', 
                      color: alert.lastState === true ? '#f59e0b' : '#10b981' 
                    }}>
                      {alert.name || `${alert.cityName || alert.parameter.toLowerCase() + ' alert'} (${alert.id.slice(-8)})`}
                      {alert.lastState === true && <span style={{ marginLeft: 8 }}>🔴 TRIGGERED</span>}
                      {alert.lastState === false && <span style={{ marginLeft: 8 }}>🟢 OK</span>}
                    </h4>
                    
                    {alert.description && (
                      <p style={{ margin: '0 0 8px 0', color: '#9ca3af', fontSize: '0.9em' }}>
                        {alert.description}
                      </p>
                    )}
                    
                    <div style={{ fontSize: '0.9em', color: '#d1d5db', marginBottom: 8 }}>
                      <strong>Condition:</strong> {getParameterIcon(alert.parameter)} {alert.parameter.toLowerCase().replace('_', ' ')} {getOperatorSymbol(alert.operator)} {alert.threshold}{getParameterUnit(alert.parameter)}
                    </div>
                    
                    <div style={{ fontSize: '0.85em', color: '#9ca3af' }}>
                      <div>📍 Location: {alert.latitude?.toFixed(4)}, {alert.longitude?.toFixed(4)}</div>
                      <div>📅 Created: {new Date(alert.createdAt).toLocaleDateString()}</div>
                      {alert.lastValue !== null && alert.lastValue !== undefined && (
                        <div>📊 Last value: {alert.lastValue}{getParameterUnit(alert.parameter)}</div>
                      )}
                      {alert.lastEvaluatedAt && (
                        <div>🕒 Last checked: {new Date(alert.lastEvaluatedAt).toLocaleString()}</div>
                      )}
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => deleteAlert(alert.id)}
                    style={{ 
                      background: '#dc2626', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: 4, 
                      padding: '6px 12px',
                      cursor: 'pointer',
                      fontSize: '0.85em'
                    }}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
            <button 
              className="btn" 
              disabled={page <= 1} 
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <span style={{ alignSelf: 'center', padding: '0 16px' }}>
              Page {page} of {totalPages}
            </span>
            <button 
              className="btn" 
              disabled={page >= totalPages} 
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}