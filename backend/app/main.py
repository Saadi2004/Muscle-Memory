import asyncio
import json
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse, FileResponse
from .config import settings
from .models.alert import AlertEvent
from .models.incident import PastIncident
from .models.decision import DecisionLogEntry
from .services.firestore_service import db_service
from .services.router import incident_router
from .services.gemini_client import gemini_service
from .simulator.alert_generator import simulator

app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description="Autonomous Event-Driven Production Incident Response & Routing Agent",
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory broadcaster for SSE live updates
event_subscribers: List[asyncio.Queue] = []


async def broadcast_event(event_type: str, data: dict):
    msg = f"event: {event_type}\ndata: {json.dumps(data)}\n\n"
    for queue in list(event_subscribers):
        try:
            await queue.put(msg)
        except Exception:
            if queue in event_subscribers:
                event_subscribers.remove(queue)


# Static files directory detection (Docker container /app/static or local frontend/dist)
static_dirs = [
    Path("static"),
    Path(__file__).resolve().parent.parent / "static",
    Path(__file__).resolve().parent.parent.parent / "frontend" / "dist",
]

static_dir: Optional[Path] = None
for candidate in static_dirs:
    if candidate.exists() and (candidate / "index.html").exists():
        static_dir = candidate
        break

if static_dir:
    assets_dir = static_dir / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "gemini_live": gemini_service.is_live(),
        "firestore_connected": db_service.use_firestore,
        "memory_bank_count": len(db_service.get_all_incidents()),
        "total_decisions_logged": len(db_service.get_decision_logs()),
    }


@app.get("/api/stats")
async def get_stats():
    return db_service.get_stats()


@app.get("/api/scenarios")
async def get_scenarios():
    return simulator.get_preset_scenarios()


@app.post("/api/alerts/simulate/{scenario_id}", response_model=DecisionLogEntry)
async def simulate_scenario(scenario_id: str):
    try:
        alert = simulator.create_alert_from_scenario(scenario_id)
        decision_log = await incident_router.process_alert(alert)

        # Broadcast live to SSE subscribers
        asyncio.create_task(broadcast_event("incident_processed", decision_log.model_dump()))
        return decision_log
    except Exception as e:
        print(f"[API Error in simulate] {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/alerts/custom", response_model=DecisionLogEntry)
async def ingest_custom_alert(alert: AlertEvent):
    try:
        decision_log = await incident_router.process_alert(alert)
        asyncio.create_task(broadcast_event("incident_processed", decision_log.model_dump()))
        return decision_log
    except Exception as e:
        print(f"[API Error in ingest_custom_alert] {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/decisions", response_model=List[DecisionLogEntry])
async def get_decisions(limit: int = 50):
    return db_service.get_decision_logs(limit=limit)


@app.get("/api/decisions/{decision_id}", response_model=DecisionLogEntry)
async def get_decision(decision_id: str):
    item = db_service.get_decision_by_id(decision_id)
    if not item:
        raise HTTPException(status_code=404, detail="Decision not found")
    return item


@app.get("/api/memory", response_model=List[PastIncident])
async def get_memory_bank():
    return db_service.get_all_incidents()


@app.post("/api/memory", response_model=PastIncident)
async def add_incident_to_memory(incident: PastIncident):
    try:
        saved = db_service.save_incident(incident)
        asyncio.create_task(broadcast_event("memory_updated", saved.model_dump()))
        return saved
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/events/stream")
async def sse_event_stream(request: Request):
    queue = asyncio.Queue()
    event_subscribers.append(queue)

    async def event_generator():
        try:
            # Send initial keepalive
            yield "event: connected\ndata: {\"status\": \"connected\"}\n\n"
            while True:
                if await request.is_disconnected():
                    break
                try:
                    data = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield data
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"
        finally:
            if queue in event_subscribers:
                event_subscribers.remove(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


if static_dir:
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api"):
            raise HTTPException(status_code=404, detail="API endpoint not found")
        file_path = static_dir / full_path
        if full_path and file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(static_dir / "index.html")
else:
    @app.get("/")
    async def root():
        return {
            "status": "healthy",
            "service": settings.app_name,
            "version": settings.version,
            "ai_engine": "Gemini 2.5 Flash" if gemini_service.is_live() else "Muscle Memory Heuristic Engine (Offline Mode)",
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.host, port=settings.port, reload=True)
