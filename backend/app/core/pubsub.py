"""
Simple Redis-backed pub/sub helper with in-process fallback.
"""
from __future__ import annotations

import asyncio
import json
import os
from typing import Any, Callable

try:
    import redis.asyncio as redis
except Exception:
    redis = None  # type: ignore

REDIS_URL = os.environ.get("REDIS_URL")

# In-process fallback
_listeners: list[Callable[[dict], Any]] = []

async def publish_event(event: dict) -> None:
    """Publish an event dict to Redis channel or in-process listeners."""
    payload = json.dumps(event, default=str)
    if REDIS_URL and redis:
        try:
            client = redis.from_url(REDIS_URL)
            await client.publish("aegis_events", payload)
            await client.close()
            return
        except Exception:
            # fallback to in-process
            pass

    # in-process notify
    for cb in _listeners:
        try:
            cb(event)
        except Exception:
            pass


def subscribe(callback: Callable[[dict], Any]) -> Callable[[], None]:
    """Register an in-process listener. Returns an unsubscribe callable."""
    _listeners.append(callback)
    def unsubscribe():
        try:
            _listeners.remove(callback)
        except Exception:
            pass
    return unsubscribe
*** End Patch