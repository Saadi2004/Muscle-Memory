import httpx
from typing import Dict, Any, Optional
from ..config import settings
from ..models.alert import AlertEvent
from ..models.decision import DecisionLogEntry, RoutingBranch


class SlackNotifier:
    def __init__(self):
        self.webhook_url = settings.slack_webhook_url

    def _get_branch_badge(self, branch: RoutingBranch) -> Dict[str, str]:
        if branch == RoutingBranch.BRANCH_A_AUTO_RESOLVE:
            return {"emoji": "🟢", "color": "#10b981", "title": "AUTO-RESOLVED (Known Low-Sev)"}
        elif branch == RoutingBranch.BRANCH_B_ESCALATE_KNOWN:
            return {"emoji": "🚨", "color": "#ef4444", "title": "CRITICAL ESCALATION (Known High-Sev + Past Fix Attached)"}
        elif branch == RoutingBranch.BRANCH_C_ESCALATE_NOVEL:
            return {"emoji": "⚠️", "color": "#f59e0b", "title": "HONEST UNCERTAINTY ESCALATION (Novel Anomaly)"}
        else:
            return {"emoji": "⚪", "color": "#6b7280", "title": "NOISE SUPPRESSED (Transient Flake)"}

    def format_slack_payload(self, entry: DecisionLogEntry) -> Dict[str, Any]:
        badge = self._get_branch_badge(entry.decision.branch)
        alert = entry.alert
        match = entry.match_result
        sev = entry.severity_assessment
        dec = entry.decision

        blocks = [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": f"{badge['emoji']} [Muscle Memory] {badge['title']}",
                    "emoji": True,
                },
            },
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": f"*Service:* `{alert.service}`"},
                    {"type": "mrkdwn", "text": f"*Severity:* *{sev.severity.value}* ({sev.blast_radius})"},
                    {"type": "mrkdwn", "text": f"*Match Score:* `{match.confidence_score * 100:.0f}%` ({match.confidence_level.value})"},
                    {"type": "mrkdwn", "text": f"*Ticket:* <{dec.remediation.ticket_url or '#'}|{dec.remediation.ticket_id or 'N/A'}>"},
                ],
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*Alert Summary:* {alert.title}\n*Error:* `{alert.error_message}`",
                },
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*Agent Reasoning:* {dec.reasoning_summary}\n*Match Rationale:* {match.match_rationale}",
                },
            },
        ]

        if dec.remediation.command_executed:
            blocks.append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*Remediation / Runbook Command:*\n```{dec.remediation.command_executed}```",
                },
            })

        return {
            "attachments": [
                {
                    "color": badge["color"],
                    "blocks": blocks,
                }
            ]
        }

    async def send_notification(self, entry: DecisionLogEntry) -> bool:
        if not self.webhook_url:
            return False

        payload = self.format_slack_payload(entry)
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.post(self.webhook_url, json=payload)
                if resp.status_code == 200:
                    print(f"[Slack] Dispatched alert notification to Slack webhook.")
                    return True
                else:
                    print(f"[Slack] Webhook returned status code {resp.status_code}: {resp.text}")
        except Exception as e:
            print(f"[Slack] Failed to send notification: {e}")

        return False


slack_service = SlackNotifier()
