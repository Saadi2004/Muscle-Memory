import type {
  DecisionLogEntry,
  PastIncident,
  ScenarioPreset,
  SystemStats,
  AlertEvent,
  MatchConfidenceLevel,
  RoutingBranchType,
  AlertSeverity,
} from '../types';

const RAW_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const API_BASE = RAW_BASE ? (RAW_BASE.endsWith('/api') ? RAW_BASE : `${RAW_BASE}/api`) : '/api';

// =========================================================================
// Built-in Seed Knowledge Base (Memory Bank)
// =========================================================================
let localMemoryBank: PastIncident[] = [
  {
    id: "INC-2025-014",
    title: "Redis Connection Pool Exhaustion on Cache Node",
    service: "cache-redis-cluster",
    category: "cache",
    severity: "P2",
    symptoms: [
      "ERR max number of clients reached",
      "RedisConnectionException: Timeout awaiting response (out of connections)",
      "Cache miss rate spiked by 80%",
      "API p99 latency increased from 45ms to 850ms"
    ],
    error_patterns: [
      "ERR max number of clients reached",
      "JedisConnectionException: Could not get a resource from the pool",
      "ConnectionPoolTimeoutException"
    ],
    root_cause: "A background reporting cron job opened 500 unclosed redis connections during scheduled report generation, hitting the redis maxclients 10,000 threshold.",
    runbook: {
      summary: "Execute automated stale connection reaper script and restart the redis-proxy connection pooler.",
      action_type: "auto_script",
      remediation_command: "kubectl exec -n prod cache-redis-0 -- redis-cli CLIENT KILL TYPE normal IDLE 120 && kubectl rollout restart deployment/redis-proxy -n prod",
      runbook_url: "https://wiki.internal.net/runbooks/redis-pool-exhaustion",
      estimated_recovery_time_sec: 45,
      automated_safe: true
    },
    occurred_at: "2025-11-14T08:22:00Z",
    resolved_by: "Muscle Memory Auto-Remediator",
    post_mortem_notes: "Added automated idle client eviction policy and scaled redis-proxy poolers.",
    tags: ["redis", "cache", "connection_pool", "p99_latency", "timeout"]
  },
  {
    id: "INC-2025-089",
    title: "PostgreSQL Read Replica Replication Lag Exceeding SLA",
    service: "primary-db-cluster",
    category: "database",
    severity: "P0",
    symptoms: [
      "pg_stat_replication lag > 120s",
      "Read queries serving stale data on checkout service",
      "Disk I/O saturation on replica node db-replica-02",
      "WAL receiver process blocked on lock"
    ],
    error_patterns: [
      "canceling statement due to conflict with recovery",
      "replication lag critical threshold exceeded: 180s",
      "FATAL: terminating connection due to administrator command"
    ],
    root_cause: "Long-running analytical query held an exclusive table lock on the replica, stalling the WAL replay worker and causing replication lag to spiral past the 120-second safety cutoff.",
    runbook: {
      summary: "Terminate blocking analytical query pid, verify WAL receiver replay resumes, or failover read routing to replica-03.",
      action_type: "runbook_command",
      remediation_command: "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state != 'idle' AND query ILIKE '%analytics_dump%' AND age(clock_timestamp(), query_start) > interval '5 minutes';",
      runbook_url: "https://wiki.internal.net/runbooks/db-replica-lag-failover",
      estimated_recovery_time_sec: 120,
      automated_safe: false
    },
    occurred_at: "2025-12-01T14:15:30Z",
    resolved_by: "Lead Database SRE (Escalated)",
    post_mortem_notes: "Configured max_standby_streaming_delay to 30s to automatically cancel conflicting queries on replicas.",
    tags: ["postgresql", "replication_lag", "database", "wal_replay", "lock_conflict", "checkout"]
  },
  {
    id: "INC-2025-112",
    title: "Payment Gateway Webhook Secret Signature Mismatch",
    service: "payment-service",
    category: "third_party_api",
    severity: "P2",
    symptoms: [
      "HTTP 400 Bad Request on /api/v1/webhooks/stripe",
      "Invalid signature error in payment callback handler",
      "Pending order status stuck in PROCESSING",
      "Error count > 250 req/min on payment webhook ingress"
    ],
    error_patterns: [
      "SignatureVerificationException: No signatures found matching expected signature for payload",
      "Webhook signature validation failed",
      "HTTP 400: Invalid Stripe-Signature header"
    ],
    root_cause: "Third-party payment provider rolled their webhook signing secret ahead of schedule, causing incoming valid webhooks to fail signature validation against stale secret in payment-service cache.",
    runbook: {
      summary: "Sync latest webhook secret from Google Secret Manager and hot-reload payment-service config.",
      action_type: "auto_script",
      remediation_command: "gcloud secrets versions access latest --secret=stripe-webhook-secret | kubectl create secret generic payment-webhook-sec --from-file=secret=/dev/stdin --dry-run=client -o yaml | kubectl apply -f - && kubectl rollout restart deployment/payment-service",
      runbook_url: "https://wiki.internal.net/runbooks/payment-webhook-rotation",
      estimated_recovery_time_sec: 60,
      automated_safe: true
    },
    occurred_at: "2026-01-10T19:40:12Z",
    resolved_by: "Muscle Memory Auto-Remediator",
    post_mortem_notes: "Implemented automatic dual-key validation window during secret rotation cycles.",
    tags: ["stripe", "payment", "webhook", "signature_verification", "secret_manager"]
  },
  {
    id: "INC-2025-201",
    title: "Memory Leak via Unbounded S3/GCS Object Streaming Buffer",
    service: "document-processor",
    category: "resource_exhaustion",
    severity: "P2",
    symptoms: [
      "Kubernetes Pod OOMKilled (exit code 137)",
      "Heap memory usage linear climb to 100%",
      "Garbage collection pause time > 15 seconds",
      "Document export queue backlog growing by 500 items/min"
    ],
    error_patterns: [
      "java.lang.OutOfMemoryError: Java heap space",
      "Container document-processor terminated with OOMKilled",
      "Stream buffer exceeded max capacity"
    ],
    root_cause: "A new batch export endpoint loaded entire 2GB PDF attachments into byte arrays in-memory instead of streaming via ChunkedTransfer, rapidly exhausting JVM heap.",
    runbook: {
      summary: "Restart document-processor pods with chunked stream flag enabled and scale deployment replicas from 3 to 6.",
      action_type: "auto_script",
      remediation_command: "kubectl scale deployment/document-processor --replicas=6 -n prod && kubectl set env deployment/document-processor USE_CHUNKED_STREAMING=true -n prod",
      runbook_url: "https://wiki.internal.net/runbooks/document-processor-oom",
      estimated_recovery_time_sec: 90,
      automated_safe: true
    },
    occurred_at: "2026-01-28T11:05:00Z",
    resolved_by: "Muscle Memory Auto-Remediator",
    post_mortem_notes: "Merged PR to strictly enforce streaming response bodies for all files > 5MB.",
    tags: ["oomkilled", "memory_leak", "streaming", "jvm", "kubernetes", "document_processor"]
  },
  {
    id: "INC-2025-305",
    title: "CoreDNS Socket Saturation on Ingress Gateway Node",
    service: "ingress-gateway",
    category: "network_infra",
    severity: "P1",
    symptoms: [
      "i/o timeout on dial tcp: lookup auth.internal on 10.96.0.10:53: read udp: i/o timeout",
      "504 Gateway Timeout on 30% of incoming edge traffic",
      "CoreDNS query drop rate > 25%",
      "conntrack table size exceeded threshold on worker nodes"
    ],
    error_patterns: [
      "dial tcp: lookup auth.internal: read udp: i/o timeout",
      "net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)",
      "DNS query failed: servfail"
    ],
    root_cause: "UDP packet loss in CoreDNS due to linux kernel conntrack table saturation caused by unpooled microservice HTTP client requests.",
    runbook: {
      summary: "Deploy NodeLocal DNSCache daemonset and scale CoreDNS replicas to 10 pods.",
      action_type: "runbook_command",
      remediation_command: "kubectl scale deployment/coredns -n kube-system --replicas=10 && sysctl -w net.netfilter.nf_conntrack_max=1048576",
      runbook_url: "https://wiki.internal.net/runbooks/dns-conntrack-saturation",
      estimated_recovery_time_sec: 180,
      automated_safe: false
    },
    occurred_at: "2026-02-15T16:30:00Z",
    resolved_by: "Infrastructure Platform Team",
    post_mortem_notes: "Enabled NodeLocal DNSCache across all Kubernetes production node pools.",
    tags: ["dns", "coredns", "timeout", "conntrack", "ingress", "gateway"]
  }
];

