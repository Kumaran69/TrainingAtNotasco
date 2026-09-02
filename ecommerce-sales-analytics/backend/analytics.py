"""
analytics.py — order CRUD + analytics, now backed by PostgreSQL via
SQLAlchemy instead of an in-memory dict.

Every function takes a `db: Session` (injected by FastAPI via
`Depends(get_db)` in main.py). Aggregates (revenue, category sales,
customer spending, etc.) are computed with SQL GROUP BY / SUM / ORDER BY
so the database does the work — this scales far better than pulling
every row into Python and looping, especially as order volume grows.
"""

from typing import Optional
from sqlalchemy import func
from sqlalchemy.orm import Session

from models import Order

SEGMENT_THRESHOLDS = (
    ("Platinum", 100000),
    ("Gold", 50000),
    ("Silver", 20000),
    ("Bronze", 0),
)

SEED_ORDERS = [
    {"order_id": "ORD001", "customer": "Arun", "product": "Laptop", "category": "Electronics", "price": 55000, "quantity": 2},
    {"order_id": "ORD002", "customer": "Priya", "product": "Phone", "category": "Electronics", "price": 25000, "quantity": 3},
    {"order_id": "ORD003", "customer": "Kiran", "product": "Desk", "category": "Furniture", "price": 8000, "quantity": 1},
]


def to_dict(order: Order) -> dict:
    return {
        "order_id": order.order_id,
        "customer": order.customer,
        "product": order.product,
        "category": order.category,
        "price": order.price,
        "quantity": order.quantity,
        "total": order.price * order.quantity,
    }


def seed_if_empty(db: Session) -> None:
    """Populate the table with starter data on first run (empty database)."""
    if db.query(Order).count() == 0:
        db.add_all(Order(**row) for row in SEED_ORDERS)
        db.commit()


# ---------------- CRUD ----------------

def add_order(db: Session, order_id: str, customer: str, product: str,
              category: str, price: float, quantity: int) -> dict:
    if db.get(Order, order_id):
        raise ValueError(f"Order ID '{order_id}' already exists.")
    order = Order(order_id=order_id, customer=customer, product=product,
                   category=category, price=price, quantity=quantity)
    db.add(order)
    db.commit()
    db.refresh(order)
    return to_dict(order)


def get_orders(db: Session) -> list[dict]:
    return [to_dict(o) for o in db.query(Order).order_by(Order.order_id).all()]


def get_order(db: Session, order_id: str) -> Optional[dict]:
    order = db.get(Order, order_id)
    return to_dict(order) if order else None


def update_order(db: Session, order_id: str, fields: dict) -> Optional[dict]:
    order = db.get(Order, order_id)
    if order is None:
        return None
    valid = {"customer", "product", "category", "price", "quantity"}
    for key, value in fields.items():
        if key in valid and value is not None:
            setattr(order, key, value)
    db.commit()
    db.refresh(order)
    return to_dict(order)


def delete_order(db: Session, order_id: str) -> bool:
    order = db.get(Order, order_id)
    if order is None:
        return False
    db.delete(order)
    db.commit()
    return True


# ---------------- Analytics (computed via SQL, not Python loops) ----------------

def total_revenue(db: Session) -> float:
    result = db.query(func.coalesce(func.sum(Order.price * Order.quantity), 0)).scalar()
    return float(result)


def highest_value_order(db: Session) -> Optional[dict]:
    order = db.query(Order).order_by((Order.price * Order.quantity).desc()).first()
    return to_dict(order) if order else None


def best_selling_product(db: Session) -> Optional[dict]:
    row = (
        db.query(Order.product, func.sum(Order.quantity).label("qty"))
        .group_by(Order.product)
        .order_by(func.sum(Order.quantity).desc())
        .first()
    )
    if not row:
        return None
    return {"product": row.product, "quantity": int(row.qty)}


def category_wise_sales(db: Session) -> dict:
    rows = (
        db.query(Order.category, func.sum(Order.price * Order.quantity).label("total"))
        .group_by(Order.category)
        .all()
    )
    return {r.category: float(r.total) for r in rows}


def customer_wise_spending(db: Session) -> dict:
    rows = (
        db.query(Order.customer, func.sum(Order.price * Order.quantity).label("total"))
        .group_by(Order.customer)
        .all()
    )
    return {r.customer: float(r.total) for r in rows}


def segment_for_spending(spending: float) -> str:
    for label, threshold in SEGMENT_THRESHOLDS:
        if spending >= threshold:
            return label
    return "Bronze"


def customer_segmentation(db: Session) -> list[dict]:
    spending = customer_wise_spending(db)
    return [
        {"customer": c, "spending": total, "segment": segment_for_spending(total)}
        for c, total in spending.items()
    ]


def sales_report(db: Session) -> dict:
    n = db.query(func.count(Order.order_id)).scalar()
    revenue = total_revenue(db)
    return {
        "total_orders": n,
        "total_revenue": revenue,
        "highest_value_order": highest_value_order(db),
        "best_selling_product": best_selling_product(db),
        "average_order_value": (revenue / n) if n else 0,
    }
