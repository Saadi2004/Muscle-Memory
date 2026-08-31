import time
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any
from ..models.alert import AlertEvent, AlertSeverity, AlertStatus
from ..models.decision import (
    IncidentMatchResult,
    SeverityAssessment,
    RoutingBranch,
    RoutingDecision,
    DecisionLogEntry,
)
from .incident_matcher import incident_matcher
from .severity_scorer import severity_scorer
from .remediation import remediation_service
from .slack_notifier import slack_service
from .firestore_service import db_service
from .gemini_client import gemini_service


class IncidentRouter:
    async def process_alert(self, alert: AlertEvent) -> DecisionLogEntry:
        start_time = time.time()
        decision_id = f"DEC-{uuid.uuid4().hex[:8].upper()}"
        reasoning_steps: List[Dict[str, Any]] = []

        # Step 1: Ingestion
        db_service.save_alert(alert)
        reasoning_steps.append({
            "step": 1,
            "title": "Alert Ingestion & Metadata Parsing",
            "status": "completed",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "details": f"Ingested alert '{alert.title}' from service '{alert.service}' with source '{alert.source}'.",
        })

        # Step 2: Memory Retrieval & Incident Matching
        match_result = await incident_matcher.match_alert(alert)
        reasoning_steps.append({
            "step": 2,
            "title": "Historical Incident Matching (Gemini Reasoning)",
            "status": "completed",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "details": f"Confidence: {match_result.confidence_score * 100:.0f}% ({match_result.confidence_level.value}). "
                       f"{'Matched ' + match_result.matched_incident_id if match_result.is_known else 'Flagged as Novel / Unmatched'}.",
            "factors": match_result.similarity_factors if match_result.is_known else match_result.divergent_factors,
            "rationale": match_result.match_rationale,
        })

        # Step 3: Multidimensional Severity Assessment
        severity_assessment = await severity_scorer.score_severity(alert, match_result)
        reasoning_steps.append({
            "step": 3,
            "title": "Urgency & Blast Radius Scoring",
            "status": "completed",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "details": f"Assigned Severity: {severity_assessment.severity.value} (Impact: {severity_assessment.impact_score}/10). "
                       f"Blast Radius: {severity_assessment.blast_radius}.",
            "rationale": severity_assessment.severity_rationale,
            "sla_risk": severity_assessment.sla_breach_risk,
        })

        # Step 4: Autonomous Branch Selection
        branch: RoutingBranch
        branch_name: str
        action_summary: str
        reasoning_summary: str

        if severity_assessment.severity == AlertSeverity.P3 and not match_result.is_known and "spike" in alert.title.lower():
            branch = RoutingBranch.BRANCH_D_SUPPRESS_NOISE
            branch_name = "Branch D: Noise Suppression"
            action_summary = "Transient blip filtered out; suppressed redundant alerting noise."
            reasoning_summary = "Alert characteristics match a non-persistent metric spike with no user-facing SLA impact."
        elif match_result.is_known and severity_assessment.severity in [AlertSeverity.P2, AlertSeverity.P3]:
            branch = RoutingBranch.BRANCH_A_AUTO_RESOLVE
            branch_name = "Branch A: Autonomous Auto-Remediation"
            action_summary = f"Auto-executing proven resolution script from {match_result.matched_incident_id} and creating low-severity tracking ticket."
            reasoning_summary = f"Known historical incident with verified automated runbook and moderate blast radius ({severity_assessment.severity.value}). Safe for automated self-healing."
        elif match_result.is_known and severity_assessment.severity in [AlertSeverity.P0, AlertSeverity.P1]:
            branch = RoutingBranch.BRANCH_B_ESCALATE_KNOWN
            branch_name = "Branch B: Critical Escalation (Past Fix Attached)"
            action_summary = f"Urgent page dispatched to on-call with historical fix from {match_result.matched_incident_id} pre-packaged for instant execution."
            reasoning_summary = f"High severity ({severity_assessment.severity.value}) requiring human verification, but historical fix is already identified to reduce MTTR from hours to seconds."
        else:
            branch = RoutingBranch.BRANCH_C_ESCALATE_NOVEL
            branch_name = "Branch C: Honest Uncertainty Escalation"
            action_summary = "Novel anomaly flagged with diagnostic blueprint dispatched to lead SRE on-call."
            reasoning_summary = "Zero past incident match found (< 70% confidence). Demonstrating honest uncertainty: agent escalates with hypothesis rather than guessing a remediation."

        # Step 5: Execution & Remediation
        remediation_outcome = await remediation_service.execute_remediation(
            alert=alert,
            match_result=match_result,
            severity=severity_assessment,
            branch=branch,
        )

        reasoning_steps.append({
            "step": 4,
            "title": f"Autonomous Routing Decision: {branch_name}",
            "status": "completed",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "details": action_summary,
            "remediation_status": remediation_outcome.status,
            "ticket": remediation_outcome.ticket_id,
        })

        routing_decision = RoutingDecision(
            branch=branch,
            branch_name=branch_name,
            action_summary=action_summary,
            reasoning_summary=reasoning_summary,
            remediation=remediation_outcome,
            slack_notified=False,
            slack_channel="#production-incidents",
        )

        elapsed_ms = int((time.time() - start_time) * 1000)

        decision_log = DecisionLogEntry(
            id=decision_id,
            alert_id=alert.id,
            timestamp=datetime.now(timezone.utc).isoformat(),
            alert=alert,
            match_result=match_result,
            severity_assessment=severity_assessment,
            decision=routing_decision,
            processing_time_ms=elapsed_ms,
            model_used="gemini-2.5-flash" if gemini_service.is_live() else "muscle-memory-heuristic-core",
            reasoning_steps=reasoning_steps,
        )

        # Step 6: Slack Webhook Notification
        slack_sent = await slack_service.send_notification(decision_log)
        decision_log.decision.slack_notified = slack_sent

        # Save to DB / Firestore
        db_service.save_decision(decision_log)

        return decision_log


incident_router = IncidentRouter()