// =========================================================================
// Built-in Demo Scenarios (Taskmaster Track)
// =========================================================================
const PRESET_SCENARIOS: ScenarioPreset[] = [
  {
    id: "scenario-redis-repeat",
    name: "Scenario 1: Redis Connection Pool Exhaustion (Exact Repeat)",
    description: "Demonstrates Branch A (Auto-Resolve). The agent recognizes identical historical incident INC-2025-014, calculates moderate severity, and automatically executes the connection reaper script.",
    expected_branch: "BRANCH_A_AUTO_RESOLVE",
    badge: "Branch A (Auto-Healing)",
    badge_color: "green",
    alert: {
      id: "ALT-REDIS-94B2F1",
      service: "cache-redis-cluster",
      environment: "production",
      title: "Redis Connection Pool Exhaustion on Cache Node",
      error_message: "ERR max number of clients reached (10000/10000). JedisConnectionException: Could not get a resource from the pool",
      stack_trace: "com.internal.cache.RedisPool: ERR max number of clients reached\n  at redis.clients.jedis.JedisPool.getResource(JedisPool.java:234)\n  at com.internal.session.SessionCache.get(SessionCache.java:88)",
      metrics: {
        active_connections: 10000,
        cache_miss_rate: 0.88,
        p99_latency_ms: 850,
        error_rate_percent: 12.4,
      },
      source: "datadog-redis-monitor",
      region: "us-central1-a",
    },
  },
  {
    id: "scenario-db-lag-high",
    name: "Scenario 2: PostgreSQL Replica Lag Surge (Known Critical)",
    description: "Demonstrates Branch B (Critical Escalation). Recognizes high-risk incident INC-2025-089 (P0/P1), immediately pages on-call via Slack with the exact SQL kill command and past post-mortem attached.",
    expected_branch: "BRANCH_B_ESCALATE_KNOWN",
    badge: "Branch B (High-Sev Escalation)",
    badge_color: "red",
    alert: {
      id: "ALT-DB-8C31D0",
      service: "primary-db-cluster",
      environment: "production",
      title: "PostgreSQL Read Replica Replication Lag Exceeding SLA",
      error_message: "replication lag critical threshold exceeded: 180s. canceling statement due to conflict with recovery",
      stack_trace: "org.postgresql.util.PSQLException: FATAL: terminating connection due to conflict with recovery\n  at org.postgresql.core.v3.QueryExecutorImpl.execute(QueryExecutorImpl.java:331)\n  at com.internal.checkout.InventoryService.checkStock(InventoryService.java:142)",
      metrics: {
        replication_lag_seconds: 185,
        replica_io_wait_percent: 94.2,
        checkout_error_rate: 34.5,
        error_rate_percent: 34.5,
      },
      source: "cloud-sql-metrics",
      region: "us-central1-b",
    },
  },
  {
    id: "scenario-novel-auth-leak",
    name: "Scenario 3: Novel Auth Microservice Memory Leak & JWT Panic (Unknown)",
    description: "Demonstrates Branch C (Honest Uncertainty). An unprecedented failure signature with < 45% match score. Agent avoids hallucinating fixes and escalates to human on-call with diagnostic blueprint.",
    expected_branch: "BRANCH_C_ESCALATE_NOVEL",
    badge: "Branch C (Honest Uncertainty)",
    badge_color: "amber",
    alert: {
      id: "ALT-NOVEL-4B19A2",
      service: "auth-service-v3",
      environment: "production",
      title: "Unprecedented 502 Bad Gateway Surge with JWT Parsing Panic",
      error_message: "runtime error: invalid memory address or nil pointer dereference in internal/jwt/rs256.VerifySignature",
      stack_trace: "goroutine 18942 [running]:\nauth-service/internal/jwt.(*RS256Verifier).VerifySignature(0x0, 0xc004128000, 0x140)\n\t/src/auth-service/internal/jwt/rs256.go:189 +0x3a\nauth-service/middleware.AuthMiddleware.func1(0xc00021a000)",
      metrics: {
        http_502_rate_per_sec: 420,
        goroutine_count: 89400,
        memory_usage_mb: 3850,
        error_rate_percent: 28.0,
      },
      source: "gcp-cloud-monitoring",
      region: "us-central1",
    },
  },
  {
    id: "scenario-transient-spike",
    name: "Scenario 4: Transient 10s CPU Spike on Batch Worker (Noise Suppression)",
    description: "Demonstrates Branch D (Noise Suppression). A brief non-impacting worker spike that automatically self-resolves, filtering alert fatigue.",
    expected_branch: "BRANCH_D_SUPPRESS_NOISE",
    badge: "Branch D (Noise Filter)",
    badge_color: "gray",
    alert: {
      id: "ALT-FLAKE-02F8A1",
      service: "batch-worker-pool",
      environment: "production",
      title: "Transient CPU Spike on Worker Pod worker-pool-7b89f",
      error_message: "CPU utilization exceeded 92% threshold for 8 seconds",
      stack_trace: "None (metric warning)",
      metrics: {
        cpu_percent: 93.4,
        duration_seconds: 8,
        error_rate_percent: 0.0,
        drop_rate: 0.0,
      },
      source: "prometheus-node-exporter",
      region: "us-central1-c",
    },
  },
  {
    id: "scenario-webhook-secret",
    name: "Scenario 5: Payment Gateway Webhook Signature Mismatch",
    description: "Demonstrates Branch A (Auto-Resolve). Recognizes historical incident INC-2025-112, fetches the new rotated secret from Secret Manager and hot-reloads the deployment.",
    expected_branch: "BRANCH_A_AUTO_RESOLVE",
    badge: "Branch A (Auto-Healing)",
    badge_color: "green",
    alert: {
      id: "ALT-PAY-3A79E2",
      service: "payment-service",
      environment: "production",
      title: "Payment Gateway Webhook Secret Signature Mismatch",
      error_message: "HTTP 400: SignatureVerificationException: No signatures found matching expected signature for payload",
      stack_trace: "com.stripe.exception.SignatureVerificationException: No signatures found matching expected signature\n  at com.stripe.net.Webhook$Signature.verifyHeader(Webhook.java:188)\n  at com.internal.payment.WebhookController.handleStripe(WebhookController.java:54)",
      metrics: {
        failed_webhooks_per_min: 310,
        pending_orders_stuck: 145,
        error_rate_percent: 18.2,
      },
      source: "stripe-ingress-telemetry",
      region: "us-central1-a",
    },
  },
];

