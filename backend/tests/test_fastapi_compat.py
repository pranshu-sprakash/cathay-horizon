"""TEST-ONLY FastAPI compatibility harness for spatial_and_flight (MAE #2).

This is NOT the production server (backend/main.py is owned by the CS Lead and does not
exist in this tree). It proves only that the module's outputs survive real FastAPI /
Starlette JSON serialisation from (a) a sync ``def`` route, which FastAPI runs in its
threadpool, and (b) an ``async def`` route that explicitly offloads with
``run_in_threadpool``. Route paths below are local to this test, not proposed endpoints.
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse
from fastapi.testclient import TestClient

BACKEND = Path(__file__).resolve().parents[1]
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

import spatial_and_flight as saf  # noqa: E402


def _app() -> FastAPI:
    app = FastAPI()

    @app.get("/t/window/{delay}")
    def window_sync(delay: int, debug: bool = False):          # sync -> FastAPI threadpool
        return saf.get_oag_and_window_moments("CX524", delay, None, debug=debug)

    @app.get("/t/window-async/{delay}")
    async def window_async(delay: int):                         # async -> explicit offload
        return await run_in_threadpool(saf.get_oag_and_window_moments, "CX524", delay)

    @app.post("/t/assist/{seat}")
    def assist(seat: str, response: dict):
        persona = saf.get_demo_personas()[seat]
        result = saf.apply_assistance_response(persona, "CX524", response)
        new_persona = {**persona, "assistance": result["assistance"]} if result["error"] is None else persona
        return {"apply": result, "prompt": saf.get_assistance_prompt(new_persona),
                "plan": saf.build_assistance_service_plan(new_persona, "CX524", 40)}

    @app.get("/t/schedule/{delay}")
    def schedule(delay: int):
        return saf.get_flight_schedule("CX524", delay)

    return app


@pytest.fixture(scope="module")
def client():
    saf.clear_window_cache()
    with TestClient(_app()) as c:
        yield c


@pytest.mark.parametrize("delay", [0, 40, 600])
def test_window_payload_roundtrips_through_fastapi(client, delay):
    direct = saf.get_oag_and_window_moments("CX524", delay)
    for path in (f"/t/window/{delay}", f"/t/window-async/{delay}"):
        r = client.get(path)
        assert r.status_code == 200
        assert r.json() == json.loads(json.dumps(direct, allow_nan=False))


def test_debug_payload_and_schedule_through_fastapi(client):
    r = client.get("/t/window/40", params={"debug": "true"})
    assert r.status_code == 200 and r.json()["debug"]["samples"]
    s = client.get("/t/schedule/40").json()
    assert s["gate_arrival"]["display"] == "06:55 JST"


@pytest.mark.parametrize("seat,option", [("12K", "YES_SAME"), ("11A", "NO"), ("14K", "YES_NEW"), ("12K", "FORGET"),
                                         ("12K", "BOGUS")])
def test_assistance_flow_through_fastapi(client, seat, option):
    r = client.post(f"/t/assist/{seat}", json={"option": option, "level": "WCHR"})
    assert r.status_code == 200
    body = r.json()
    assert body["apply"]["schema_version"] == "assist-1"
    if option == "BOGUS":
        assert body["apply"]["error"]


def test_degraded_payload_through_fastapi(client, monkeypatch):
    def boom(*a, **k):
        raise RuntimeError("x")
    saf.clear_window_cache()
    monkeypatch.setattr(saf.ephem, "Observer", boom)
    r = client.get("/t/window/40")
    assert r.status_code == 200 and r.json()["degraded"] is True and r.json()["schedule"]


def test_installed_starlette_rejects_nan_so_module_must_not_emit_it():
    """Documents the framework behaviour the strict-JSON boundary protects against."""
    with pytest.raises(ValueError):
        JSONResponse({"x": math.nan})
