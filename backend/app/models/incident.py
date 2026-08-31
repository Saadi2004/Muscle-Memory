from datetime import datetime, timezone
from enum import Enum
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class IncidentCategory(str, Enum):
    DATABASE = "database"
    CACHE = "cache"
    NETWORK_INFRA = "network_infra"
    SECURITY_AUTH = "security_auth"
    DEPLOYMENT_REGRESSION = "deployment_regression"
    RESOURCE_EXHAUSTION = "resource_exhaustion"
    THIRD_PARTY_API = "third_party_api"


class IncidentResolutionRunbook(BaseModel):
    summary: str = Field(..., description="High-level description of the fix")
    action_type: str = Field(..., description="Action type: auto_script, runbook_command, rollback, manual_investigation")
    remediation_command: Optional[str] = Field(default=None, description="Exact shell command, script, or API payload used to resolve")
    runbook_url: Optional[str] = Field(default=None, description="Internal documentation or wiki link")
    estimated_recovery_time_sec: int = Field(default=60, description="Estimated time to full recovery")
    automated_safe: bool = Field(default=False, description="Whether this action is safe for automated execution without human approval")


class PastIncident(BaseModel):
    id: str = Field(..., description="Unique incident identifier (e.g. INC-2025-104)")
    title: str = Field(..., description="Incident title")
    service: str = Field(..., description="Affected service")
    category: IncidentCategory = Field(..., description="Category of the incident")
    severity: str = Field(..., description="Assigned severity (P0, P1, P2, P3)")
    symptoms: List[str] = Field(default_factory=list, description="Observed symptom indicators and signatures")
    error_patterns: List[str] = Field(default_factory=list, description="Regex or text patterns seen in error logs")
    root_cause: str = Field(..., description="Detailed technical root cause analysis")
    runbook: IncidentResolutionRunbook = Field(..., description="Resolution steps and runbook")
    occurred_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    resolved_by: str = Field(default="SRE On-Call", description="Engineer or automation that resolved it")
    post_mortem_notes: Optional[str] = Field(default=None, description="Key post-mortem takeaways")
    tags: List[str] = Field(default_factory=list, description="Searchable tags")