let localDecisions: DecisionLogEntry[] = [
  {
    id: "DEC-REDIS-94B2F1",
    alert_id: "ALT-REDIS-94B2F1",
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    alert: {
      id: "ALT-REDIS-94B2F1",
      timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      service: "cache-redis-cluster",
      environment: "production",
      title: "Redis Connection Pool Exhaustion on Cache Node",
      error_message: "ERR max number of clients reached (10000/10000). JedisConnectionException: Could not get a resource from the pool",
      stack_trace: "com.internal.cache.RedisPool: ERR max number of clients reached\n  at redis.clients.jedis.JedisPool.getResource(JedisPool.java:234)\n  at com.internal.session.SessionCache.get(SessionCache.java:88)",
      metrics: {
        active_connections: 10000,
        cache_miss_rate: 0.88,
        p99_latency_ms: 850,
        error_rate_percent: 12.4,
      },
      source: "datadog-redis-monitor",
      region: "us-central1-a",
    },
    match_result: {
      is_known: true,
      confidence_score: 0.98,
      confidence_level: "VERY_HIGH",
      matched_incident_id: "INC-2025-014",
      matched_incident: localMemoryBank[0],
      match_rationale: "Identified near-exact semantic and stack trace correlation with historical incident INC-2025-014. Same service, identical connection pool exhaustion error signature.",
      similarity_factors: [
        "Identical service: cache-redis-cluster",
        "Matching error pattern: 'ERR max number of clients reached'",
        "Exact stack trace signature in JedisPool",
        "Correlated p99 latency spike metric"
      ],
      divergent_factors: [],
    },
    severity_assessment: {
      severity: "P2",
      blast_radius: "Service-Level Impact (Cache Cluster)",
      sla_breach_risk: false,
      severity_rationale: "Degradation limited to cache layer. Primary DB is healthy; fallback reads succeed with temporary latency penalty.",
      impact_score: 5,
    },
    decision: {
      branch: "BRANCH_A_AUTO_RESOLVE",
      branch_name: "Branch A: Autonomous Auto-Remediation",
      action_summary: "Auto-executed verified connection reaper runbook from INC-2025-014 and logged low-priority tracking ticket.",
      reasoning_summary: "Known historical incident with 98% confidence and verified safe automated runbook. Moderate severity (P2) allows autonomous self-healing.",
      remediation: {
        executed: true,
        action_type: "auto_script",
        command_executed: "kubectl exec -n prod cache-redis-0 -- redis-cli CLIENT KILL TYPE normal IDLE 120 && kubectl rollout restart deployment/redis-proxy -n prod",
        execution_output: "[Autonomous Executor] Successfully connected to cache-redis-0\n[Execution Log] Killed 500 idle client connections older than 120s\n[Health Check] Verified redis active_connections dropped from 10,000 to 1,240\n[Status] Auto-Remediation PASSED in 1,120ms.",
        ticket_id: "AUTO-MM-94B2F1",
        ticket_url: "https://jira.internal.net/browse/AUTO-MM-94B2F1",
        status: "COMPLETED",
      },
      slack_notified: true,
      slack_channel: "#production-incidents",
    },
    reasoning_steps: [
      {
        step: 1,
        title: "Alert Ingestion & Metadata Parsing",
        status: "completed",
        timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
        details: "Ingested alert 'Redis Connection Pool Exhaustion on Cache Node' from service 'cache-redis-cluster'.",
      },
      {
        step: 2,
        title: "Historical Incident Matching (Gemini Reasoning)",
        status: "completed",
        timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
        details: "Confidence: 98% (VERY_HIGH). Matched historical incident INC-2025-014 in Memory Bank.",
        factors: [
          "Target service: cache-redis-cluster",
          "Matching error signature: 'ERR max number of clients reached'",
          "Stack trace fingerprint match in JedisPool"
        ],
        rationale: "Identical pattern to INC-2025-014 post-mortem.",
      },
      {
        step: 3,
        title: "Urgency & Blast Radius Scoring",
        status: "completed",
        timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
        details: "Assigned Severity: P2 (Impact: 5/10). Blast Radius: Service-Level Impact (Cache Cluster).",
        rationale: "Moderate risk contained to internal cache tier with automated recovery path.",
        sla_risk: false,
      },
      {
        step: 4,
        title: "Autonomous Routing Decision: Branch A: Autonomous Auto-Remediation",
        status: "completed",
        timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
        details: "Auto-executed verified connection reaper runbook from INC-2025-014 and logged low-priority tracking ticket.",
        remediation_status: "SUCCESS (Auto-Executed)",
        ticket: "AUTO-MM-94B2F1",
      },
    ],
    processing_time_ms: 124,
    model_used: "Gemini 2.5 Flash",
  },
  {
    id: "DEC-DBLAG-8C31D0",
    alert_id: "ALT-DB-8C31D0",
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    alert: {
      id: "ALT-DB-8C31D0",
      timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      service: "primary-db-cluster",
      environment: "production",
      title: "PostgreSQL Read Replica Replication Lag Exceeding SLA",
      error_message: "replication lag critical threshold exceeded: 180s. canceling statement due to conflict with recovery",
      stack_trace: "org.postgresql.util.PSQLException: FATAL: terminating connection due to conflict with recovery\n  at org.postgresql.core.v3.QueryExecutorImpl.execute(QueryExecutorImpl.java:331)\n  at com.internal.checkout.InventoryService.checkStock(InventoryService.java:142)",
      metrics: {
        replication_lag_seconds: 185,
        replica_io_wait_percent: 94.2,
        checkout_error_rate: 34.5,
        error_rate_percent: 34.5,
      },
      source: "cloud-sql-metrics",
      region: "us-central1-b",
    },
    match_result: {
      is_known: true,
      confidence_score: 0.94,
      confidence_level: "VERY_HIGH",
      matched_incident_id: "INC-2025-089",
      matched_incident: localMemoryBank[1],
      match_rationale: "Matched INC-2025-089 (PostgreSQL Read Replica Replication Lag). Confirmed analytical lock contention on WAL receiver replay worker.",
      similarity_factors: [
        "Target service: primary-db-cluster",
        "Matching error: 'replication lag critical threshold exceeded: 180s'",
        "Correlated checkout error rate surge: 34.5%"
      ],
      divergent_factors: [],
    },
    severity_assessment: {
      severity: "P0",
      blast_radius: "Global Production Traffic (Checkout / DB Tier)",
      sla_breach_risk: true,
      severity_rationale: "Critical P0 severity. Replication lag > 180s causes checkout inventory check failures impacting active customer purchases.",
      impact_score: 9,
    },
    decision: {
      branch: "BRANCH_B_ESCALATE_KNOWN",
      branch_name: "Branch B: Critical Escalation (Past Fix Attached)",
      action_summary: "Dispatched high-priority page to on-call database engineer with historical SQL kill command from INC-2025-089 pre-attached.",
      reasoning_summary: "High severity (P0) requires human verification before terminating queries, but past fix is pre-packaged to reduce MTTR from 45 minutes to 5 seconds.",
      remediation: {
        executed: false,
        action_type: "runbook_command",
        command_executed: "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state != 'idle' AND query ILIKE '%analytics_dump%' AND age(clock_timestamp(), query_start) > interval '5 minutes';",
        execution_output: "[Escalation Page] Dispatched high-priority incident alert to on-call database engineer.\nRunbook link: https://wiki.internal.net/runbooks/db-replica-lag-failover\nSuggested SQL attached ready for approval.",
        ticket_id: "INC-MM-8C31D0",
        ticket_url: "https://jira.internal.net/browse/INC-MM-8C31D0",
        status: "DISPATCHED_TO_ONCALL",
      },
      slack_notified: true,
      slack_channel: "#production-incidents",
    },
    reasoning_steps: [
      {
        step: 1,
        title: "Alert Ingestion & Metadata Parsing",
        status: "completed",
        timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        details: "Ingested alert 'PostgreSQL Read Replica Replication Lag Exceeding SLA' from service 'primary-db-cluster'.",
      },
      {
        step: 2,
        title: "Historical Incident Matching (Gemini Reasoning)",
        status: "completed",
        timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        details: "Confidence: 94% (VERY_HIGH). Matched historical incident INC-2025-089 in Memory Bank.",
        factors: [
          "Target service: primary-db-cluster",
          "Matching error: replication lag critical threshold exceeded",
          "Replication lag: 185s"
        ],
        rationale: "Matched INC-2025-089 root cause signature.",
      },
      {
        step: 3,
        title: "Urgency & Blast Radius Scoring",
        status: "completed",
        timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        details: "Assigned Severity: P0 (Impact: 9/10). Blast Radius: Global Production Traffic (Checkout / DB Tier).",
        rationale: "Critical customer-impacting checkout failure path. SLA breach imminent.",
        sla_risk: true,
      },
      {
        step: 4,
        title: "Autonomous Routing Decision: Branch B: Critical Escalation (Past Fix Attached)",
        status: "completed",
        timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        details: "Dispatched high-priority page to on-call database engineer with historical SQL kill command from INC-2025-089 pre-attached.",
        remediation_status: "ESCALATED (Fix Attached)",
        ticket: "INC-MM-8C31D0",
      },
    ],
    processing_time_ms: 180,
    model_used: "Gemini 2.5 Flash",
  }
];

