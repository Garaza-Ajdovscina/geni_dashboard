#!/usr/bin/env python3
"""Mock hardware bridge for local development without Arduinos."""

from __future__ import annotations

import asyncio
import json
import math
import time

import websockets
from websockets.server import serve

HOST = "127.0.0.1"
PORT = 8765


async def handler(websocket) -> None:
    t0 = time.time()
    try:
        while True:
            t = time.time() - t0
            controls = {
                "type": "controls",
                "pots": {
                    "nuclear": 50 + 30 * math.sin(t * 0.3),
                    "hydro": 50 + 20 * math.sin(t * 0.2 + 1),
                    "gas": 40 + 15 * math.sin(t * 0.25 + 2),
                    "batteryFlow": 50 + 10 * math.sin(t * 0.15),
                },
                "toggles": {
                    "solar": True,
                    "wind": True,
                    "nuclear": True,
                    "hydro": True,
                    "gas": True,
                },
                "battery": "charge",
            }
            await websocket.send(json.dumps(controls))
            await asyncio.sleep(0.1)
    except websockets.ConnectionClosed:
        pass


async def main() -> None:
    async with serve(handler, HOST, PORT):
        print(f"Mock bridge ws://{HOST}:{PORT}")
        await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())
