# 📘 Muscle Memory — Complete Project Guide & Documentation

---

## 🔗 Project Links
* 💻 **GitHub Source Code**: [https://github.com/Saadi2004/Muscle-Memory](https://github.com/Saadi2004/Muscle-Memory)
* 🌐 **Live Command Center**: `http://localhost:5173` (or Cloud Run instance)
* 📖 **README & Architecture**: [`README.md`](./README.md)

---

## 1. What is Muscle Memory? (In Plain English)

Imagine you are a Site Reliability Engineer (SRE) or DevOps engineer on call at 3:00 AM. 
A server alert suddenly goes off: **"Redis connection pool exhausted on cache cluster"**.

In a normal company, here is what happens:
1. A human gets woken up by a loud alert on their phone.
2. The engineer sits at their laptop, rubbing their eyes, and asks: *"Has this happened before? Did someone fix this last month? Where is that runbook doc?"*
3. They spend 20–45 minutes searching Slack, Notion, Jira, or Git history for the past fix.
4. They find the command, copy-paste it, and resolve the issue.

### The Muscle Memory Solution:
**Muscle Memory** is an **autonomous AI coordinator agent** that acts like a senior engineer who has worked at the company for 10 years and remembers every single incident that ever happened.

The moment a monitoring alert fires:
1. **It searches its Memory Bank** to see if this exact problem (or a similar one) has occurred before.
2. **It calculates how dangerous it is (Severity)**: Is the whole website down (P0), or is it just a minor background glitch (P2/P3)?
3. **It makes an autonomous decision (The 3 Branches)**:
   - **Branch A (Known issue + Low/Medium Danger)**: The agent *automatically runs the fix* (e.g., restarts the connection pool), logs a ticket, and sends a calm notification to Slack. No human had to wake up.
   - **Branch B (Known issue + High/Critical Danger)**: Because it's critical (e.g., database replica lag), it pages the human on-call, but **attaches the past post-mortem and the exact SQL command ready to run**. What used to take 45 minutes now takes 5 seconds.
   - **Branch C (Unknown / Brand New Anomaly)**: If the agent has never seen this error before, it **honestly admits it doesn't know**. Instead of guessing or making up a fake fix (hallucinating), it generates a diagnostic investigation checklist and escalates to the lead engineer.
   - **Branch D (Transient Blip)**: If CPU spiked for just 8 seconds and returned to normal, it suppresses the noise so engineers don't get alert fatigue.
4. **The Learning Loop**: Once humans resolve a new problem from Branch C, they can click one button to "Teach Muscle Memory," so the agent will automatically recognize it next time.

---

## 2. What We Have Built So Far

We have created the full-stack system from scratch:

```
Muscle memory/
├── backend/                        # Python FastAPI Backend
│   ├── app/
│   │   ├── config.py               # Environment variables & settings
│   │   ├── main.py                 # FastAPI server, REST routes & SSE real-time stream
│   │   ├── models/                 # Pydantic data schemas (Alerts, Incidents, Decisions)
│   │   │   ├── alert.py
│   │   │   ├── incident.py
│   │   │   └── decision.py
│   │   ├── services/               # Core intelligence & routing services
│   │   │   ├── gemini_client.py    # Google GenAI Gemini 2.5 Flash client + offline engine
│   │   │   ├── incident_matcher.py # Similarity matcher with confidence scores (0-100%)
│   │   │   ├── severity_scorer.py  # Blast radius & SLA risk evaluator (P0, P1, P2, P3)
│   │   │   ├── router.py           # 3-way autonomous decision & branching orchestrator
│   │   │   ├── remediation.py      # Automated script executor & ticket generator
│   │   │   ├── firestore_service.py# Google Cloud Firestore + local JSON persistence
│   │   │   └── slack_notifier.py   # Slack Block Kit webhook notification builder
│   │   ├── data/
│   │   │   └── seed_incidents.json # 5 historical incidents in the Memory Bank
│   │   └── simulator/
│   │       └── alert_generator.py  # 5 pre-built demo scenarios + custom alert generator
│   ├── tests/
│   │   └── test_router.py          # Pytest suite (6/6 passing automated tests)
│   ├── Dockerfile                  # Cloud Run deployment container config
│   └── requirements.txt            # Python dependencies
├── frontend/                       # React 19 + TypeScript + Vite + Tailwind CSS v4
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.tsx          # Top navigation, status lights & tab switcher
│   │   │   ├── StatsOverview.tsx   # KPI cards (Total Triaged, Auto-Resolved, etc.)
│   │   │   ├── AlertSimulator.tsx  # 1-click scenario trigger buttons
│   │   │   ├── IncidentFeed.tsx    # Real-time incoming incident feed
│   │   │   ├── ReasoningTrace.tsx  # Step-by-step Gemini thought visualizer
│   │   │   ├── MemoryBank.tsx      # Knowledge base browser & search
│   │   │   ├── SlackPreviewModal.tsx # Slack notification preview
│   │   │   ├── CustomAlertModal.tsx# Custom alert injector form
│   │   │   └── AddIncidentModal.tsx# "Teach Muscle Memory" incident trainer
│   │   ├── services/
│   │   │   └── api.ts              # API client & Server-Sent Events (SSE) listener
│   │   ├── types/
│   │   │   └── index.ts            # TypeScript interfaces
│   │   ├── App.tsx                 # Main layout & state coordinator
│   │   └── index.css               # Modern dark theme styles & animations
│   ├── package.json
│   └── vite.config.ts
├── scripts/
│   └── seed_db.py                  # Database verification and seeding script
├── run_backend.bat                 # 1-click backend runner
├── run_frontend.bat                # 1-click frontend runner
├── run_all.bat                     # 1-click full system runner (Backend + Frontend)
└── README.md                       # Main project README
```

---

## 3. Explaining the Web Dashboard

When you open **`http://localhost:5173`**, you see a modern, dark-mode **Incident Command Center**. Here is what every part does:

### A. Top Navigation Header
* **Brand & Online Indicator**: Shows a green pulsing dot (`Autonomous Online`) indicating that the event-driven loop is active.
* **Navigation Tabs**:
  * **Live Command Center**: The main real-time incident monitor.
  * **Memory Bank (5)**: Opens the searchable database of historical incidents.
* **Tech Badges**: Displays `Gemini 2.5 Flash` (AI reasoning engine) and `SSE Stream` (real-time live updates).
* **Refresh Button**: Allows manual re-syncing of data anytime.

### B. KPI Stats Overview Bar (5 Metrics Cards)
1. **Total Triaged**: Total count of alerts processed by the agent.
2. **Branch A: Auto-Healed**: Percentage and count of incidents resolved with 0 human intervention.
3. **Branch B: Known Critical**: Count of high-severity incidents escalated with past runbooks attached.
4. **Branch C: Novel Anomaly**: Count of unprecedented errors caught by the honest uncertainty engine.
5. **Avg Agent Latency**: How fast the agent makes decisions (typically under 200 milliseconds).

### C. Scenario Simulator Bar (Top Action Panel)
A row of buttons that let you test the agent with realistic production disasters in 1 click:
* **Scenario 1 (Redis Pool Exhaustion)** $\rightarrow$ Tests **Branch A (Auto-Resolve)**. Confetti shoots across the screen when auto-healing succeeds!
* **Scenario 2 (Postgres Replica Lag)** $\rightarrow$ Tests **Branch B (Critical Escalation)**. Shows how high-severity incidents are escalated with the SQL fix attached.
* **Scenario 3 (Novel Auth Memory Leak)** $\rightarrow$ Tests **Branch C (Honest Uncertainty)**. Shows that the agent does NOT guess, but creates a diagnostic investigation plan.
* **Scenario 4 (Transient CPU Spike)** $\rightarrow$ Tests **Branch D (Noise Suppression)**.
* **Scenario 5 (Stripe Webhook Mismatch)** $\rightarrow$ Tests secret rotation and hot-reloading.
* **"Inject Custom Alert" Button**: Opens a popup form where you can type ANY service name, error message, or stack trace to see how the agent handles your own custom scenario.

### D. Left Column: Live Incident Feed
* Displays all past and incoming alerts in chronological order.
* Each card shows:
  * Severity badge (`P0`, `P1`, `P2`, `P3`).
  * Branch label (e.g. `Branch A: Auto-Healed`, `Branch B: Critical Escalation`).
  * Service name and error title.
  * Processing latency (e.g. `12ms`).
* Clicking any incident opens its deep-dive reasoning trace on the right.

### E. Right Column: Step-by-Step Gemini Reasoning Visualizer
This is the core "Brain" visualizer showing how the agent reached its conclusion:
* **Step 1: Signal Ingestion & Error Trace**: The raw error log and expandable stack trace.
* **Step 2: Incident Memory Matching**:
  * Match confidence progress bar (e.g. `95% Match` vs `30% Match`).
  * Confidence tag (`VERY_HIGH`, `HIGH`, `MODERATE`, `LOW`, `UNMATCHED`).
  * Matching vectors (what matched) vs divergent vectors (what was different).
  * Gemini's technical match rationale.
* **Step 3: Urgency & Blast Radius Scoring**:
  * Assigned severity (`P0` to `P3`) and Impact score out of 10.
  * Blast Radius description (e.g., "Global Production Traffic" or "Single Pod").
  * SLA Breach Danger indicator.
* **Step 4: Remediation Output & Command**:
  * Copy-pasteable shell command or SQL script with a 1-click "Copy" button.
  * Automated execution log or diagnostic investigation steps.
  * Clickable tracking ticket link (e.g. `AUTO-MM-4101` or `INC-MM-4102`).
* **"💬 View Slack Alert" Button**: Opens a realistic popup showing exactly what the message looks like in the team's `#production-incidents` Slack channel.
* **"🧠 Teach Muscle Memory" Button**: Appears on novel/unmatched incidents to let you save the solution to the database so the agent knows it forever.

### F. Memory Bank Tab
* Lets you view, search, and filter all past incidents stored in the knowledge base.
* Filter by category: `database`, `cache`, `network_infra`, `security_auth`, `resource_exhaustion`, `third_party_api`.
* View root causes, historical post-mortems, and copy resolution commands.
* Click **"Teach Muscle Memory (Add Incident)"** to add new runbooks manually.

---

## 4. What Technologies Were Used and Why?

| Technology / Library | What it is | Why we used it in this project |
| :--- | :--- | :--- |
| **Python 3.11+** | Backend programming language | Robust ecosystem for AI agents, cloud APIs, and fast asynchronous execution. |
| **FastAPI** | Modern Python web framework | Extremely fast, native async/await support, automatic OpenAPI documentation, and high-performance routing. |
| **Pydantic v2** | Data validation & schema library | Guarantees strict type safety for alert payloads, Gemini responses, and decision logs. |
| **Google GenAI SDK (`google-genai`)** | Official Google Gemini SDK | Direct interface with **Gemini 2.5 Flash** for structured JSON reasoning, similarity evaluation, and severity analysis. |
| **Google Cloud Firestore (`google-cloud-firestore`)** | NoSQL cloud database | Enterprise persistence for incident logs and knowledge base, with seamless offline local JSON fallback. |
| **Server-Sent Events (SSE)** | Real-time web streaming | Allows the backend to push new alerts and reasoning steps live to the browser without polling. |
| **Pytest & Pytest-Asyncio** | Python testing framework | 6 automated unit tests validating all 4 branching decisions and heuristic boundaries. |
| **React 19 & TypeScript** | Modern frontend framework | Component-based, rock-solid type safety across backend and frontend models. |
| **Vite** | Next-generation frontend bundler | Instant server startup, 300ms production builds, and built-in API proxying. |
| **Tailwind CSS v4** | Modern utility-first CSS engine | Clean dark-mode glassmorphic aesthetics, neon badges, and responsive layouts. |
| **Lucide Icons** | Premium icon library | High-quality visual indicators for CPU, databases, alerts, branches, and terminals. |
| **Canvas Confetti** | Micro-animation library | Fires celebratory particle confetti when Branch A successfully auto-heals an incident. |
| **Slack Block Kit** | Rich messaging format | Formats professional, color-coded incident notifications for on-call teams. |

---

## 5. How to Run and Test Right Now

### Option 1: One-Click Batch File (Recommended on Windows)
Just double-click or run:
```cmd
run_all.bat
```
This automatically launches both:
- **Backend API Server** on `http://127.0.0.1:8000`
- **Frontend Dashboard** on `http://127.0.0.1:5173`

### Option 2: Running Automated Tests
To run all tests in the terminal:
```cmd
.venv\Scripts\pytest.exe backend/tests -v
```

---

## 6. Summary of What Makes This Project Special (For Hackathons & Demos)

1. **Not a simple chatbot**: It is an event-driven autonomous agent that watches incoming alerts, diagnoses problems, and takes actions on its own.
2. **Real 3-way branching**: It makes genuine decisions (Auto-Resolve vs. Critical Escalation vs. Novel Escalation vs. Noise Suppression).
3. **Honest Uncertainty**: It doesn't hallucinate. When an alert is new, it transparently flags uncertainty and requests human guidance.
4. **Instant MTTR Reduction**: SREs don't waste 45 minutes searching for past runbooks—the agent matches past incidents and attaches the fix in under 200 milliseconds.
5. **Continuous Learning**: Every novel incident resolved by humans can be saved back to the Memory Bank, making the organization smarter over time.