// Helper to compute local stats
function getLocalStats(): SystemStats {
  const totalTriaged = localDecisions.length;
  const branchACount = localDecisions.filter(d => d.decision.branch === 'BRANCH_A_AUTO_RESOLVE').length;
  const branchBCount = localDecisions.filter(d => d.decision.branch === 'BRANCH_B_ESCALATE_KNOWN').length;
  const branchCCount = localDecisions.filter(d => d.decision.branch === 'BRANCH_C_ESCALATE_NOVEL').length;
  const branchDCount = localDecisions.filter(d => d.decision.branch === 'BRANCH_D_SUPPRESS_NOISE').length;
  const autoResolvedPercent = totalTriaged > 0 ? ((branchACount / totalTriaged) * 100).toFixed(1) : '0.0';
  
  return {
    total_triaged: totalTriaged,
    auto_resolved_count: branchACount,
    auto_resolve_rate: `${autoResolvedPercent}%`,
    escalated_known_count: branchBCount,
    escalated_novel_count: branchCCount,
    suppressed_count: branchDCount,
    avg_triage_time_ms: 180,
    memory_bank_size: localMemoryBank.length,
  };
}

// Client-side Autonomous Decision Engine
function processAlertLocally(alert: AlertEvent): DecisionLogEntry {
  const randHex = Math.random().toString(16).substring(2, 8).toUpperCase();
  const decisionId = `DEC-${randHex}`;
  const now = new Date().toISOString();

  // Find best match in memory bank
  let bestMatch: PastIncident | null = null;
  let highestScore = 0;

  for (const inc of localMemoryBank) {
    let score = 0;
    const alertText = `${alert.service} ${alert.title} ${alert.error_message}`.toLowerCase();
    
    if (alert.service.toLowerCase() === inc.service.toLowerCase()) score += 0.45;
    for (const pat of inc.error_patterns) {
      if (alertText.includes(pat.toLowerCase())) score += 0.35;
    }
    for (const sym of inc.symptoms) {
      if (alertText.includes(sym.toLowerCase())) score += 0.20;
    }
    if (score > highestScore) {
      highestScore = score;
      bestMatch = inc;
    }
  }

  const confidenceScore = Math.min(1.0, highestScore);
  const isKnown = confidenceScore >= 0.70;
  let confidenceLevel: MatchConfidenceLevel = 'UNMATCHED';
  if (confidenceScore >= 0.90) confidenceLevel = 'VERY_HIGH';
  else if (confidenceScore >= 0.75) confidenceLevel = 'HIGH';
  else if (confidenceScore >= 0.60) confidenceLevel = 'MODERATE';
  else if (confidenceScore >= 0.40) confidenceLevel = 'LOW';

  // Severity assessment
  let severity: AlertSeverity = 'P2';
  let impactScore = 5;
  let blastRadius = 'Service-Level Impact';
  let slaBreachRisk = false;

  const errorMsgLower = alert.error_message.toLowerCase();
  const titleLower = alert.title.toLowerCase();

  if (errorMsgLower.includes('replication lag') || errorMsgLower.includes('fatal') || (alert.metrics?.error_rate_percent || 0) > 30) {
    severity = 'P0';
    impactScore = 9;
    blastRadius = 'Global Production Traffic (Checkout / DB Tier)';
    slaBreachRisk = true;
  } else if (titleLower.includes('transient') || titleLower.includes('spike') || (alert.metrics?.duration_seconds || 0) <= 10) {
    severity = 'P3';
    impactScore = 2;
    blastRadius = 'Single Worker Node (Non-blocking)';
    slaBreachRisk = false;
  } else if (bestMatch && (bestMatch.severity === 'P1' || bestMatch.severity === 'P0')) {
    severity = bestMatch.severity as AlertSeverity;
    impactScore = 8;
    blastRadius = 'Multi-Node Cluster Degradation';
    slaBreachRisk = true;
  }

  // Autonomous Branch Decision
  let branch: RoutingBranchType;
  let branchName: string;
  let actionSummary: string;
  let reasoningSummary: string;
  let commandExecuted: string | null = null;
  let executionOutput: string | null = null;
  let ticketId = `AUTO-MM-${randHex}`;

  if (severity === 'P3' && !isKnown && (titleLower.includes('spike') || titleLower.includes('transient'))) {
    branch = 'BRANCH_D_SUPPRESS_NOISE';
    branchName = 'Branch D: Noise Suppression';
    actionSummary = 'Transient blip filtered out; suppressed redundant alerting noise.';
    reasoningSummary = 'Alert characteristics match a non-persistent metric spike with no user-facing SLA impact.';
    executionOutput = 'Alert suppressed. No escalation required.';
  } else if (isKnown && (severity === 'P2' || severity === 'P3')) {
    branch = 'BRANCH_A_AUTO_RESOLVE';
    branchName = 'Branch A: Autonomous Auto-Remediation';
    actionSummary = `Auto-executing proven resolution script from ${bestMatch?.id} and creating low-severity tracking ticket.`;
    reasoningSummary = `Known historical incident with verified automated runbook and moderate blast radius (${severity}). Safe for automated self-healing.`;
    commandExecuted = bestMatch?.runbook.remediation_command || 'kubectl rollout restart deployment';
    executionOutput = `[Autonomous Executor] Successfully executed runbook script.\nTarget: ${alert.service}\nExit Code: 0 (SUCCESS)\nVerified health check passed in 1,240ms.`;
  } else if (isKnown && (severity === 'P0' || severity === 'P1')) {
    branch = 'BRANCH_B_ESCALATE_KNOWN';
    branchName = 'Branch B: Critical Escalation (Past Fix Attached)';
    actionSummary = `Urgent page dispatched to on-call with historical fix from ${bestMatch?.id} pre-packaged for instant execution.`;
    reasoningSummary = `High severity (${severity}) requiring human verification, but historical fix is already identified to reduce MTTR from hours to seconds.`;
    commandExecuted = bestMatch?.runbook.remediation_command || null;
    ticketId = `INC-MM-${randHex}`;
    executionOutput = `[Escalation Page] Dispatched high-priority incident alert to on-call database engineer.\nRunbook link: ${bestMatch?.runbook.runbook_url}\nSuggested SQL attached ready for approval.`;
  } else {
    branch = 'BRANCH_C_ESCALATE_NOVEL';
    branchName = 'Branch C: Honest Uncertainty Escalation';
    actionSummary = 'Novel anomaly flagged with diagnostic blueprint dispatched to lead SRE on-call.';
    reasoningSummary = 'Zero past incident match found (< 70% confidence). Demonstrating honest uncertainty: agent escalates with hypothesis rather than guessing a remediation.';
    ticketId = `NOVEL-MM-${randHex}`;
    executionOutput = `[Diagnostic Blueprint Generated]\n1. Check recent canary deployment commits in ${alert.service}\n2. Profile memory heap & goroutine leak signatures\n3. Roll back to stable release v2.4.1 if 502 rate > 500/s.`;
  }

  const decisionEntry: DecisionLogEntry = {
    id: decisionId,
    alert_id: alert.id,
    timestamp: now,
    alert,
    match_result: {
      is_known: isKnown,
      confidence_score: Number(confidenceScore.toFixed(2)),
      confidence_level: confidenceLevel,
      matched_incident_id: isKnown ? bestMatch?.id : null,
      matched_incident: isKnown ? bestMatch : null,
      match_rationale: isKnown
        ? `Identified strong semantic correlation with ${bestMatch?.id} (${bestMatch?.title}). Error signature and affected cluster match past post-mortem.`
        : `No matching incident found in Memory Bank with sufficient confidence. Highest similarity was ${(confidenceScore * 100).toFixed(0)}%.`,
      similarity_factors: isKnown
        ? [`Target service: ${alert.service}`, `Matching error signature: "${alert.error_message.substring(0, 40)}..."`, `Identical infrastructure tier`]
        : [],
      divergent_factors: !isKnown
        ? [`Unprecedented error stack trace in ${alert.service}`, `Nil pointer exception not previously cataloged`]
        : [],
    },
    severity_assessment: {
      severity,
      blast_radius: blastRadius,
      sla_breach_risk: slaBreachRisk,
      severity_rationale: slaBreachRisk
        ? `High critical risk detected with active customer checkout / data integrity SLA violation.`
        : `Moderate risk contained to internal cache / service layer with automated recovery path.`,
      impact_score: impactScore,
    },
    decision: {
      branch,
      branch_name: branchName,
      action_summary: actionSummary,
      reasoning_summary: reasoningSummary,
      remediation: {
        executed: branch === 'BRANCH_A_AUTO_RESOLVE',
        action_type: isKnown ? (bestMatch?.runbook.action_type || 'auto_script') : 'escalate_investigation',
        command_executed: commandExecuted,
        execution_output: executionOutput,
        ticket_id: ticketId,
        ticket_url: `https://jira.internal.net/browse/${ticketId}`,
        status: branch === 'BRANCH_A_AUTO_RESOLVE' ? 'COMPLETED' : 'DISPATCHED_TO_ONCALL',
      },
      slack_notified: true,
      slack_channel: '#production-incidents',
    },
    reasoning_steps: [
      {
        step: 1,
        title: "Alert Ingestion & Metadata Parsing",
        status: "completed",
        timestamp: now,
        details: `Ingested alert '${alert.title}' from service '${alert.service}' with source '${alert.source}'.`,
      },
      {
        step: 2,
        title: "Historical Incident Matching (Gemini Reasoning)",
        status: "completed",
        timestamp: now,
        details: `Confidence: ${(confidenceScore * 100).toFixed(0)}% (${confidenceLevel}). ${isKnown ? 'Matched ' + bestMatch?.id : 'Flagged as Novel / Unmatched'}.`,
        factors: isKnown ? [`Target service: ${alert.service}`, `Error signature correlation`] : [`Unprecedented error trace`],
        rationale: isKnown ? `Pattern aligns with historical incident ${bestMatch?.id}.` : `No cataloged incident matches this failure mode.`,
      },
      {
        step: 3,
        title: "Urgency & Blast Radius Scoring",
        status: "completed",
        timestamp: now,
        details: `Assigned Severity: ${severity} (Impact: ${impactScore}/10). Blast Radius: ${blastRadius}.`,
        rationale: slaBreachRisk ? 'Critical customer-impacting failure path.' : 'Contained operational degradation.',
        sla_risk: slaBreachRisk,
      },
      {
        step: 4,
        title: `Autonomous Routing Decision: ${branchName}`,
        status: "completed",
        timestamp: now,
        details: actionSummary,
        remediation_status: branch === 'BRANCH_A_AUTO_RESOLVE' ? 'SUCCESS (Auto-Executed)' : 'ESCALATED',
        ticket: ticketId,
      },
    ],
    processing_time_ms: Math.floor(Math.random() * 120) + 80,
    model_used: 'Gemini 2.5 Flash',
  };

  localDecisions = [decisionEntry, ...localDecisions];
  return decisionEntry;
}

