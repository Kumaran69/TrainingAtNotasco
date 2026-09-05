"""
RailCart backend -- FastAPI + MongoDB (Motor).

Two merged real-world flows in one app:
  1. Shop  -> buy journey essentials (cart, stock control, checkout)
  2. Book  -> reserve a train seat (capacity control, cancel, view)

Two layers of auth:
  1. API key (X-API-Key)   -> authenticates the CALLING APPLICATION.
  2. JWT bearer token       -> authenticates the INDIVIDUAL USER, issued
     at signup/login. Cart, checkout, booking, and order history are all
     scoped to the authenticated user's id -- not a guessable session id.

Plus platform-level features:
  - Real, database-backed API keys (hashed, revocable, per-key usage stats)
  - Per-key rate limiting
  - Structured request logging with a correlation id per request
  - Global exception handling (custom domain errors -> clean JSON,
    unexpected errors -> logged + safe generic 500, never a raw traceback)
  - Pagination + search on products
  - Order history

Run:
    uvicorn main:app --reload

Requires a running MongoDB instance (see .env.example / README).
"""
import logging
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, Request, Header, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from settings import settings
from database import (
    init_db, products_col, carts_col, seats_col, tickets_col,
    orders_col, api_keys_col, users_col, next_sequence,
)
from models import (
    Product, CartActionRequest, CartResponse, CartLine,
    CheckoutRequest, CheckoutResponse, SeatAvailability,
    BookTicketRequest, Ticket, CancelTicketRequest,
    Order, APIKeyCreateRequest, APIKeyCreated, APIKeyInfo,
    SignupRequest, LoginRequest, TokenResponse, UserPublic,
)
from exceptions import (
    RailCartError, ProductNotFoundError, InvalidInputError,
    OutOfStockError, SeatTypeNotFoundError, BookingFullError,
    TicketNotFoundError, AuthenticationError, AuthorizationError,
    EmailAlreadyRegisteredError,
)
from security import (
    generate_api_key, hash_key, RateLimiter,
    hash_password, verify_password, create_access_token, decode_access_token,
)

logging.basicConfig(
    level=settings.log_level,
    format="%(asctime)s %(levelname)s %(name)s :: %(message)s",
)
logger = logging.getLogger("railcart")

rate_limiter = RateLimiter(settings.rate_limit_per_minute)

# If no fixed secret is configured, generate one for this process's
# lifetime. Fine for local dev; tokens just won't survive a restart.
_runtime_jwt_secret = settings.jwt_secret or generate_api_key()
if not settings.jwt_secret:
    logger.warning(
        "RAILCART_JWT_SECRET not set -- using a random secret for this run. "
        "Existing tokens will be invalidated on restart. Set a fixed value "
        "in .env for anything beyond local testing."
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    logger.info("RailCart API started. DB=%s", settings.db_name)
    yield


app = FastAPI(title="RailCart API", version="3.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ===========================================================
# Request logging + correlation id
# ===========================================================
@app.middleware("http")
async def request_logging(request: Request, call_next):
    request_id = str(uuid.uuid4())[:8]
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000
    response.headers["X-Request-ID"] = request_id
    logger.info(
        "[%s] %s %s -> %s (%.1fms)",
        request_id, request.method, request.url.path,
        response.status_code, duration_ms,
    )
    return response


# ===========================================================
# API key auth + rate limiting (applies to /api/*, not /api/admin
# which uses the separate master key, and not /api/health or /docs)
# ===========================================================
OPEN_PATHS = {"/api/health"}


async def _resolve_api_key(x_api_key: str | None) -> dict | None:
    if not x_api_key:
        return None
    return await api_keys_col.find_one({"key_hash": hash_key(x_api_key), "active": True})


@app.middleware("http")
async def enforce_api_key(request: Request, call_next):
    path = request.url.path

    if not path.startswith("/api") or path in OPEN_PATHS or path.startswith("/api/admin"):
        return await call_next(request)

    if await api_keys_col.count_documents({}) == 0:
        return await call_next(request)

    raw_key = request.headers.get("x-api-key")
    key_doc = await _resolve_api_key(raw_key)

    if key_doc is None:
        return JSONResponse(
            status_code=401,
            content={"detail": "Missing or invalid API key. Send it as the 'X-API-Key' header."},
        )

    identifier = key_doc["key_hash"]
    if not rate_limiter.allow(identifier):
        return JSONResponse(
            status_code=429,
            content={"detail": f"Rate limit exceeded ({settings.rate_limit_per_minute}/min). Try again shortly."},
        )

    await api_keys_col.update_one(
        {"key_hash": identifier},
        {"$inc": {"request_count": 1}, "$set": {"last_used_at": datetime.now(timezone.utc).isoformat()}},
    )

    return await call_next(request)


def require_master_key(x_master_key: str | None = Header(default=None)):
    if not settings.master_key or x_master_key != settings.master_key:
        raise InvalidInputError("Invalid or missing master key.")


# ===========================================================
# User auth dependency -- resolves the Authorization: Bearer <token>
# header into the actual user document. Used by every route that
# should be scoped to "the logged-in user", not a guessable id.
# ===========================================================
async def get_current_user(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise AuthenticationError("Missing or malformed Authorization header. Expected 'Bearer <token>'.")

    token = authorization.split(" ", 1)[1].strip()
    payload = decode_access_token(token, _runtime_jwt_secret)
    if payload is None:
        raise AuthenticationError("Invalid or expired session. Please log in again.")

    user = await users_col.find_one({"id": payload["sub"]})
    if user is None:
        raise AuthenticationError("Account no longer exists. Please log in again.")

    return user


# ===========================================================
# Exception handling -- domain errors -> clean JSON,
# anything unexpected -> logged, never a raw traceback to the client.
# ===========================================================
@app.exception_handler(RailCartError)
async def railcart_error_handler(request: Request, exc: RailCartError):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})


@app.exception_handler(Exception)
async def unhandled_error_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Something went wrong on our end. Please try again."},
    )


