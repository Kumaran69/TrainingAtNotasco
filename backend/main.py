"""
main.py — FastAPI backend for the E-Commerce Sales Analytics System.
Data is persisted in PostgreSQL via SQLAlchemy (see database.py, models.py).

Run:
    uvicorn main:app --reload --port 8000

Docs (auto-generated, interactive):
    http://localhost:8000/docs
"""

import os
from typing import Optional

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

import analytics as an
from database import Base, engine, get_db

app = FastAPI(title="E-Commerce Sales Analytics API", version="2.0.0")

# CORS origins: comma-separated list via env var in production
# (e.g. "https://your-frontend.vercel.app"). Defaults to "*" for local dev.
origins_env = os.environ.get("CORS_ORIGINS", "*")
allow_origins = ["*"] if origins_env.strip() == "*" else [o.strip() for o in origins_env.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    # Creates the `orders` table if it doesn't exist yet, then seeds
    # starter data only if the table is currently empty.
    Base.metadata.create_all(bind=engine)
    db = next(get_db())
    try:
        an.seed_if_empty(db)
    finally:
        db.close()


class OrderCreate(BaseModel):
    order_id: str = Field(..., example="ORD004")
    customer: str = Field(..., example="Meena")
    product: str = Field(..., example="Monitor")
    category: str = Field(..., example="Electronics")
    price: float = Field(..., gt=0, example=12000)
    quantity: int = Field(..., gt=0, example=1)


class OrderUpdate(BaseModel):
    customer: Optional[str] = None
    product: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = Field(default=None, gt=0)
    quantity: Optional[int] = Field(default=None, gt=0)


@app.get("/health")
def health(db: Session = Depends(get_db)):
    order_count = len(an.get_orders(db))
    return {"status": "ok", "database": "connected", "orders_in_store": order_count}


# ---------------- CRUD ----------------

@app.get("/orders")
def list_orders(db: Session = Depends(get_db)):
    return an.get_orders(db)


@app.post("/orders", status_code=201)
def create_order(payload: OrderCreate, db: Session = Depends(get_db)):
    try:
        return an.add_order(
            db, payload.order_id, payload.customer, payload.product,
            payload.category, payload.price, payload.quantity,
        )
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@app.get("/orders/{order_id}")
def read_order(order_id: str, db: Session = Depends(get_db)):
    order = an.get_order(db, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail=f"Order '{order_id}' not found.")
    return order


@app.put("/orders/{order_id}")
def edit_order(order_id: str, payload: OrderUpdate, db: Session = Depends(get_db)):
    updated = an.update_order(db, order_id, payload.model_dump(exclude_unset=True))
    if updated is None:
        raise HTTPException(status_code=404, detail=f"Order '{order_id}' not found.")
    return updated


@app.delete("/orders/{order_id}")
def remove_order(order_id: str, db: Session = Depends(get_db)):
    if not an.delete_order(db, order_id):
        raise HTTPException(status_code=404, detail=f"Order '{order_id}' not found.")
    return {"deleted": order_id}


# ---------------- Analytics ----------------

@app.get("/analytics/revenue")
def revenue(db: Session = Depends(get_db)):
    return {"total_revenue": an.total_revenue(db)}


@app.get("/analytics/highest-order")
def highest_order(db: Session = Depends(get_db)):
    return an.highest_value_order(db)


@app.get("/analytics/best-product")
def best_product(db: Session = Depends(get_db)):
    return an.best_selling_product(db)


@app.get("/analytics/category-sales")
def category_sales(db: Session = Depends(get_db)):
    return an.category_wise_sales(db)


@app.get("/analytics/customer-spending")
def customer_spending(db: Session = Depends(get_db)):
    return an.customer_wise_spending(db)


@app.get("/analytics/segmentation")
def segmentation(db: Session = Depends(get_db)):
    return an.customer_segmentation(db)


@app.get("/analytics/report")
def report(db: Session = Depends(get_db)):
    return an.sales_report(db)