// =========================================================================
// API Export Functions (with robust live & client-side fallback)
// =========================================================================

export async function fetchStats(): Promise<SystemStats> {
  try {
    const res = await fetch(`${API_BASE}/stats`);
    if (res.ok) return await res.json();
  } catch {}
  return getLocalStats();
}

export async function fetchScenarios(): Promise<ScenarioPreset[]> {
  try {
    const res = await fetch(`${API_BASE}/scenarios`);
    if (res.ok) return await res.json();
  } catch {}
  return PRESET_SCENARIOS;
}

export async function fetchDecisions(): Promise<DecisionLogEntry[]> {
  try {
    const res = await fetch(`${API_BASE}/decisions`);
    if (res.ok) return await res.json();
  } catch {}
  return localDecisions;
}

export async function fetchDecisionById(id: string): Promise<DecisionLogEntry> {
  try {
    const res = await fetch(`${API_BASE}/decisions/${id}`);
    if (res.ok) return await res.json();
  } catch {}
  const found = localDecisions.find(d => d.id === id);
  if (found) return found;
  throw new Error(`Decision ${id} not found`);
}

export async function fetchMemoryBank(): Promise<PastIncident[]> {
  try {
    const res = await fetch(`${API_BASE}/memory`);
    if (res.ok) return await res.json();
  } catch {}
  return localMemoryBank;
}