# ===========================================================
# AUTH ROUTES
# ===========================================================

def _user_public(doc: dict) -> UserPublic:
    return UserPublic(id=doc["id"], name=doc["name"], email=doc["email"], created_at=doc["created_at"])


@app.post("/api/auth/signup", response_model=TokenResponse)
async def signup(req: SignupRequest):
    name = req.name.strip()
    email = req.email.strip().lower()

    if not name:
        raise InvalidInputError("Name cannot be empty.")
    if "@" not in email or "." not in email.split("@")[-1]:
        raise InvalidInputError("Enter a valid email address.")
    if len(req.password) < 8:
        raise InvalidInputError("Password must be at least 8 characters.")

    if await users_col.find_one({"email": email}):
        raise EmailAlreadyRegisteredError(email)

    user_id = f"user_{await next_sequence('user'):05d}"
    user_doc = {
        "id": user_id,
        "name": name,
        "email": email,
        "password_hash": hash_password(req.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await users_col.insert_one(user_doc)
    logger.info("New account: %s (%s)", user_id, email)

    token = create_access_token(user_id, _runtime_jwt_secret, settings.jwt_expire_minutes)
    return TokenResponse(access_token=token, user=_user_public(user_doc))


@app.post("/api/auth/login", response_model=TokenResponse)
async def login(req: LoginRequest):
    email = req.email.strip().lower()
    user = await users_col.find_one({"email": email})

    if user is None or not verify_password(req.password, user["password_hash"]):
        raise AuthenticationError("Incorrect email or password.")

    token = create_access_token(user["id"], _runtime_jwt_secret, settings.jwt_expire_minutes)
    return TokenResponse(access_token=token, user=_user_public(user))


@app.get("/api/auth/me", response_model=UserPublic)
async def me(current_user: dict = Depends(get_current_user)):
    return _user_public(current_user)


# ===========================================================
# SHOP ROUTES (browsing is public; cart/checkout require login)
# ===========================================================

@app.get("/api/products", response_model=list[Product])
async def list_products(
    search: str | None = Query(default=None, description="Case-insensitive name search"),
    category: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=100),
    skip: int = Query(default=0, ge=0),
):
    query: dict = {}
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    if category:
        query["category"] = category

    docs = await products_col.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(length=limit)
    return docs


async def _get_or_create_cart(user_id: str) -> dict:
    # Atomic upsert -- avoids a race where two near-simultaneous requests
    # (e.g. React StrictMode firing an effect twice in dev) both see "no
    # cart yet" and both try to insert one, colliding on the unique index.
    cart = await carts_col.find_one_and_update(
        {"user_id": user_id},
        {"$setOnInsert": {"user_id": user_id, "items": {}}},
        upsert=True,
        return_document=True,  # True == ReturnDocument.AFTER
    )
    return cart


@app.post("/api/cart/add", response_model=CartResponse)
async def add_to_cart(req: CartActionRequest, current_user: dict = Depends(get_current_user)):
    if req.quantity <= 0:
        raise InvalidInputError("Quantity must be a positive whole number.")

    product = await products_col.find_one({"id": req.product_id})
    if product is None:
        raise ProductNotFoundError(req.product_id)

    if req.quantity > product["stock"]:
        raise OutOfStockError(product["name"], product["stock"])

    cart = await _get_or_create_cart(current_user["id"])
    items = cart.get("items", {})
    items[req.product_id] = items.get(req.product_id, 0) + req.quantity

    await carts_col.update_one({"user_id": current_user["id"]}, {"$set": {"items": items}})
    await products_col.update_one({"id": req.product_id}, {"$inc": {"stock": -req.quantity}})

    return await _build_cart_response(current_user["id"])


@app.post("/api/cart/remove", response_model=CartResponse)
async def remove_from_cart(req: CartActionRequest, current_user: dict = Depends(get_current_user)):
    if req.quantity <= 0:
        raise InvalidInputError("Quantity must be a positive whole number.")

    cart = await _get_or_create_cart(current_user["id"])
    items = cart.get("items", {})

    if req.product_id not in items:
        raise ProductNotFoundError(req.product_id)

    if req.quantity > items[req.product_id]:
        raise InvalidInputError(f"You only have {items[req.product_id]} of that item in your cart.")

    items[req.product_id] -= req.quantity
    restock_qty = req.quantity
    if items[req.product_id] == 0:
        del items[req.product_id]

    await carts_col.update_one({"user_id": current_user["id"]}, {"$set": {"items": items}})
    await products_col.update_one({"id": req.product_id}, {"$inc": {"stock": restock_qty}})

    return await _build_cart_response(current_user["id"])


async def _build_cart_response(user_id: str) -> CartResponse:
    cart = await _get_or_create_cart(user_id)
    items = cart.get("items", {})

    lines = []
    total = 0.0
    for product_id, qty in items.items():
        product = await products_col.find_one({"id": product_id})
        if product is None:
            continue
        line_total = product["price"] * qty
        total += line_total
        lines.append(CartLine(
            product_id=product_id, name=product["name"],
            price=product["price"], quantity=qty, line_total=line_total,
        ))

    return CartResponse(lines=lines, total=round(total, 2))


@app.get("/api/cart", response_model=CartResponse)
async def view_cart(current_user: dict = Depends(get_current_user)):
    return await _build_cart_response(current_user["id"])


@app.post("/api/checkout", response_model=CheckoutResponse)
async def checkout(req: CheckoutRequest, current_user: dict = Depends(get_current_user)):
    cart_resp = await _build_cart_response(current_user["id"])

    if not cart_resp.lines:
        raise InvalidInputError("Your cart is empty.")

    if req.amount_paid < cart_resp.total:
        raise InvalidInputError(
            f"Insufficient payment. Total is {cart_resp.total:.2f}, "
            f"but {req.amount_paid:.2f} was paid."
        )

    order_id = f"ORD{await next_sequence('order'):05d}"
    change = round(req.amount_paid - cart_resp.total, 2)

    await orders_col.insert_one({
        "order_id": order_id,
        "user_id": current_user["id"],
        "lines": [line.model_dump() for line in cart_resp.lines],
        "total": cart_resp.total,
        "amount_paid": req.amount_paid,
        "change": change,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    await carts_col.update_one({"user_id": current_user["id"]}, {"$set": {"items": {}}})

    return CheckoutResponse(order_id=order_id, total=cart_resp.total, amount_paid=req.amount_paid, change=change)


@app.get("/api/orders", response_model=list[Order])
async def order_history(
    current_user: dict = Depends(get_current_user),
    limit: int = Query(default=20, ge=1, le=100),
):
    docs = await orders_col.find(
        {"user_id": current_user["id"]}, {"_id": 0, "user_id": 0}
    ).sort("created_at", -1).to_list(length=limit)
    return docs


# ===========================================================
# BOOKING ROUTES
# ===========================================================

@app.get("/api/seats", response_model=list[SeatAvailability])
async def seat_availability():
    docs = await seats_col.find({}, {"_id": 0}).to_list(length=20)
    return [
        SeatAvailability(
            seat_type=d["seat_type"], price=d["price"],
            total_seats=d["total_seats"],
            free_seats=d["total_seats"] - len(d["booked_seat_numbers"]),
        )
        for d in docs
    ]


@app.post("/api/booking/book", response_model=Ticket)
async def book_ticket(req: BookTicketRequest, current_user: dict = Depends(get_current_user)):
    name = req.passenger_name.strip()
    destination = req.destination.strip()
    seat_type = req.seat_type.lower().strip()

    if not name or not name.replace(" ", "").isalpha():
        raise InvalidInputError("Passenger name must contain letters only.")
    if not destination:
        raise InvalidInputError("Destination cannot be empty.")

    seat_doc = await seats_col.find_one({"seat_type": seat_type})
    if seat_doc is None:
        raise SeatTypeNotFoundError(seat_type)

    booked = set(seat_doc["booked_seat_numbers"])
    all_seats = set(range(1, seat_doc["total_seats"] + 1))
    free_seats = sorted(all_seats - booked)

    if not free_seats:
        raise BookingFullError(seat_type)

    seat_number = free_seats[0]
    ticket_id = f"TCK{await next_sequence('ticket'):05d}"

    await seats_col.update_one({"seat_type": seat_type}, {"$push": {"booked_seat_numbers": seat_number}})

    ticket_doc = {
        "ticket_id": ticket_id, "user_id": current_user["id"],
        "passenger_name": name, "destination": destination,
        "seat_type": seat_type, "seat_number": seat_number,
        "price": seat_doc["price"], "status": "confirmed",
    }
    await tickets_col.insert_one(ticket_doc)
    logger.info("Ticket booked: %s (%s, seat %s#%s)", ticket_id, name, seat_type, seat_number)

    return Ticket(**{k: v for k, v in ticket_doc.items() if k != "user_id"})


@app.post("/api/booking/cancel")
async def cancel_ticket(req: CancelTicketRequest, current_user: dict = Depends(get_current_user)):
    ticket = await tickets_col.find_one({"ticket_id": req.ticket_id})
    if ticket is None or ticket.get("status") == "cancelled":
        raise TicketNotFoundError(req.ticket_id)

    if ticket["user_id"] != current_user["id"]:
        raise AuthorizationError("You can only cancel your own tickets.")

    await seats_col.update_one(
        {"seat_type": ticket["seat_type"]}, {"$pull": {"booked_seat_numbers": ticket["seat_number"]}}
    )
    await tickets_col.update_one({"ticket_id": req.ticket_id}, {"$set": {"status": "cancelled"}})
    logger.info("Ticket cancelled: %s", req.ticket_id)
    return {"detail": f"Ticket {req.ticket_id} cancelled."}


@app.get("/api/booking/ticket/{ticket_id}", response_model=Ticket)
async def view_ticket(ticket_id: str, current_user: dict = Depends(get_current_user)):
    ticket = await tickets_col.find_one({"ticket_id": ticket_id}, {"_id": 0})
    if ticket is None:
        raise TicketNotFoundError(ticket_id)
    if ticket["user_id"] != current_user["id"]:
        raise AuthorizationError("You can only view your own tickets.")
    return {k: v for k, v in ticket.items() if k != "user_id"}


@app.get("/api/booking/tickets", response_model=list[Ticket])
async def list_my_tickets(
    current_user: dict = Depends(get_current_user),
    limit: int = Query(default=50, ge=1, le=100),
    skip: int = Query(default=0, ge=0),
):
    docs = await tickets_col.find(
        {"user_id": current_user["id"], "status": "confirmed"}, {"_id": 0, "user_id": 0}
    ).sort("ticket_id", -1).skip(skip).limit(limit).to_list(length=limit)
    return docs


# ===========================================================
# ADMIN -- API key management (protected by X-Master-Key)
# ===========================================================

@app.post("/api/admin/keys", response_model=APIKeyCreated)
async def create_api_key(req: APIKeyCreateRequest, x_master_key: str | None = Header(default=None)):
    require_master_key(x_master_key)

    raw_key = generate_api_key()
    key_id = f"key_{await next_sequence('api_key'):05d}"

    await api_keys_col.insert_one({
        "id": key_id, "name": req.name, "key_hash": hash_key(raw_key),
        "active": True, "created_at": datetime.now(timezone.utc).isoformat(),
        "last_used_at": None, "request_count": 0,
    })
    logger.info("API key created: %s (%s)", key_id, req.name)
    return APIKeyCreated(id=key_id, name=req.name, api_key=raw_key)


@app.get("/api/admin/keys", response_model=list[APIKeyInfo])
async def list_api_keys(x_master_key: str | None = Header(default=None)):
    require_master_key(x_master_key)
    docs = await api_keys_col.find({}, {"_id": 0, "key_hash": 0}).to_list(length=200)
    return docs


@app.delete("/api/admin/keys/{key_id}")
async def revoke_api_key(key_id: str, x_master_key: str | None = Header(default=None)):
    require_master_key(x_master_key)
    result = await api_keys_col.update_one({"id": key_id}, {"$set": {"active": False}})
    if result.matched_count == 0:
        raise InvalidInputError(f"No API key found with id '{key_id}'.")
    logger.info("API key revoked: %s", key_id)
    return {"detail": f"Key {key_id} revoked."}


@app.get("/api/health")
async def health():
    try:
        await products_col.database.command("ping")
        db_ok = True
    except Exception:
        db_ok = False
    return {"status": "ok" if db_ok else "degraded", "database": "connected" if db_ok else "unreachable"}