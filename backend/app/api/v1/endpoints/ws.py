from __future__ import annotations

import asyncio
import json
from typing import AsyncIterator

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core import pubsub

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    # In-process listener: we push events to the connected websocket
    loop = asyncio.get_event_loop()
    queue: asyncio.Queue[dict] = asyncio.Queue()

    def _on_event(ev: dict) -> None:
        # run_coroutine_threadsafe to put into queue
        try:
            loop.call_soon_threadsafe(queue.put_nowait, ev)
        except Exception:
            pass

    unsubscribe = pubsub.subscribe(_on_event)

    # If Redis is configured, also listen to Redis pubsub in background
    redis_task = None
    if pubsub.REDIS_URL and getattr(pubsub, 'redis', None) is not None:
        async def _redis_loop():
            try:
                client = pubsub.redis.from_url(pubsub.REDIS_URL)
                ps = client.pubsub()
                await ps.subscribe('aegis_events')
                async for msg in ps.listen():
                    if msg and msg.get('type') == 'message':
                        try:
                            payload = json.loads(msg.get('data'))
                            await queue.put(payload)
                        except Exception:
                            pass
            except Exception:
                pass
        redis_task = asyncio.create_task(_redis_loop())

    try:
        while True:
            # send any queued events
            try:
                ev = await asyncio.wait_for(queue.get(), timeout=0.1)
                await websocket.send_text(json.dumps(ev, default=str))
            except asyncio.TimeoutError:
                # check for incoming client messages (ping/pong)
                try:
                    data = await asyncio.wait_for(websocket.receive_text(), timeout=0.01)
                    # ignore or handle client pings
                except asyncio.TimeoutError:
                    await asyncio.sleep(0.05)
    except WebSocketDisconnect:
        pass
    finally:
        unsubscribe()
        if redis_task:
            redis_task.cancel()
*** End Patch