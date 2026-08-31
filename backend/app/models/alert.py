from datetime import datetime, timezone
from enum import Enum
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field


class AlertSeverity(str, Enum):
    P0 = "P0"  # Critical outage / complete service disruption
    P1 = "P1"  # Major degradation / significant revenue/user impact
    P2 = "P2"  # Moderate impact / degraded performance or non-critical redundancy failure
    P3 = "P3"  # Low severity / minor glitch or transient anomaly


class AlertStatus(str, Enum):
    TRIGGERED = "triggered"
    INGESTED = "ingested"
    ANALYZING = "analyzing"
    MATCHED = "matched"
    AUTO_RESOLVED = "auto_resolved"
    ESCALATED = "escalated"
    UNKNOWN_ESCALATED = "unknown_escalated"
    SUPPRESSED = "suppressed"


class AlertEvent(BaseModel):
    id: str = Field(..., description="Unique alert identifier (e.g. alt-2026-9041)")
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    service: str = Field(..., description="Affected service or microservice (e.g. auth-service, payment-gateway)")
    environment: str = Field(default="production", description="Environment (production, staging, etc.)")
    title: str = Field(..., description="Alert headline/summary")
    error_message: str = Field(..., description="Raw or formatted error message")
    stack_trace: Optional[str] = Field(default=None, description="Detailed stack trace or error log snippet")
    metrics: Dict[str, Any] = Field(default_factory=dict, description="Key operational metrics at time of alert")
    source: str = Field(default="prometheus/datadog", description="Monitoring system source")
    region: str = Field(default="us-central1", description="Cloud region or cluster location")
    raw_payload: Optional[Dict[str, Any]] = Field(default=None, description="Original raw alert webhook payload")
