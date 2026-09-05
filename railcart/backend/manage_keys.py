"""
Manual key management from the command line -- no running server needed
for generating a master key; creating/revoking regular API keys talks
directly to MongoDB using the same settings the app uses.

Usage:
    # Generate a master key (put the output in your .env as RAILCART_MASTER_KEY)
    python manage_keys.py new-master

    # Create a regular API key (stored hashed in MongoDB, shown once)
    python manage_keys.py create --name "frontend-dev"

    # List keys (hash never shown)
    python manage_keys.py list

    # Revoke a key by its id (from `list`)
    python manage_keys.py revoke --id key_00001
"""
import argparse
import asyncio
from datetime import datetime, timezone

from database import api_keys_col, next_sequence
from security import generate_api_key, hash_key


def cmd_new_master():
    print("Generated master key -- put this in backend/.env as RAILCART_MASTER_KEY:\n")
    print(generate_api_key().replace("rc_live_", "rc_master_"))


async def cmd_create(name: str, quiet: bool = False):
    raw_key = generate_api_key()
    key_id = f"key_{await next_sequence('api_key'):05d}"
    await api_keys_col.insert_one({
        "id": key_id,
        "name": name,
        "key_hash": hash_key(raw_key),
        "active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_used_at": None,
        "request_count": 0,
    })
    if quiet:
        # Prints ONLY the raw key, nothing else -- safe to capture directly
        # into a shell variable so it's never manually retyped or copied
        # from wrapped terminal text (a common source of "invalid key"
        # errors when a line-wrap sneaks a break into the copied string).
        print(raw_key)
    else:
        print(f"Created key '{name}' (id: {key_id})")
        print("\nThis key is shown ONLY now -- copy it somewhere safe:\n")
        print(raw_key)


async def cmd_list():
    docs = await api_keys_col.find({}, {"_id": 0, "key_hash": 0}).to_list(length=200)
    if not docs:
        print("No API keys created yet.")
        return
    for d in docs:
        status = "active" if d["active"] else "revoked"
        print(f"{d['id']:<12} {d['name']:<20} {status:<8} used {d['request_count']} times")


async def cmd_revoke(key_id: str):
    result = await api_keys_col.update_one({"id": key_id}, {"$set": {"active": False}})
    if result.matched_count == 0:
        print(f"No key found with id '{key_id}'.")
    else:
        print(f"Revoked key '{key_id}'.")


def main():
    parser = argparse.ArgumentParser(description="RailCart API key management")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("new-master")

    p_create = sub.add_parser("create")
    p_create.add_argument("--name", required=True)
    p_create.add_argument(
        "--quiet", action="store_true",
        help="Print only the raw key (no labels) -- for capturing into a variable/pipe.",
    )

    sub.add_parser("list")

    p_revoke = sub.add_parser("revoke")
    p_revoke.add_argument("--id", required=True)

    args = parser.parse_args()

    if args.command == "new-master":
        cmd_new_master()
    elif args.command == "create":
        asyncio.run(cmd_create(args.name, quiet=args.quiet))
    elif args.command == "list":
        asyncio.run(cmd_list())
    elif args.command == "revoke":
        asyncio.run(cmd_revoke(args.id))


if __name__ == "__main__":
    main()
