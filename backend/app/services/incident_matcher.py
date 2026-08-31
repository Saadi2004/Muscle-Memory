import json
from typing import List, Optional, Dict, Any
from ..models.alert import AlertEvent
from ..models.incident import PastIncident
from ..models.decision import IncidentMatchResult, MatchConfidence
from .gemini_client import gemini_service
from .firestore_service import db_service


class IncidentMatcher:
    def __init__(self):
        self.system_prompt = """
You are the Incident Matcher module of 'Muscle Memory', an autonomous production incident coordinator agent.
Your objective is to compare an incoming production alert against our historical database of resolved incidents to determine if this is a known, previously-solved recurrence, or a completely novel incident.

CRITICAL RULES:
1. Honesty & Uncertainty: If the alert has symptoms or root causes not covered by past incidents, you MUST assign a low confidence score (< 0.50) and state is_known=false. Never hallucinate a match.
2. Evidence-Based Rationale: Cite specific matching or divergent factors (error message strings, metric anomalies, stack trace frames, or service names).
3. Confidence thresholds:
   - VERY_HIGH (>= 0.90): Exact or near-identical signature, same service, same root cause.
   - HIGH (0.70 - 0.89): Strong similarity in error pattern and failure mode.
   - MODERATE (0.50 - 0.69): Similar service or generic error, but distinct symptoms.
   - LOW / UNMATCHED (< 0.50): Novel failure, unseen anomaly, or insufficient overlap.

Return ONLY valid JSON matching this schema:
{
  "is_known": boolean,
  "confidence_score": float (0.0 to 1.0),
  "confidence_level": "VERY_HIGH" | "HIGH" | "MODERATE" | "LOW" | "UNMATCHED",
  "matched_incident_id": string or null,
  "match_rationale": string,
  "similarity_factors": [string],
  "divergent_factors": [string]
}
"""

    def _heuristic_match(self, alert: AlertEvent, past_incidents: List[PastIncident]) -> IncidentMatchResult:
        """
        Deterministic, robust heuristic matcher used when Gemini is offline or as fallback baseline.
        """
        best_match: Optional[PastIncident] = None
        best_score = 0.0
        best_similarity_factors = []
        best_divergent_factors = []
        best_rationale = ""

        alert_text = f"{alert.service} {alert.title} {alert.error_message} {alert.stack_trace or ''}".lower()
        alert_metrics = alert.metrics or {}

        for inc in past_incidents:
            score = 0.0
            sim_factors = []
            div_factors = []

            # 1. Service match
            if inc.service.lower() in alert.service.lower() or alert.service.lower() in inc.service.lower():
                score += 0.35
                sim_factors.append(f"Matching service domain: {inc.service}")
            else:
                div_factors.append(f"Service mismatch ({alert.service} vs {inc.service})")

            # 2. Error pattern matching
            pattern_matches = 0
            for pattern in inc.error_patterns:
                if pattern.lower() in alert_text:
                    pattern_matches += 1
                    sim_factors.append(f"Matched historical error signature: '{pattern}'")
            if pattern_matches > 0:
                score += min(0.40, pattern_matches * 0.25)

            # 3. Symptoms / Tag matching
            symptom_matches = 0
            for symptom in inc.symptoms:
                words = [w for w in symptom.lower().split() if len(w) > 4]
                if any(w in alert_text for w in words):
                    symptom_matches += 1
            for tag in inc.tags:
                if tag.lower() in alert_text:
                    symptom_matches += 1
            if symptom_matches > 0:
                score += min(0.25, symptom_matches * 0.10)

            # Cap score
            score = min(1.0, round(score, 2))

            if score > best_score:
                best_score = score
                best_match = inc
                best_similarity_factors = sim_factors
                best_divergent_factors = div_factors

        # Threshold checks
        is_known = best_score >= 0.70
        if best_score >= 0.90:
            level = MatchConfidence.VERY_HIGH
            best_rationale = f"Exact match with historical incident {best_match.id} ('{best_match.title}'). Error signatures and affected service topology align identically."
        elif best_score >= 0.70:
            level = MatchConfidence.HIGH
            best_rationale = f"Strong structural match with {best_match.id} ('{best_match.title}'). The error pattern and symptoms indicate the same underlying failure mode."
        elif best_score >= 0.50:
            level = MatchConfidence.MODERATE
            best_rationale = f"Partial overlap with {best_match.id if best_match else 'past data'}, but key divergent factors indicate a potential variation or distinct incident."
            is_known = False
        else:
            level = MatchConfidence.UNMATCHED
            best_score = max(0.10, best_score)
            best_rationale = "No matching historical incident found in Muscle Memory bank. The error profile and symptoms appear to be an unprecedented novel anomaly."
            best_divergent_factors.append("Novel error trajectory with no recorded resolution runbook.")
            is_known = False
            best_match = None

        return IncidentMatchResult(
            is_known=is_known,
            confidence_score=best_score,
            confidence_level=level,
            matched_incident_id=best_match.id if (best_match and is_known) else None,
            matched_incident=best_match if (best_match and is_known) else None,
            match_rationale=best_rationale,
            similarity_factors=best_similarity_factors,
            divergent_factors=best_divergent_factors,
        )

    async def match_alert(self, alert: AlertEvent) -> IncidentMatchResult:
        past_incidents = db_service.get_all_incidents()
        fallback = self._heuristic_match(alert, past_incidents)

        if not gemini_service.is_live():
            return fallback

        # Construct prompt for live Gemini
        incidents_summary = [
            {
                "id": inc.id,
                "title": inc.title,
                "service": inc.service,
                "category": inc.category,
                "error_patterns": inc.error_patterns,
                "symptoms": inc.symptoms,
                "root_cause": inc.root_cause,
                "runbook_summary": inc.runbook.summary,
            }
            for inc in past_incidents
        ]

        prompt = f"""
Incoming Production Alert:
- Alert ID: {alert.id}
- Service: {alert.service}
- Environment: {alert.environment}
- Title: {alert.title}
- Error Message: {alert.error_message}
- Stack Trace: {alert.stack_trace or 'None'}
- Metrics: {json.dumps(alert.metrics)}

Historical Incident Database:
{json.dumps(incidents_summary, indent=2)}

Compare the incoming alert against the historical database and produce the structured JSON output.
"""
        try:
            gemini_res = await gemini_service.generate_structured_json(
                prompt=prompt,
                system_instruction=self.system_prompt,
                fallback_data=fallback.model_dump(),
            )
            matched_id = gemini_res.get("matched_incident_id")
            matched_obj = db_service.get_incident_by_id(matched_id) if matched_id else None

            return IncidentMatchResult(
                is_known=bool(gemini_res.get("is_known", fallback.is_known)),
                confidence_score=float(gemini_res.get("confidence_score", fallback.confidence_score)),
                confidence_level=MatchConfidence(gemini_res.get("confidence_level", fallback.confidence_level.value)),
                matched_incident_id=matched_id if (matched_obj and gemini_res.get("is_known")) else None,
                matched_incident=matched_obj if gemini_res.get("is_known") else None,
                match_rationale=gemini_res.get("match_rationale", fallback.match_rationale),
                similarity_factors=gemini_res.get("similarity_factors", fallback.similarity_factors),
                divergent_factors=gemini_res.get("divergent_factors", fallback.divergent_factors),
            )
        except Exception as e:
            print(f"[IncidentMatcher] Gemini inference error: {e}")
            return fallback


incident_matcher = IncidentMatcher()
