"""
models.py — SQLAlchemy ORM model for the `orders` table.
"""

from sqlalchemy import Column, String, Float, Integer
from database import Base


class Order(Base):
    __tablename__ = "orders"

    order_id = Column(String, primary_key=True, index=True)
    customer = Column(String, nullable=False)
    product = Column(String, nullable=False)
    category = Column(String, nullable=False, index=True)
    price = Column(Float, nullable=False)
    quantity = Column(Integer, nullable=False)
