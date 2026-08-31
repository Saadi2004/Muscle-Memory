export type AlertSeverity = 'P0' | 'P1' | 'P2' | 'P3';

export type MatchConfidenceLevel = 'VERY_HIGH' | 'HIGH' | 'MODERATE' | 'LOW' | 'UNMATCHED';

export type RoutingBranchType =
  | 'BRANCH_A_AUTO_RESOLVE'
  | 'BRANCH_B_ESCALATE_KNOWN'
  | 'BRANCH_C_ESCALATE_NOVEL'
  | 'BRANCH_D_SUPPRESS_NOISE';

export interface AlertEvent {
  id: string;
  timestamp: string;
  service: string;
  environment: string;
  title: string;
  error_message: string;
  stack_trace?: string | null;
  metrics?: Record<string, any>;
  source: string;
  region: string;
}

export interface IncidentResolutionRunbook {
  summary: string;
  action_type: string;
  remediation_command?: string | null;
  runbook_url?: string | null;
  estimated_recovery_time_sec: number;
  automated_safe: boolean;
}

export interface PastIncident {
  id: string;
  title: string;
  service: string;
  category: string;
  severity: string;
  symptoms: string[];
  error_patterns: string[];
  root_cause: string;
  runbook: IncidentResolutionRunbook;
  occurred_at: string;
  resolved_by: string;
  post_mortem_notes?: string | null;
  tags: string[];
}

export interface IncidentMatchResult {
  is_known: boolean;
  confidence_score: number;
  confidence_level: MatchConfidenceLevel;
  matched_incident_id?: string | null;
  matched_incident?: PastIncident | null;
  match_rationale: string;
  similarity_factors: string[];
  divergent_factors: string[];
}

export interface SeverityAssessment {
  severity: AlertSeverity;
  blast_radius: string;
  sla_breach_risk: boolean;
  severity_rationale: string;
  impact_score: number;
}

export interface RemediationExecution {
  executed: boolean;
  action_type: string;
  command_executed?: string | null;
  execution_output?: string | null;
  ticket_id?: string | null;
  ticket_url?: string | null;
  status: string;
}

export interface RoutingDecision {
  branch: RoutingBranchType;
  branch_name: string;
  action_summary: string;
  reasoning_summary: string;
  remediation: RemediationExecution;
  slack_notified: boolean;
  slack_channel?: string | null;
}

export interface ReasoningStep {
  step: number;
  title: string;
  status: string;
  timestamp: string;
  details: string;
  factors?: string[];
  rationale?: string;
  sla_risk?: boolean;
  remediation_status?: string;
  ticket?: string | null;
}

export interface DecisionLogEntry {
  id: string;
  alert_id: string;
  timestamp: string;
  alert: AlertEvent;
  match_result: IncidentMatchResult;
  severity_assessment: SeverityAssessment;
  decision: RoutingDecision;
  processing_time_ms: number;
  model_used: string;
  reasoning_steps: ReasoningStep[];
}

export interface ScenarioPreset {
  id: string;
  name: string;
  description: string;
  expected_branch: RoutingBranchType;
  badge: string;
  badge_color: 'green' | 'red' | 'amber' | 'gray';
  alert: Partial<AlertEvent>;
}

export interface SystemStats {
  total_triaged: number;
  auto_resolved_count: number;
  auto_resolve_rate: string;
  escalated_known_count: number;
  escalated_novel_count: number;
  suppressed_count: number;
  avg_triage_time_ms: number;
  memory_bank_size: number;
}
