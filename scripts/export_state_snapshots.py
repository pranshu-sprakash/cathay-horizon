"""Regenerate the state snapshots from what the server actually serves at startup.

    backend/.venv/bin/python scripts/export_state_snapshots.py            # frontend/public/mock_state.json
    backend/.venv/bin/python scripts/export_state_snapshots.py --source   # also backend/initial_state.json

mock_state.json  = full GET /api/state at startup (includes computed Window Moments,
                   schedule and assistance prompt/plan), for the frontend's offline preview.
initial_state.json (--source) = the same state minus the computed-only keys, so the source
                   file never carries stale hardcoded values. Offline: no network calls.
"""
from __future__ import annotations

import copy
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

import main  # noqa: E402  (loads initial_state.json and applies state_sync)

COMPUTED_TOP = ("window_moments",)
COMPUTED_FLIGHT = ("schedule",)
COMPUTED_PERSONA = ("window_moment_label", "assistance_prompt", "assistance_plan")


def _write(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False, allow_nan=False) + "\n", encoding="utf-8")
    print(f"wrote {path.relative_to(ROOT)}")


def main_cli(argv: list[str]) -> int:
    served = copy.deepcopy(main.load_initial_state())
    _write(ROOT / "frontend" / "public" / "mock_state.json", served)
    if "--source" in argv:
        source = copy.deepcopy(served)
        for k in COMPUTED_TOP:
            source.pop(k, None)
        for k in COMPUTED_FLIGHT:
            source.get("flight", {}).pop(k, None)
        for p in source.get("personas", {}).values():
            for k in COMPUTED_PERSONA:
                p.pop(k, None)
        _write(ROOT / "backend" / "initial_state.json", source)
    return 0


if __name__ == "__main__":
    sys.exit(main_cli(sys.argv[1:]))
