"""
main.py — FastAPI backend for the Rule-Based AI Assistant.

Run:
    uvicorn main:app --reload --port 8000

Docs: http://localhost:8000/docs
"""

import os
import uuid
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from database import sessions_col, messages_col, tasks_col
import rules

app = FastAPI(title="Rule-Based AI Assistant API", version="1.0.0")

origins_env = os.environ.get("CORS_ORIGINS", "*")
allow_origins = ["*"] if origins_env.strip() == "*" else [o.strip() for o in origins_env.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


class StartRequest(BaseModel):
    name: str


class ChatRequest(BaseModel):
    session_id: str
    message: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/start")
def start_session(payload: StartRequest):
    name = payload.name.strip().title() or "Friend"
    session_id = str(uuid.uuid4())

    sessions_col.insert_one({
        "_id": session_id,
        "name": name,
        "messages_sent": 0,
        "tasks_added": 0,
        "quiz_score": 0,
        "quiz_total": 0,
        "quiz_taken": False,
        "pending": None,
        "created_at": datetime.now(timezone.utc),
    })

    greeting = f"Nice to meet you, {name}! Type 'help' anytime to see what I can do."
    messages_col.insert_one({
        "session_id": session_id, "sender": "bot", "text": greeting,
        "ts": datetime.now(timezone.utc),
    })

    return {"session_id": session_id, "name": name, "greeting": greeting}


@app.get("/api/session/{session_id}")
def get_session(session_id: str):
    session = sessions_col.find_one({"_id": session_id})
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found.")
    return {"session_id": session_id, "name": session["name"]}


@app.post("/api/chat")
def chat(payload: ChatRequest):
    try:
        reply = rules.process_message(payload.session_id, payload.message)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return {"reply": reply}


@app.get("/api/messages/{session_id}")
def get_messages(session_id: str):
    if sessions_col.find_one({"_id": session_id}) is None:
        raise HTTPException(status_code=404, detail="Session not found.")
    docs = list(messages_col.find({"session_id": session_id}).sort("ts", 1))
    return [{"sender": d["sender"], "text": d["text"]} for d in docs]


@app.get("/api/tasks/{session_id}")
def get_tasks(session_id: str):
    docs = list(tasks_col.find({"session_id": session_id}).sort("created_at", 1))
    return [{"id": str(d["_id"]), "text": d["text"]} for d in docs]


@app.get("/api/stats/{session_id}")
def get_stats(session_id: str):
    session = sessions_col.find_one({"_id": session_id})
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found.")
    quiz_percentage = None
    if session.get("quiz_taken"):
        quiz_percentage = round((session["quiz_score"] / session["quiz_total"]) * 100)
    return {
        "name": session["name"],
        "messages_sent": session["messages_sent"],
        "tasks_added": session["tasks_added"],
        "tasks_remaining": tasks_col.count_documents({"session_id": session_id}),
        "quiz_taken": session.get("quiz_taken", False),
        "quiz_score": session.get("quiz_score", 0),
        "quiz_total": session.get("quiz_total", 0),
        "quiz_percentage": quiz_percentage,
    }
