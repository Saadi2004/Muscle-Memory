import json
from typing import Dict, Any
from ..models.alert import AlertEvent, AlertSeverity
from ..models.decision import IncidentMatchResult, SeverityAssessment
from .gemini_client import gemini_service


class SeverityScorer:
    def __init__(self):
        self.system_prompt = """
You are the Severity Scorer module of 'Muscle Memory', an autonomous production incident coordinator.
Assess the severity of an incoming production alert by analyzing blast radius, revenue impact, service tier, SLA danger, and customer visibility.

SEVERITY TIERS:
- P0: Critical outage / total failure of core revenue/auth/db service / immediate SLA breach.
- P1: Major degradation / high error rate (> 15%) / degraded primary user journey.
- P2: Moderate incident / redundancy loss, cache failure, or elevated latency affecting single component.
- P3: Minor issue / transient blip, internal tooling glitch, or low-priority background task.

Return ONLY valid JSON matching this schema:
{
  "severity": "P0" | "P1" | "P2" | "P3",
  "blast_radius": string (e.g. "Global Production Traffic", "Regional Database Reads", "Internal Background Worker"),
  "sla_breach_risk": boolean,
  "severity_rationale": string,
  "impact_score": integer (1 to 10)
}
"""

    def _heuristic_score(self, alert: AlertEvent, match_result: IncidentMatchResult) -> SeverityAssessment:
        service_lower = alert.service.lower()
        title_lower = alert.title.lower()
        error_lower = alert.error_message.lower()
        metrics = alert.metrics or {}

        # Check for transient blips / low noise
        is_transient = (
            "transient" in title_lower
            or "spike" in title_lower and metrics.get("duration_seconds", 60) < 20
            or "flaky" in title_lower
        )
        if is_transient:
            return SeverityAssessment(
                severity=AlertSeverity.P3,
                blast_radius="Isolated Single Pod / Sub-second Transience",
                sla_breach_risk=False,
                severity_rationale="Metric spike was transient (< 20s) with self-recovering error rates. No customer degradation observed.",
                impact_score=2,
            )

        # Check for P0 (critical db replication lag > 100s, total checkout failure, global outage)
        if (
            "primary-db" in service_lower
            or "checkout" in title_lower
            or metrics.get("replication_lag_seconds", 0) > 60
            or metrics.get("error_rate_percent", 0) > 40
            or "replication lag" in title_lower
        ):
            return SeverityAssessment(
                severity=AlertSeverity.P0,
                blast_radius="Critical Global Production (Primary Database & Checkout Path)",
                sla_breach_risk=True,
                severity_rationale="Core database replication lag directly jeopardizes transactional integrity and violates 99.99% availability SLA.",
                impact_score=9,
            )

        # Check for P1 (ingress gateway failure, major API error surge)
        if (
            "ingress" in service_lower
            or "gateway" in service_lower
            or metrics.get("error_rate_percent", 0) > 15
            or "504" in error_lower
            or "502" in error_lower
        ):
            return SeverityAssessment(
                severity=AlertSeverity.P1,
                blast_radius="High Impact Multi-Service Ingress Gateway",
                sla_breach_risk=True,
                severity_rationale="Gateway timeout surge is dropping incoming customer connections across multiple endpoints.",
                impact_score=8,
            )

        # Check for P2 (cache connection exhaustion, webhook secret rotation, worker OOM)
        if (
            "cache" in service_lower
            or "redis" in service_lower
            or "payment" in service_lower
            or "document" in service_lower
            or "oom" in error_lower
        ):
            return SeverityAssessment(
                severity=AlertSeverity.P2,
                blast_radius="Moderate Impact (Subsystem Performance & Background Processing)",
                sla_breach_risk=False,
                severity_rationale="Service resilience degraded, but failover or fallback paths are cushioning user impact in the short term.",
                impact_score=5,
            )

        # Default P2/P3
        return SeverityAssessment(
            severity=AlertSeverity.P2,
            blast_radius="Localized Component",
            sla_breach_risk=False,
            severity_rationale="Standard operational degradation requiring triage and automated or manual remediation.",
            impact_score=4,
        )

    async def score_severity(self, alert: AlertEvent, match_result: IncidentMatchResult) -> SeverityAssessment:
        fallback = self._heuristic_score(alert, match_result)

        if not gemini_service.is_live():
            return fallback

        prompt = f"""
Assess the severity of this production alert:
- Service: {alert.service}
- Title: {alert.title}
- Error: {alert.error_message}
- Metrics: {json.dumps(alert.metrics)}
- Incident Match: {match_result.confidence_level.value} (is_known={match_result.is_known})
- Historical Match Info: {match_result.matched_incident.title if match_result.matched_incident else 'None (Novel/Unknown)'}
"""
        try:
            gemini_res = await gemini_service.generate_structured_json(
                prompt=prompt,
                system_instruction=self.system_prompt,
                fallback_data=fallback.model_dump(),
            )
            return SeverityAssessment(
                severity=AlertSeverity(gemini_res.get("severity", fallback.severity.value)),
                blast_radius=gemini_res.get("blast_radius", fallback.blast_radius),
                sla_breach_risk=bool(gemini_res.get("sla_breach_risk", fallback.sla_breach_risk)),
                severity_rationale=gemini_res.get("severity_rationale", fallback.severity_rationale),
                impact_score=int(gemini_res.get("impact_score", fallback.impact_score)),
            )
        except Exception as e:
            print(f"[SeverityScorer] Gemini inference error: {e}")
            return fallback


severity_scorer = SeverityScorer()
