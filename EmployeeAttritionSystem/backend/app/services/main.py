"""FastAPI main application — Entry point.

Configures:
  - CORS middleware for frontend access
  - Global exception handlers (Task 4)
  - WebSocket endpoint for real-time updates
  - All API routers (auth, employees, analysis, attrition)
  - Lifespan: creates tables + seeds data on startup
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from app.config import get_settings
from app.database import create_tables, async_session_factory
from app.api import auth, employees, analysis, attrition
from app.websocket_manager import manager
from app.core.exceptions import (
    DuplicateEmployeeError,
    EmployeeNotFoundError,
    InvalidAgeError,
    InvalidSalaryError,
    InvalidDepartmentError,
    InvalidInputError,
    AuthenticationError,
)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — create tables and seed data on startup."""
    # Startup
    await create_tables()

    # Seed initial data if database is empty
    from app.seed_data import seed_employees
    async with async_session_factory() as session:
        await seed_employees(session)

    yield
    # Shutdown — nothing to clean up


app = FastAPI(
    title=settings.APP_NAME,
    description="Full-stack Employee Attrition Prediction System with real-time analytics",
    version="1.0.0",
    lifespan=lifespan,
)

# ---- CORS Middleware ----
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins in development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Global Exception Handlers (Task 4) ----


@app.exception_handler(DuplicateEmployeeError)
async def duplicate_employee_handler(request: Request, exc: DuplicateEmployeeError):
    return JSONResponse(status_code=409, content={"detail": exc.message, "type": "duplicate_employee"})


@app.exception_handler(EmployeeNotFoundError)
async def not_found_handler(request: Request, exc: EmployeeNotFoundError):
    return JSONResponse(status_code=404, content={"detail": exc.message, "type": "employee_not_found"})


@app.exception_handler(InvalidAgeError)
async def invalid_age_handler(request: Request, exc: InvalidAgeError):
    return JSONResponse(status_code=400, content={"detail": exc.message, "type": "invalid_age"})


@app.exception_handler(InvalidSalaryError)
async def invalid_salary_handler(request: Request, exc: InvalidSalaryError):
    return JSONResponse(status_code=400, content={"detail": exc.message, "type": "invalid_salary"})


@app.exception_handler(InvalidDepartmentError)
async def invalid_department_handler(request: Request, exc: InvalidDepartmentError):
    return JSONResponse(status_code=400, content={"detail": exc.message, "type": "invalid_department"})


@app.exception_handler(InvalidInputError)
async def invalid_input_handler(request: Request, exc: InvalidInputError):
    return JSONResponse(status_code=400, content={"detail": exc.message, "type": "invalid_input"})


@app.exception_handler(AuthenticationError)
async def auth_error_handler(request: Request, exc: AuthenticationError):
    return JSONResponse(status_code=401, content={"detail": exc.message, "type": "authentication_error"})


from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError

@app.exception_handler(RequestValidationError)
async def request_validation_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    messages = []
    for err in errors:
        loc = " -> ".join(str(l) for l in err.get("loc", []) if l != "body")
        msg = err.get("msg", "Invalid input")
        messages.append(f"{loc}: {msg}" if loc else msg)
    detail_str = "; ".join(messages) if messages else "Invalid input data"
    return JSONResponse(
        status_code=422,
        content={"detail": detail_str, "type": "validation_error"}
    )

@app.exception_handler(ValidationError)
async def validation_error_handler(request: Request, exc: ValidationError):
    return JSONResponse(status_code=422, content={"detail": str(exc), "type": "validation_error"})


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Catch-all handler — ensures the app NEVER crashes (Task 4)."""
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred. Please try again.", "type": "server_error"},
    )


# ---- API Routers ----
app.include_router(auth.router)
app.include_router(employees.router)
app.include_router(analysis.router)
app.include_router(attrition.router)


# ---- WebSocket Endpoint ----

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates.

    Clients connect here to receive:
      - employee_added, employee_updated, employee_deleted events
      - risk_alert for high-risk employee detection
      - stats_update for live dashboard counters
      - activity_log for real-time activity feed
    """
    await manager.connect(websocket)
    try:
        # Send current activity log on connect
        await manager.send_personal(websocket, "connected", {
            "message": "Connected to real-time updates",
            "active_connections": manager.connection_count,
            "activity_log": manager.get_activity_log(),
        })

        # Keep connection alive and listen for client messages
        while True:
            data = await websocket.receive_text()
            # Client can request activity log refresh
            if data == "get_activity":
                await manager.send_personal(
                    websocket, "activity_log", {"log": manager.get_activity_log()}
                )
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# ---- Health Check ----

@app.get("/health")
async def health_check():
    """Health check endpoint for Docker."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "active_connections": manager.connection_count,
    }


# ---- Activity Log Endpoint ----

@app.get("/api/activity")
async def get_activity_log(limit: int = 20):
    """Get recent activity log (real-time feature)."""
    return {"activities": manager.get_activity_log(limit)}
