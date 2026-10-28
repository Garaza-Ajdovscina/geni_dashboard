#!/usr/bin/env python3
"""Dual-serial Arduino bridge → WebSocket for Gen-I kiosk GUI."""

from __future__ import annotations

import asyncio
import json
import logging
import sys
import threading
import time
from pathlib import Path

import serial
import yaml
import websockets
from websockets.server import serve

from merge import ControlsMerger
from protocol import parse_line
from snap_buttons import SnapButtonDetector

LOG = logging.getLogger("geni.bridge")
ROOT = Path(__file__).resolve().parent.parent
CONFIG_PATH = ROOT / "config.yaml"

clients: set[websockets.WebSocketServerProtocol] = set()
outgoing: asyncio.Queue[dict] | None = None
main_loop: asyncio.AbstractEventLoop | None = None
merger: ControlsMerger | None = None
snap_buttons: SnapButtonDetector | None = None
switches_snap_buttons: SnapButtonDetector | None = None


def load_config() -> dict:
    with open(CONFIG_PATH, encoding="utf-8") as f:
        return yaml.safe_load(f)


def enqueue(message: dict) -> None:
    if main_loop and outgoing:
        main_loop.call_soon_threadsafe(outgoing.put_nowait, message)


def handle_parsed_message(msg: dict) -> None:
    global merger, snap_buttons, switches_snap_buttons
    if merger is None:
        return

    if msg.get("type") == "button":
        enqueue(msg)
        return

    if msg.get("type") == "panel_snap":
        enqueue(msg)
        if snap_buttons is not None:
            for name in snap_buttons.edges(msg["states"]):
                LOG.info("Panel button (snap edge): %s", name)
                enqueue({"type": "button", "name": name})
        return

    if msg.get("type") == "switches_snap":
        enqueue(msg)
        if switches_snap_buttons is not None:
            for name in switches_snap_buttons.edges(msg["states"]):
                LOG.info("Switches button (snap edge): %s", name)
                enqueue({"type": "button", "name": name})
        return

    if msg.get("type") != "controls_partial":
        return

    if msg.get("source") == "switches":
        enqueue(merger.update_switches_board(msg))
        return


def serial_reader(name: str, port: str, baud: int) -> None:
    while True:
        try:
            LOG.info("Opening %s on %s", name, port)
            with serial.Serial(port, baud, timeout=0.1) as ser:
                ser.reset_input_buffer()
                while True:
                    raw = ser.readline()
                    if not raw:
                        continue
                    line = raw.decode("utf-8", errors="ignore").strip()
                    if not line:
                        continue
                    if line.startswith("P,evt,") or line.startswith("S,evt,"):
                        LOG.info("Hardware button (%s): %s", name, line)
                    msg = parse_line(line)
                    if msg:
                        handle_parsed_message(msg)
        except serial.SerialException as exc:
            LOG.warning("%s serial error: %s — retry in 3s", name, exc)
            time.sleep(3)


async def broadcaster() -> None:
    assert outgoing is not None
    while True:
        message = await outgoing.get()
        payload = json.dumps(message)
        stale: list[websockets.WebSocketServerProtocol] = []
        for ws in clients:
            try:
                await ws.send(payload)
            except websockets.ConnectionClosed:
                stale.append(ws)
        for ws in stale:
            clients.discard(ws)


async def ws_handler(websocket: websockets.WebSocketServerProtocol) -> None:
    clients.add(websocket)
    LOG.info("WebSocket client connected (%d total)", len(clients))
    try:
        async for _ in websocket:
            pass
    finally:
        clients.discard(websocket)
        LOG.info("WebSocket client disconnected")


async def main_async(cfg: dict) -> None:
    global outgoing, main_loop, merger, snap_buttons, switches_snap_buttons
    main_loop = asyncio.get_running_loop()
    outgoing = asyncio.Queue()
    merger = ControlsMerger(cfg)
    snap_buttons = SnapButtonDetector(cfg.get("button_names"))
    switches_snap_buttons = SnapButtonDetector(cfg.get("switches_button_names"))

    host = cfg.get("websocket_host", "127.0.0.1")
    port = cfg.get("websocket_port", 8765)
    baud = cfg.get("baud", 115200)

    threading.Thread(
        target=serial_reader,
        args=("switches", cfg["switches_port"], baud),
        daemon=True,
    ).start()
    threading.Thread(
        target=serial_reader,
        args=("panel", cfg["buttons_port"], baud),
        daemon=True,
    ).start()

    asyncio.create_task(broadcaster())

    LOG.info("WebSocket server ws://%s:%s", host, port)
    LOG.info("Switches board (pots+stikala): %s", cfg["switches_port"])
    LOG.info("Buttons board (pots+gumbi): %s", cfg["buttons_port"])
    async with serve(ws_handler, host, port):
        await asyncio.Future()


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    cfg = load_config()
    try:
        asyncio.run(main_async(cfg))
    except KeyboardInterrupt:
        LOG.info("Bridge stopped")


if __name__ == "__main__":
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    main()
