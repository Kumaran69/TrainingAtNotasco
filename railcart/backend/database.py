"""
MongoDB connection (Motor async driver) + startup seed data.
"""
from motor.motor_asyncio import AsyncIOMotorClient
from settings import settings

client = AsyncIOMotorClient(settings.mongo_uri)
db = client[settings.db_name]

products_col = db["products"]
carts_col = db["carts"]
seats_col = db["seat_types"]
tickets_col = db["tickets"]
orders_col = db["orders"]
counters_col = db["counters"]
api_keys_col = db["api_keys"]
users_col = db["users"]


DEFAULT_PRODUCTS = [
    {"id": "p1", "name": "Bottled Water",      "price": 20,  "stock": 40, "category": "drinks",    "emoji": "\U0001F4A7"},
    {"id": "p2", "name": "Masala Chai",        "price": 15,  "stock": 25, "category": "drinks",    "emoji": "\U00002615"},
    {"id": "p3", "name": "Veg Sandwich",       "price": 60,  "stock": 15, "category": "food",      "emoji": "\U0001F96A"},
    {"id": "p4", "name": "Samosa (2 pcs)",     "price": 30,  "stock": 20, "category": "food",      "emoji": "\U0001F959"},
    {"id": "p5", "name": "Travel Pillow",      "price": 250, "stock": 8,  "category": "comfort",   "emoji": "\U0001FA91"},
    {"id": "p6", "name": "Blanket",            "price": 300, "stock": 6,  "category": "comfort",   "emoji": "\U0001F6CF"},
    {"id": "p7", "name": "Phone Charger",      "price": 199, "stock": 10, "category": "gadgets",   "emoji": "\U0001F50C"},
    {"id": "p8", "name": "Playing Cards",      "price": 45,  "stock": 12, "category": "leisure",   "emoji": "\U0001F0CF"},
]

DEFAULT_SEAT_TYPES = [
    {"seat_type": "sleeper", "price": 450,  "total_seats": 20},
    {"seat_type": "ac",      "price": 1200, "total_seats": 12},
    {"seat_type": "general", "price": 150,  "total_seats": 30},
]


async def init_db():
    """Seed collections on first run and ensure helpful indexes."""
    if await products_col.count_documents({}) == 0:
        await products_col.insert_many(DEFAULT_PRODUCTS)

    if await seats_col.count_documents({}) == 0:
        for seat in DEFAULT_SEAT_TYPES:
            seat["booked_seat_numbers"] = []
            await seats_col.insert_one(seat)

    # Drop indexes from an earlier schema version (session_id-based carts/
    # orders/tickets, before user accounts existed). Safe no-op if they
    # were never created. Without this, a leftover unique index on a
    # now-unused field causes spurious DuplicateKeyErrors once more than
    # one document lacks that field (all "null" collide under a unique index).
    for col, stale_index in [
        (carts_col, "session_id_1"),
        (orders_col, "session_id_1"),
        (tickets_col, "session_id_1"),
    ]:
        try:
            existing = await col.index_information()
            if stale_index in existing:
                await col.drop_index(stale_index)
        except Exception:
            pass  # index didn't exist or collection is brand new -- fine

    await tickets_col.create_index("ticket_id", unique=True)
    await orders_col.create_index("order_id", unique=True)
    await products_col.create_index([("name", "text")])
    await api_keys_col.create_index("key_hash", unique=True)
    await users_col.create_index("email", unique=True)
    await carts_col.create_index("user_id", unique=True)
    await tickets_col.create_index("user_id")
    await orders_col.create_index("user_id")


async def next_sequence(name: str) -> int:
    """Atomic auto-incrementing counter, used for human-friendly IDs."""
    doc = await counters_col.find_one_and_update(
        {"_id": name},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,
    )
    return doc["seq"]