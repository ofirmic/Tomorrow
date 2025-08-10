import { useEffect, useState } from 'react';
import { apiUrl } from '../lib/api';

type AlertState = {
  id: string;
  name: string | null;
  description: string | null;
  cityName: string | null;
  latitude: number | null;
  longitude: number | null;
  parameter: 'TEMPERATURE' | 'WIND_SPEED' | 'PRECIPITATION';
  operator: 'GT' | 'GTE' | 'LT' | 'LTE' | 'EQ' | 'NE';
  threshold: number;
  createdAt: string;
  lastState: boolean | null;
  lastValue: number | null;
  lastEvaluatedAt: string | null;
};

type FilterOption = 'ALL' | 'TRIGGERED' | 'NOT_TRIGGERED';
type SortOption = 'NAME' | 'STATE' | 'CREATED_DATE' | 'LAST_CHECKED';

export function CurrentState() {
  const [alerts, setAlerts] = useState<AlertState[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<FilterOption>('ALL');
  const [sort, setSort] = useState<SortOption>('LAST_CHECKED');

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/alerts?page=${page}&pageSize=${pageSize}`));
      const json = await res.json();
      setAlerts(json.items ?? []);
      setTotal(json.total ?? 0);
    } catch (e) { console.error('Failed to fetch alerts:', e); }
    finally { setLoading(false); }
  };

  const deleteAlert = async (id: string) => {
    if (!confirm('Delete this alert?')) return;
    try {
      await fetch(apiUrl(`/api/alerts/${id}`), { method: 'DELETE' });
      fetchAlerts(); // Refresh list
    } catch (error) {
      alert('Failed to delete alert');
    }
  };

  const clearAllAlerts = async () => {
    if (!confirm(`Are you sure you want to delete ALL ${totalCount} alerts? This action cannot be undone.`)) return;
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

  useEffect(() => {
    fetchAlerts();
    const id = setInterval(fetchAlerts, 30_000);
    return () => clearInterval(id);
  }, [page]);

  // Apply filters and sorting
  const filteredAlerts = alerts
    .filter(alert => {
      if (filter === 'TRIGGERED') return alert.lastState;
      if (filter === 'NOT_TRIGGERED') return !alert.lastState;
      return true;
    })
    .sort((a, b) => {
      switch (sort) {
        case 'NAME':
          return (a.name || a.id).localeCompare(b.name || b.id);
        case 'CREATED_DATE':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'LAST_CHECKED':
          if (!a.lastEvaluatedAt && !b.lastEvaluatedAt) return 0;
          if (!a.lastEvaluatedAt) return 1;
          if (!b.lastEvaluatedAt) return -1;
          return new Date(b.lastEvaluatedAt).getTime() - new Date(a.lastEvaluatedAt).getTime();
        case 'STATE':
          if (a.lastState === b.lastState) return 0;
          if (a.lastState) return -1;
          if (b.lastState) return 1;
          return 0;
        default:
          return 0;
      }
    });

  const triggeredCount = alerts.filter(a => a.lastState).length;
  const totalCount = alerts.length;

  return (
    <div>
      <h2>Current Alert State</h2>
      
      {/* Status Summary */}
      {triggeredCount === 0 ? (
        <div className="card" style={{ background: '#052e16', borderColor: '#14532d', color: '#10b981' }}>
          ✅ All Clear - No alerts triggered ({totalCount} alerts monitored)
        </div>
      ) : (
        <div className="card" style={{ background: '#3a1d06', borderColor: '#92400e', color: '#f59e0b' }}>
          ⚠️ {triggeredCount} of {totalCount} alerts triggered
        </div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', gap: 12, marginTop: 16, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <label>Filter: </label>
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value as FilterOption)}
            style={{ marginLeft: 8, padding: '4px 8px', borderRadius: 4, border: '1px solid #374151' }}
          >
            <option value="ALL">All Alerts</option>
            <option value="TRIGGERED">Triggered Only</option>
            <option value="NOT_TRIGGERED">Not Triggered</option>
          </select>
        </div>
        
        <div>
          <label>Sort by: </label>
          <select 
            value={sort} 
            onChange={(e) => setSort(e.target.value as SortOption)}
            style={{ marginLeft: 8, padding: '4px 8px', borderRadius: 4, border: '1px solid #374151' }}
          >
            <option value="NAME">Name</option>
            <option value="STATE">Alert State</option>
            <option value="CREATED_DATE">Created Date</option>
            <option value="LAST_CHECKED">Last Checked</option>
          </select>
        </div>

        <button className="btn" onClick={fetchAlerts} disabled={loading}>
          {loading ? 'Refreshing...' : '🔄 Refresh'}
        </button>

        {totalCount > 0 && (
          <button 
            className="btn" 
            onClick={clearAllAlerts}
            disabled={loading}
            style={{ background: '#dc2626' }}
          >
            🗑️ Clear All
          </button>
        )}
      </div>

      {/* Alerts List */}
      {filteredAlerts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: '#9ca3af' }}>
          {filter === 'ALL' ? 'No alerts found' : `No ${filter.replace('_', ' ')} alerts`}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredAlerts.map((alert) => (
            <div 
              key={alert.id} 
              className="card" 
              style={{ 
                borderLeft: `4px solid ${alert.lastState ? '#f59e0b' : '#10b981'}`,
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 8px 0', color: alert.lastState ? '#f59e0b' : '#10b981' }}>
                    {alert.name || `${alert.cityName || alert.parameter.toLowerCase() + ' alert'} (${alert.id.slice(-8)})`}
                    <span style={{ 
                      marginLeft: 12, 
                      fontSize: '0.8em', 
                      fontWeight: 'normal',
                      color: alert.lastState ? '#f59e0b' : '#6b7280'
                    }}>
                      {alert.lastState ? '🔴 TRIGGERED' : '🟢 OK'}
                    </span>
                  </h3>
                  
                  <div style={{ fontSize: '0.9em', color: '#9ca3af', marginBottom: 8 }}>
                    <strong>Condition:</strong> {alert.parameter.toLowerCase()} {alert.operator.replace('GT', '>').replace('LT', '<').replace('GTE', '≥').replace('LTE', '≤').replace('EQ', '=').replace('NE', '≠')} {alert.threshold}
                    {alert.parameter === 'TEMPERATURE' ? '°C' : alert.parameter === 'WIND_SPEED' ? ' m/s' : ' mm/hr'}
                  </div>
                  
                  <div style={{ fontSize: '0.85em', color: '#6b7280' }}>
                    <div>📍 Location: {alert.latitude?.toFixed(4)}, {alert.longitude?.toFixed(4)}</div>
                    {alert.lastValue !== null && (
                      <div>📊 Current value: {alert.lastValue}</div>
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
                    padding: '4px 8px',
                    cursor: 'pointer',
                    fontSize: '0.8em'
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
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
        <button 
          className="btn" 
          disabled={page <= 1} 
          onClick={() => setPage(p => Math.max(1, p - 1))}
        >
          Prev
        </button>
        <span style={{ alignSelf: 'center', padding: '0 16px' }}>
          Page {page} of {Math.ceil(total / pageSize)}
        </span>
        <button 
          className="btn" 
          disabled={page >= Math.ceil(total / pageSize)} 
          onClick={() => setPage(p => p + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}