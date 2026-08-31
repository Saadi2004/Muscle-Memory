import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any
from ..models.alert import AlertEvent


class AlertSimulator:
    def get_preset_scenarios(self) -> List[Dict[str, Any]]:
        return [
            {
                "id": "scenario-redis-repeat",
                "name": "Scenario 1: Redis Connection Pool Exhaustion (Exact Repeat)",
                "description": "Demonstrates Branch A (Auto-Resolve). The agent recognizes identical historical incident INC-2025-014, calculates moderate severity, and automatically executes the connection reaper script.",
                "expected_branch": "BRANCH_A_AUTO_RESOLVE",
                "badge": "Branch A (Auto-Healing)",
                "badge_color": "green",
                "alert": {
                    "id": f"ALT-REDIS-{uuid.uuid4().hex[:6].upper()}",
                    "service": "cache-redis-cluster",
                    "environment": "production",
                    "title": "Redis Connection Pool Exhaustion on Cache Node",
                    "error_message": "ERR max number of clients reached (10000/10000). JedisConnectionException: Could not get a resource from the pool",
                    "stack_trace": "com.internal.cache.RedisPool: ERR max number of clients reached\n  at redis.clients.jedis.JedisPool.getResource(JedisPool.java:234)\n  at com.internal.session.SessionCache.get(SessionCache.java:88)",
                    "metrics": {
                        "active_connections": 10000,
                        "cache_miss_rate": 0.88,
                        "p99_latency_ms": 850,
                        "error_rate_percent": 12.4,
                    },
                    "source": "datadog-redis-monitor",
                    "region": "us-central1-a",
                },
            },
            {
                "id": "scenario-db-lag-high",
                "name": "Scenario 2: PostgreSQL Replica Lag Surge (Known Critical)",
                "description": "Demonstrates Branch B (Critical Escalation). Recognizes high-risk incident INC-2025-089 (P0/P1), immediately pages on-call via Slack with the exact SQL kill command and past post-mortem attached.",
                "expected_branch": "BRANCH_B_ESCALATE_KNOWN",
                "badge": "Branch B (High-Sev Escalation)",
                "badge_color": "red",
                "alert": {
                    "id": f"ALT-DB-{uuid.uuid4().hex[:6].upper()}",
                    "service": "primary-db-cluster",
                    "environment": "production",
                    "title": "PostgreSQL Read Replica Replication Lag Exceeding SLA",
                    "error_message": "replication lag critical threshold exceeded: 180s. canceling statement due to conflict with recovery",
                    "stack_trace": "org.postgresql.util.PSQLException: FATAL: terminating connection due to conflict with recovery\n  at org.postgresql.core.v3.QueryExecutorImpl.execute(QueryExecutorImpl.java:331)\n  at com.internal.checkout.InventoryService.checkStock(InventoryService.java:142)",
                    "metrics": {
                        "replication_lag_seconds": 185,
                        "replica_io_wait_percent": 94.2,
                        "checkout_error_rate": 34.5,
                        "error_rate_percent": 34.5,
                    },
                    "source": "cloud-sql-metrics",
                    "region": "us-central1-b",
                },
            },
            {
                "id": "scenario-novel-auth-leak",
                "name": "Scenario 3: Novel Auth Microservice Memory Leak & JWT Panic (Unknown)",
                "description": "Demonstrates Branch C (Honest Uncertainty). An unprecedented failure signature with < 45% match score. Agent avoids hallucinating fixes and escalates to human on-call with diagnostic blueprint.",
                "expected_branch": "BRANCH_C_ESCALATE_NOVEL",
                "badge": "Branch C (Honest Uncertainty)",
                "badge_color": "amber",
                "alert": {
                    "id": f"ALT-NOVEL-{uuid.uuid4().hex[:6].upper()}",
                    "service": "auth-service-v3",
                    "environment": "production",
                    "title": "Unprecedented 502 Bad Gateway Surge with JWT Parsing Panic",
                    "error_message": "runtime error: invalid memory address or nil pointer dereference in internal/jwt/rs256.VerifySignature",
                    "stack_trace": "goroutine 18942 [running]:\nauth-service/internal/jwt.(*RS256Verifier).VerifySignature(0x0, 0xc004128000, 0x140)\n\t/src/auth-service/internal/jwt/rs256.go:189 +0x3a\nauth-service/middleware.AuthMiddleware.func1(0xc00021a000)",
                    "metrics": {
                        "http_502_rate_per_sec": 420,
                        "goroutine_count": 89400,
                        "memory_usage_mb": 3850,
                        "error_rate_percent": 28.0,
                    },
                    "source": "gcp-cloud-monitoring",
                    "region": "us-central1",
                },
            },
            {
                "id": "scenario-transient-spike",
                "name": "Scenario 4: Transient 10s CPU Spike on Batch Worker (Noise Suppression)",
                "description": "Demonstrates Branch D (Noise Suppression). A brief non-impacting worker spike that automatically self-resolves, filtering alert fatigue.",
                "expected_branch": "BRANCH_D_SUPPRESS_NOISE",
                "badge": "Branch D (Noise Filter)",
                "badge_color": "gray",
                "alert": {
                    "id": f"ALT-FLAKE-{uuid.uuid4().hex[:6].upper()}",
                    "service": "batch-worker-pool",
                    "environment": "production",
                    "title": "Transient CPU Spike on Worker Pod worker-pool-7b89f",
                    "error_message": "CPU utilization exceeded 92% threshold for 8 seconds",
                    "stack_trace": "None (metric warning)",
                    "metrics": {
                        "cpu_percent": 93.4,
                        "duration_seconds": 8,
                        "error_rate_percent": 0.0,
                        "drop_rate": 0.0,
                    },
                    "source": "prometheus-node-exporter",
                    "region": "us-central1-c",
                },
            },
            {
                "id": "scenario-webhook-secret",
                "name": "Scenario 5: Payment Gateway Webhook Signature Mismatch",
                "description": "Demonstrates Branch A (Auto-Resolve). Recognizes historical incident INC-2025-112, fetches the new rotated secret from Secret Manager and hot-reloads the deployment.",
                "expected_branch": "BRANCH_A_AUTO_RESOLVE",
                "badge": "Branch A (Auto-Healing)",
                "badge_color": "green",
                "alert": {
                    "id": f"ALT-PAY-{uuid.uuid4().hex[:6].upper()}",
                    "service": "payment-service",
                    "environment": "production",
                    "title": "Payment Gateway Webhook Secret Signature Mismatch",
                    "error_message": "HTTP 400: SignatureVerificationException: No signatures found matching expected signature for payload",
                    "stack_trace": "com.stripe.exception.SignatureVerificationException: No signatures found matching expected signature\n  at com.stripe.net.Webhook$Signature.verifyHeader(Webhook.java:188)\n  at com.internal.payment.WebhookController.handleStripe(WebhookController.java:54)",
                    "metrics": {
                        "failed_webhooks_per_min": 310,
                        "pending_orders_stuck": 145,
                        "error_rate_percent": 18.2,
                    },
                    "source": "stripe-ingress-telemetry",
                    "region": "us-central1-a",
                },
            },
        ]

    def create_alert_from_scenario(self, scenario_id: str) -> AlertEvent:
        for scen in self.get_preset_scenarios():
            if scen["id"] == scenario_id:
                raw_alert = scen["alert"].copy()
                raw_alert["id"] = f"{raw_alert['id'][:10]}-{uuid.uuid4().hex[:6].upper()}"
                raw_alert["timestamp"] = datetime.now(timezone.utc).isoformat()
                return AlertEvent(**raw_alert)

        # Default fallback scenario
        return self.create_alert_from_scenario("scenario-redis-repeat")


simulator = AlertSimulator()