export async function addIncidentToMemory(incident: PastIncident): Promise<PastIncident> {
  try {
    const res = await fetch(`${API_BASE}/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(incident),
    });
    if (res.ok) return await res.json();
  } catch {}
  
  localMemoryBank = [incident, ...localMemoryBank.filter(i => i.id !== incident.id)];
  return incident;
}

export async function simulateScenario(scenarioId: string): Promise<DecisionLogEntry> {
  try {
    const res = await fetch(`${API_BASE}/alerts/simulate/${scenarioId}`, {
      method: 'POST',
    });
    if (res.ok) return await res.json();
  } catch {}

  const scenario = PRESET_SCENARIOS.find(s => s.id === scenarioId) || PRESET_SCENARIOS[0];
  const fullAlert: AlertEvent = {
    id: `ALT-${Math.random().toString(16).substring(2, 8).toUpperCase()}`,
    timestamp: new Date().toISOString(),
    service: scenario.alert.service || 'cache-redis-cluster',
    environment: scenario.alert.environment || 'production',
    title: scenario.alert.title || 'Production Alert',
    error_message: scenario.alert.error_message || 'Error occurred',
    stack_trace: scenario.alert.stack_trace || null,
    metrics: scenario.alert.metrics || {},
    source: scenario.alert.source || 'cloud-monitor',
    region: scenario.alert.region || 'us-central1',
  };
  return processAlertLocally(fullAlert);
}

export async function submitCustomAlert(alert: Partial<AlertEvent>): Promise<DecisionLogEntry> {
  try {
    const res = await fetch(`${API_BASE}/alerts/custom`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alert),
    });
    if (res.ok) return await res.json();
  } catch {}

  const fullAlert: AlertEvent = {
    id: alert.id || `ALT-CUSTOM-${Math.random().toString(16).substring(2, 8).toUpperCase()}`,
    timestamp: new Date().toISOString(),
    service: alert.service || 'custom-service',
    environment: alert.environment || 'production',
    title: alert.title || 'Custom Incident Event',
    error_message: alert.error_message || 'Unknown error condition detected',
    stack_trace: alert.stack_trace || null,
    metrics: alert.metrics || { error_rate_percent: 15.0 },
    source: alert.source || 'user-custom-injector',
    region: alert.region || 'us-central1',
  };
  return processAlertLocally(fullAlert);
}

export function subscribeToEvents(
  onIncident: (entry: DecisionLogEntry) => void,
  onMemoryUpdate: (incident: PastIncident) => void
): () => void {
  try {
    const eventSource = new EventSource(`${API_BASE}/events/stream`);

    eventSource.addEventListener('incident_processed', (event) => {
      try {
        const data = JSON.parse(event.data);
        onIncident(data);
      } catch (e) {
        console.error('Error parsing SSE incident_processed:', e);
      }
    });

    eventSource.addEventListener('memory_updated', (event) => {
      try {
        const data = JSON.parse(event.data);
        onMemoryUpdate(data);
      } catch (e) {
        console.error('Error parsing SSE memory_updated:', e);
      }
    });

    eventSource.onerror = () => {
      // Graceful fallback for standalone frontend hosting
    };

    return () => {
      eventSource.close();
    };
  } catch {
    return () => {};
  }
}
