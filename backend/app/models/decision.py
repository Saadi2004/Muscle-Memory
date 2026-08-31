from datetime import datetime, timezone
from enum import Enum
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from .alert import AlertEvent, AlertSeverity, AlertStatus
from .incident import PastIncident, IncidentResolutionRunbook


class MatchConfidence(str, Enum):
    VERY_HIGH = "VERY_HIGH"  # 90-100% exact or near-identical signature
    HIGH = "HIGH"            # 70-89% strong pattern match with matching root cause
    MODERATE = "MODERATE"    # 50-69% partial symptom similarity, inconclusive
    LOW = "LOW"              # 20-49% weak overlap
    UNMATCHED = "UNMATCHED"  # 0-19% completely novel or unrecognized anomaly


class RoutingBranch(str, Enum):
    BRANCH_A_AUTO_RESOLVE = "BRANCH_A_AUTO_RESOLVE"    # Known + Low Severity -> Auto-remediate & ticket
    BRANCH_B_ESCALATE_KNOWN = "BRANCH_B_ESCALATE_KNOWN" # Known + High Severity -> Urgent on-call page + attach past fix
    BRANCH_C_ESCALATE_NOVEL = "BRANCH_C_ESCALATE_NOVEL" # Unknown/Novel -> Honest uncertainty page + diagnostic blueprint
    BRANCH_D_SUPPRESS_NOISE = "BRANCH_D_SUPPRESS_NOISE" # Transient/Flake -> Noise suppression & log


class IncidentMatchResult(BaseModel):
    is_known: bool = Field(..., description="Whether a valid match above threshold was found")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Match confidence percentage (0.0 to 1.0)")
    confidence_level: MatchConfidence = Field(..., description="Categorical confidence rating")
    matched_incident_id: Optional[str] = Field(default=None, description="Matched past incident ID")
    matched_incident: Optional[PastIncident] = Field(default=None, description="Full matched past incident object")
    match_rationale: str = Field(..., description="Detailed technical justification explaining why it matches or differs")
    similarity_factors: List[str] = Field(default_factory=list, description="Specific matching vectors (e.g. stack trace token, error code, metric slope)")
    divergent_factors: List[str] = Field(default_factory=list, description="Divergent vectors or novel symptoms noticed")


class SeverityAssessment(BaseModel):
    severity: AlertSeverity = Field(..., description="Calculated urgency (P0, P1, P2, P3)")
    blast_radius: str = Field(..., description="Estimated scope of user or revenue impact (e.g. Critical Global, Regional, Single User Session)")
    sla_breach_risk: bool = Field(..., description="Whether SLA violation is imminent within 15 minutes")
    severity_rationale: str = Field(..., description="Reasoning for assigned severity level")
    impact_score: int = Field(..., ge=1, le=10, description="Impact score from 1 (minor) to 10 (catastrophic)")


class RemediationExecution(BaseModel):
    executed: bool = Field(default=False, description="Whether automated action was executed")
    action_type: str = Field(..., description="Type of action attempted (e.g. auto_script, runbook_dispatch, diagnostic_gather)")
    command_executed: Optional[str] = Field(default=None, description="Exact command or API called")
    execution_output: Optional[str] = Field(default=None, description="Output/stdout or status of execution")
    ticket_id: Optional[str] = Field(default=None, description="Generated Jira/GitHub/PagerDuty ticket reference")
    ticket_url: Optional[str] = Field(default=None, description="Link to tracking ticket")
    status: str = Field(default="pending", description="Execution status (success, failed, pending_approval, skipped)")


class RoutingDecision(BaseModel):
    branch: RoutingBranch = Field(..., description="Chosen autonomous branch")
    branch_name: str = Field(..., description="Human-friendly branch name")
    action_summary: str = Field(..., description="Concise summary of action taken")
    reasoning_summary: str = Field(..., description="Executive reasoning statement")
    remediation: RemediationExecution = Field(..., description="Remediation execution outcome or proposal")
    slack_notified: bool = Field(default=False, description="Whether Slack notification was dispatched")
    slack_channel: Optional[str] = Field(default="#production-incidents", description="Target Slack channel")


class DecisionLogEntry(BaseModel):
    id: str = Field(..., description="Decision record identifier")
    alert_id: str = Field(..., description="Referenced alert ID")
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    alert: AlertEvent = Field(..., description="Original triggering alert event")
    match_result: IncidentMatchResult = Field(..., description="Incident match analysis output")
    severity_assessment: SeverityAssessment = Field(..., description="Severity evaluation output")
    decision: RoutingDecision = Field(..., description="Routing branch decision and action outcome")
    processing_time_ms: int = Field(..., description="Total agent autonomous cycle time in milliseconds")
    model_used: str = Field(default="gemini-2.5-flash", description="AI reasoning model used")
    reasoning_steps: List[Dict[str, Any]] = Field(default_factory=list, description="Step-by-step trace of agent thought process")
