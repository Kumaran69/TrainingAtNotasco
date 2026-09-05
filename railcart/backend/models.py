"""
Pydantic request/response models for RailCart.
"""
from pydantic import BaseModel, Field
from typing import Optional

# ---------- Shop ----------

class Product(BaseModel):
    id: str
    name: str
    price: float
    stock: int
    category: str = "essentials"
    emoji: str = "\U0001F4E6"


class CartActionRequest(BaseModel):
    product_id: str
    quantity: int


class CartLine(BaseModel):
    product_id: str
    name: str
    price: float
    quantity: int
    line_total: float


class CartResponse(BaseModel):
    lines: list[CartLine]
    total: float


class CheckoutRequest(BaseModel):
    amount_paid: float


class CheckoutResponse(BaseModel):
    order_id: str
    total: float
    amount_paid: float
    change: float


# ---------- Booking ----------

class SeatAvailability(BaseModel):
    seat_type: str
    price: float
    total_seats: int
    free_seats: int


class BookTicketRequest(BaseModel):
    passenger_name: str
    destination: str
    seat_type: str


class Ticket(BaseModel):
    ticket_id: str
    passenger_name: str
    destination: str
    seat_type: str
    seat_number: int
    price: float
    status: str = "confirmed"


class CancelTicketRequest(BaseModel):
    ticket_id: str


# ---------- Orders / history ----------

class OrderLine(BaseModel):
    product_id: str
    name: str
    price: float
    quantity: int
    line_total: float


class Order(BaseModel):
    order_id: str
    lines: list[OrderLine]
    total: float
    amount_paid: float
    change: float
    created_at: Optional[str] = None


# ---------- API key management (admin) ----------

class APIKeyCreateRequest(BaseModel):
    name: str = Field(..., description="Human-readable label, e.g. 'frontend-prod'")


class APIKeyCreated(BaseModel):
    id: str
    name: str
    api_key: str  # shown ONLY in this one response, never again


class APIKeyInfo(BaseModel):
    id: str
    name: str
    active: bool
    created_at: str
    last_used_at: Optional[str] = None
    request_count: int = 0


# ---------- User accounts (real auth) ----------

class SignupRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class UserPublic(BaseModel):
    id: str
    name: str
    email: str
    created_at: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic
