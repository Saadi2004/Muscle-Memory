import json
import os
from typing import List, Optional, Dict, Any
from pathlib import Path
from ..config import settings
from ..models.incident import PastIncident
from ..models.decision import DecisionLogEntry
from ..models.alert import AlertEvent


class DatabaseService:
    def __init__(self):
        self.use_firestore = False
        self.firestore_client = None
        self.incidents: Dict[str, PastIncident] = {}
        self.decisions: List[DecisionLogEntry] = []
        self.alerts: Dict[str, AlertEvent] = {}
        self._init_backend()

    def _init_backend(self):
        # Attempt Firestore initialization if project ID / credentials are provided
        if settings.gcp_project_id:
            try:
                from google.cloud import firestore
                self.firestore_client = firestore.Client(project=settings.gcp_project_id)
                self.use_firestore = True
                print(f"[DB] Initialized Google Cloud Firestore for project: {settings.gcp_project_id}")
            except Exception as e:
                print(f"[DB] Firestore init fallback to local persistence: {e}")
                self.use_firestore = False

        # Load local storage or seed data
        self._load_local_data()

    def _load_local_data(self):
        settings.data_dir.mkdir(parents=True, exist_ok=True)
        storage_file = settings.storage_file

        if storage_file.exists():
            try:
                with open(storage_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for inc in data.get("incidents", []):
                        parsed = PastIncident(**inc)
                        self.incidents[parsed.id] = parsed
                    for dec in data.get("decisions", []):
                        self.decisions.append(DecisionLogEntry(**dec))
                    for alt in data.get("alerts", []):
                        parsed_alt = AlertEvent(**alt)
                        self.alerts[parsed_alt.id] = parsed_alt
                print(f"[DB] Loaded {len(self.incidents)} incidents and {len(self.decisions)} decisions from local store.")
                return
            except Exception as e:
                print(f"[DB] Error loading persistent storage, re-seeding: {e}")

        # Seed initial incidents from seed_incidents.json
        seed_path = settings.data_dir / "seed_incidents.json"
        if seed_path.exists():
            try:
                with open(seed_path, "r", encoding="utf-8") as f:
                    seed_data = json.load(f)
                    for inc in seed_data:
                        parsed = PastIncident(**inc)
                        self.incidents[parsed.id] = parsed
                print(f"[DB] Seeded {len(self.incidents)} initial historical incidents into memory bank.")
                self._save_local_data()
            except Exception as e:
                print(f"[DB] Error loading seed data: {e}")

    def _save_local_data(self):
        try:
            settings.data_dir.mkdir(parents=True, exist_ok=True)
            payload = {
                "incidents": [inc.model_dump() for inc in self.incidents.values()],
                "decisions": [dec.model_dump() for dec in self.decisions],
                "alerts": [alt.model_dump() for alt in self.alerts.values()],
            }
            with open(settings.storage_file, "w", encoding="utf-8") as f:
                json.dump(payload, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"[DB] Error writing persistent store: {e}")

    # --- Incidents / Memory Bank API ---
    def get_all_incidents(self) -> List[PastIncident]:
        if self.use_firestore and self.firestore_client:
            try:
                docs = self.firestore_client.collection("past_incidents").stream()
                inc_list = [PastIncident(**doc.to_dict()) for doc in docs]
                if inc_list:
                    return inc_list
            except Exception as e:
                print(f"[DB] Firestore read error: {e}")
        return list(self.incidents.values())

    def get_incident_by_id(self, incident_id: str) -> Optional[PastIncident]:
        return self.incidents.get(incident_id)

    def save_incident(self, incident: PastIncident) -> PastIncident:
        self.incidents[incident.id] = incident
        self._save_local_data()

        if self.use_firestore and self.firestore_client:
            try:
                self.firestore_client.collection("past_incidents").document(incident.id).set(incident.model_dump())
            except Exception as e:
                print(f"[DB] Firestore write error: {e}")

        return incident

    # --- Decision Log API ---
    def save_decision(self, decision_log: DecisionLogEntry) -> DecisionLogEntry:
        # Prepend so newest is first
        self.decisions.insert(0, decision_log)
        self._save_local_data()

        if self.use_firestore and self.firestore_client:
            try:
                self.firestore_client.collection("decision_logs").document(decision_log.id).set(decision_log.model_dump())
            except Exception as e:
                print(f"[DB] Firestore decision log error: {e}")

        return decision_log

    def get_decision_logs(self, limit: int = 50) -> List[DecisionLogEntry]:
        if self.use_firestore and self.firestore_client:
            try:
                docs = (
                    self.firestore_client.collection("decision_logs")
                    .order_by("timestamp", direction="DESCENDING")
                    .limit(limit)
                    .stream()
                )
                res = [DecisionLogEntry(**doc.to_dict()) for doc in docs]
                if res:
                    return res
            except Exception as e:
                print(f"[DB] Firestore get decisions error: {e}")
        return self.decisions[:limit]

    def get_decision_by_id(self, decision_id: str) -> Optional[DecisionLogEntry]:
        for d in self.decisions:
            if d.id == decision_id:
                return d
        return None

    # --- Alerts API ---
    def save_alert(self, alert: AlertEvent) -> AlertEvent:
        self.alerts[alert.id] = alert
        self._save_local_data()
        return alert

    def get_alerts(self, limit: int = 50) -> List[AlertEvent]:
        return list(self.alerts.values())[-limit:]

    # --- Stats API ---
    def get_stats(self) -> Dict[str, Any]:
        total_decisions = len(self.decisions)
        if total_decisions == 0:
            return {
                "total_triaged": 0,
                "auto_resolved_count": 0,
                "auto_resolve_rate": "0%",
                "escalated_known_count": 0,
                "escalated_novel_count": 0,
                "suppressed_count": 0,
                "avg_triage_time_ms": 0,
                "memory_bank_size": len(self.incidents),
            }

        auto_resolved = sum(1 for d in self.decisions if d.decision.branch == "BRANCH_A_AUTO_RESOLVE")
        escalated_known = sum(1 for d in self.decisions if d.decision.branch == "BRANCH_B_ESCALATE_KNOWN")
        escalated_novel = sum(1 for d in self.decisions if d.decision.branch == "BRANCH_C_ESCALATE_NOVEL")
        suppressed = sum(1 for d in self.decisions if d.decision.branch == "BRANCH_D_SUPPRESS_NOISE")
        avg_time = int(sum(d.processing_time_ms for d in self.decisions) / total_decisions)
        auto_rate = f"{(auto_resolved / total_decisions) * 100:.1f}%"

        return {
            "total_triaged": total_decisions,
            "auto_resolved_count": auto_resolved,
            "auto_resolve_rate": auto_rate,
            "escalated_known_count": escalated_known,
            "escalated_novel_count": escalated_novel,
            "suppressed_count": suppressed,
            "avg_triage_time_ms": avg_time,
            "memory_bank_size": len(self.incidents),
        }


db_service = DatabaseService()
