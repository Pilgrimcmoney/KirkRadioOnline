from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import asyncio
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")  # Ignore MongoDB's _id field
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    # Convert to dict and serialize datetime to ISO string for MongoDB
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    # Exclude MongoDB's _id field from the query results
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks

# ---------------- Live Broadcast Relay (Icecast-style) ----------------
class BroadcastManager:
    """Relays a live MP3 stream from a DJ (via WebSocket) to many HTTP listeners."""
    def __init__(self):
        self.listeners: set[asyncio.Queue] = set()
        self.is_live: bool = False
        self.started_at: datetime | None = None
        self.title: str = ""
        # rolling burst buffer so new listeners get audio immediately
        self.burst: bytes = b""
        self.BURST_MAX = 64 * 1024

    def start(self, title: str = ""):
        self.is_live = True
        self.started_at = datetime.now(timezone.utc)
        self.title = title or "Kirk Radio Live"
        self.burst = b""

    def stop(self):
        self.is_live = False
        self.started_at = None
        self.burst = b""

    def push(self, chunk: bytes):
        # keep a small rolling burst buffer
        self.burst = (self.burst + chunk)[-self.BURST_MAX:]
        dead = []
        for q in list(self.listeners):
            try:
                q.put_nowait(chunk)
            except asyncio.QueueFull:
                dead.append(q)
        for q in dead:
            self.listeners.discard(q)

    def status(self):
        uptime = 0
        if self.started_at:
            uptime = int((datetime.now(timezone.utc) - self.started_at).total_seconds())
        return {
            "live": self.is_live,
            "listeners": len(self.listeners),
            "uptime": uptime,
            "title": self.title,
        }


broadcast = BroadcastManager()


@api_router.websocket("/broadcast/ws")
async def broadcast_ws(websocket: WebSocket):
    await websocket.accept()
    title = websocket.query_params.get("title", "")
    broadcast.start(title)
    logger.info("Broadcast source connected")
    try:
        while True:
            data = await websocket.receive_bytes()
            if data:
                broadcast.push(data)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.warning(f"Broadcast source error: {e}")
    finally:
        broadcast.stop()
        logger.info("Broadcast source disconnected")


@api_router.get("/broadcast/status")
async def broadcast_status():
    return broadcast.status()


@api_router.get("/broadcast/stream")
async def broadcast_stream():
    async def gen():
        q: asyncio.Queue = asyncio.Queue(maxsize=256)
        broadcast.listeners.add(q)
        try:
            if broadcast.burst:
                yield broadcast.burst
            while True:
                chunk = await q.get()
                yield chunk
        finally:
            broadcast.listeners.discard(q)

    headers = {
        "Cache-Control": "no-cache, no-store",
        "Connection": "keep-alive",
        "icy-name": "Kirk Radio DJ",
    }
    return StreamingResponse(gen(), media_type="audio/mpeg", headers=headers)


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()