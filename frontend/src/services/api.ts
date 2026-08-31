import type {
  DecisionLogEntry,
  PastIncident,
  ScenarioPreset,
  SystemStats,
  AlertEvent,
} from '../types';

const API_BASE = '/api';

export async function fetchStats(): Promise<SystemStats> {
  const res = await fetch(`${API_BASE}/stats`);
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

export async function fetchScenarios(): Promise<ScenarioPreset[]> {
  const res = await fetch(`${API_BASE}/scenarios`);
  if (!res.ok) throw new Error('Failed to fetch scenarios');
  return res.json();
}

export async function fetchDecisions(): Promise<DecisionLogEntry[]> {
  const res = await fetch(`${API_BASE}/decisions`);
  if (!res.ok) throw new Error('Failed to fetch decisions');
  return res.json();
}

export async function fetchDecisionById(id: string): Promise<DecisionLogEntry> {
  const res = await fetch(`${API_BASE}/decisions/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch decision ${id}`);
  return res.json();
}

export async function fetchMemoryBank(): Promise<PastIncident[]> {
  const res = await fetch(`${API_BASE}/memory`);
  if (!res.ok) throw new Error('Failed to fetch memory bank');
  return res.json();
}

export async function addIncidentToMemory(incident: PastIncident): Promise<PastIncident> {
  const res = await fetch(`${API_BASE}/memory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(incident),
  });
  if (!res.ok) throw new Error('Failed to save incident');
  return res.json();
}

export async function simulateScenario(scenarioId: string): Promise<DecisionLogEntry> {
  const res = await fetch(`${API_BASE}/alerts/simulate/${scenarioId}`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`Simulation failed: ${await res.text()}`);
  return res.json();
}

export async function submitCustomAlert(alert: Partial<AlertEvent>): Promise<DecisionLogEntry> {
  const res = await fetch(`${API_BASE}/alerts/custom`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(alert),
  });
  if (!res.ok) throw new Error(`Custom alert failed: ${await res.text()}`);
  return res.json();
}

export function subscribeToEvents(
  onIncident: (entry: DecisionLogEntry) => void,
  onMemoryUpdate: (incident: PastIncident) => void
): () => void {
  const eventSource = new EventSource(`${API_BASE}/events/stream`);

  eventSource.addEventListener('incident_processed', (event) => {
    try {
      const data = JSON.parse(event.data);
      onIncident(data);
    } catch (e) {
      console.error('Error parsing SSE incident_processed:', e);
    }
  });

  eventSource.addEventListener('memory_updated', (event) => {
    try {
      const data = JSON.parse(event.data);
      onMemoryUpdate(data);
    } catch (e) {
      console.error('Error parsing SSE memory_updated:', e);
    }
  });

  eventSource.onerror = (err) => {
    console.warn('SSE connection error, will reconnect automatically:', err);
  };

  return () => {
    eventSource.close();
  };
}
