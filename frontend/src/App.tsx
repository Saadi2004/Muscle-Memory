import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  fetchStats,
  fetchScenarios,
  fetchDecisions,
  fetchMemoryBank,
  addIncidentToMemory,
  simulateScenario,
  submitCustomAlert,
  subscribeToEvents,
} from './services/api';
import type {
  DecisionLogEntry,
  PastIncident,
  ScenarioPreset,
  SystemStats,
  AlertEvent,
} from './types';
import { Header } from './components/Header';
import { StatsOverview } from './components/StatsOverview';
import { AlertSimulator } from './components/AlertSimulator';
import { IncidentFeed } from './components/IncidentFeed';
import { ReasoningTrace } from './components/ReasoningTrace';
import { MemoryBank } from './components/MemoryBank';
import { SlackPreviewModal } from './components/SlackPreviewModal';
import { CustomAlertModal } from './components/CustomAlertModal';
import { AddIncidentModal } from './components/AddIncidentModal';

export const App: React.FC = () => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [scenarios, setScenarios] = useState<ScenarioPreset[]>([]);
  const [decisions, setDecisions] = useState<DecisionLogEntry[]>([]);
  const [memoryBank, setMemoryBank] = useState<PastIncident[]>([]);
  const [selectedDecision, setSelectedDecision] = useState<DecisionLogEntry | null>(null);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'memory' | 'audit'>('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);

  // Modals
  const [slackModalDecision, setSlackModalDecision] = useState<DecisionLogEntry | null>(null);
  const [isCustomAlertOpen, setIsCustomAlertOpen] = useState(false);
  const [isAddIncidentOpen, setIsAddIncidentOpen] = useState(false);
  const [promoteDecision, setPromoteDecision] = useState<DecisionLogEntry | null>(null);

  // Load initial data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [statsData, scenariosData, decisionsData, memoryData] = await Promise.all([
        fetchStats(),
        fetchScenarios(),
        fetchDecisions(),
        fetchMemoryBank(),
      ]);
      setStats(statsData);
      setScenarios(scenariosData);
      setDecisions(decisionsData);
      setMemoryBank(memoryData);

      if (decisionsData.length > 0 && !selectedDecision) {
        setSelectedDecision(decisionsData[0]);
      }
    } catch (e) {
      console.error('Error loading initial data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Subscribe to SSE stream for live real-time updates
    const unsubscribe = subscribeToEvents(
      (newDecision) => {
        setDecisions((prev) => [newDecision, ...prev.filter((d) => d.id !== newDecision.id)]);
        setSelectedDecision(newDecision);

        // Refresh stats
        fetchStats().then(setStats).catch(console.error);

        // Trigger confetti on Branch A (Auto-healing)
        if (newDecision.decision.branch === 'BRANCH_A_AUTO_RESOLVE') {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.8 },
            colors: ['#10b981', '#34d399', '#6ee7b7'],
          });
        }
      },
      (newIncident) => {
        setMemoryBank((prev) => [newIncident, ...prev.filter((i) => i.id !== newIncident.id)]);
        fetchStats().then(setStats).catch(console.error);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleSimulateScenario = async (scenarioId: string) => {
    setIsSimulating(true);
    setActiveScenarioId(scenarioId);
    try {
      const decision = await simulateScenario(scenarioId);
      setDecisions((prev) => [decision, ...prev.filter((d) => d.id !== decision.id)]);
      setSelectedDecision(decision);

      const updatedStats = await fetchStats();
      setStats(updatedStats);

      if (decision.decision.branch === 'BRANCH_A_AUTO_RESOLVE') {
        confetti({
          particleCount: 75,
          spread: 70,
          origin: { y: 0.7 },
          colors: ['#10b981', '#34d399', '#6ee7b7'],
        });
      }
    } catch (e) {
      console.error('Simulation error:', e);
    } finally {
      setIsSimulating(false);
      setActiveScenarioId(null);
    }
  };

  const handleCustomAlertSubmit = async (alertData: Partial<AlertEvent>) => {
    setIsSimulating(true);
    try {
      const decision = await submitCustomAlert(alertData);
      setDecisions((prev) => [decision, ...prev.filter((d) => d.id !== decision.id)]);
      setSelectedDecision(decision);
      setIsCustomAlertOpen(false);

      const updatedStats = await fetchStats();
      setStats(updatedStats);
    } catch (e) {
      console.error('Custom alert error:', e);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleSaveNewIncident = async (incident: PastIncident) => {
    try {
      const saved = await addIncidentToMemory(incident);
      setMemoryBank((prev) => [saved, ...prev.filter((i) => i.id !== saved.id)]);
      setIsAddIncidentOpen(false);
      setPromoteDecision(null);

      const updatedStats = await fetchStats();
      setStats(updatedStats);
    } catch (e) {
      console.error('Error saving incident:', e);
    }
  };

  const handlePromoteToMemory = (decision: DecisionLogEntry) => {
    setPromoteDecision(decision);
    setIsAddIncidentOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Header */}
      <Header
        stats={stats}
        onRefresh={loadData}
        isLoading={isLoading}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-4">
        {/* KPI Stats Overview Bar */}
        <StatsOverview stats={stats} />

        {/* Tab 1: Live Command Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            {/* Scenario Simulator Trigger Bar */}
            <AlertSimulator
              scenarios={scenarios}
              onSimulate={handleSimulateScenario}
              onOpenCustomModal={() => setIsCustomAlertOpen(true)}
              isSimulating={isSimulating}
              activeScenarioId={activeScenarioId}
            />

            {/* Split 2-Column Incident Commander Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* Left Column: Live Incident Stream Feed */}
              <div className="lg:col-span-5 h-[680px]">
                <IncidentFeed
                  decisions={decisions}
                  selectedDecisionId={selectedDecision?.id || null}
                  onSelectDecision={(dec) => setSelectedDecision(dec)}
                />
              </div>

              {/* Right Column: Interactive Gemini Reasoning Trace */}
              <div className="lg:col-span-7 h-[680px]">
                <ReasoningTrace
                  decision={selectedDecision}
                  onOpenSlackPreview={(dec) => setSlackModalDecision(dec)}
                  onPromoteToMemory={handlePromoteToMemory}
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Incident Memory Bank */}
        {activeTab === 'memory' && (
          <MemoryBank
            incidents={memoryBank}
            onOpenAddModal={() => {
              setPromoteDecision(null);
              setIsAddIncidentOpen(true);
            }}
          />
        )}
      </main>

      {/* Modals */}
      <SlackPreviewModal
        decision={slackModalDecision}
        onClose={() => setSlackModalDecision(null)}
      />

      <CustomAlertModal
        isOpen={isCustomAlertOpen}
        onClose={() => setIsCustomAlertOpen(false)}
        onSubmit={handleCustomAlertSubmit}
        isSubmitting={isSimulating}
      />

      <AddIncidentModal
        isOpen={isAddIncidentOpen}
        onClose={() => {
          setIsAddIncidentOpen(false);
          setPromoteDecision(null);
        }}
        onSave={handleSaveNewIncident}
        initialFromDecision={promoteDecision}
      />
    </div>
  );
};

export default App;
