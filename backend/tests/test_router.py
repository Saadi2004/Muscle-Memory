import pytest
import asyncio
from app.models.alert import AlertEvent, AlertSeverity
from app.models.decision import RoutingBranch, MatchConfidence
from app.services.firestore_service import db_service
from app.services.incident_matcher import incident_matcher
from app.services.severity_scorer import severity_scorer
from app.services.router import incident_router
from app.simulator.alert_generator import simulator


@pytest.mark.asyncio
async def test_seed_incidents_loaded():
    incidents = db_service.get_all_incidents()
    assert len(incidents) >= 5
    ids = [i.id for i in incidents]
    assert "INC-2025-014" in ids  # Redis incident
    assert "INC-2025-089" in ids  # DB replication lag incident


@pytest.mark.asyncio
async def test_scenario_1_redis_auto_resolve_branch_a():
    alert = simulator.create_alert_from_scenario("scenario-redis-repeat")
    decision = await incident_router.process_alert(alert)

    assert decision.match_result.is_known is True
    assert decision.match_result.matched_incident_id == "INC-2025-014"
    assert decision.match_result.confidence_score >= 0.70
    assert decision.decision.branch == RoutingBranch.BRANCH_A_AUTO_RESOLVE
    assert decision.decision.remediation.executed is True
    assert decision.decision.remediation.status == "success"
    assert "kubectl" in decision.decision.remediation.command_executed


@pytest.mark.asyncio
async def test_scenario_2_db_lag_critical_branch_b():
    alert = simulator.create_alert_from_scenario("scenario-db-lag-high")
    decision = await incident_router.process_alert(alert)

    assert decision.match_result.is_known is True
    assert decision.match_result.matched_incident_id == "INC-2025-089"
    assert decision.severity_assessment.severity in [AlertSeverity.P0, AlertSeverity.P1]
    assert decision.decision.branch == RoutingBranch.BRANCH_B_ESCALATE_KNOWN
    assert decision.decision.remediation.executed is False
    assert decision.decision.remediation.status == "pending_human_approval"
    assert "SELECT pg_terminate_backend" in decision.decision.remediation.command_executed


@pytest.mark.asyncio
async def test_scenario_3_novel_anomaly_branch_c():
    alert = simulator.create_alert_from_scenario("scenario-novel-auth-leak")
    decision = await incident_router.process_alert(alert)

    assert decision.match_result.is_known is False
    assert decision.match_result.confidence_score < 0.70
    assert decision.decision.branch == RoutingBranch.BRANCH_C_ESCALATE_NOVEL
    assert decision.decision.remediation.status == "escalated_for_investigation"
    assert "HONEST UNCERTAINTY" in decision.decision.remediation.execution_output


@pytest.mark.asyncio
async def test_scenario_4_transient_noise_branch_d():
    alert = simulator.create_alert_from_scenario("scenario-transient-spike")
    decision = await incident_router.process_alert(alert)

    assert decision.decision.branch == RoutingBranch.BRANCH_D_SUPPRESS_NOISE
    assert decision.decision.remediation.status == "suppressed"


@pytest.mark.asyncio
async def test_stats_aggregation():
    stats = db_service.get_stats()
    assert stats["total_triaged"] >= 4
    assert stats["auto_resolved_count"] >= 1
    assert stats["escalated_known_count"] >= 1
    assert stats["escalated_novel_count"] >= 1
