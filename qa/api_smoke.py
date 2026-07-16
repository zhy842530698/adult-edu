"""End-to-end API smoke test for C-end endpoints.

Runs real HTTP calls against the backend using a JWT generated for user_id=1.
Outputs results as JSON to docs/qa/logs/api-smoke-result.json.
"""
from __future__ import annotations
import json
import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

import httpx

from app.core.security import create_access_token
from app.database import SessionLocal
from app.models import User

BASE = "http://127.0.0.1:8000/api/v1"
OUT = Path(__file__).resolve().parent.parent / "docs" / "qa" / "logs" / "api-smoke-result.json"
OUT.parent.mkdir(parents=True, exist_ok=True)


def make_user_token(user_id: int) -> str:
    return create_access_token(subject_type="USER", subject_id=user_id)


def ensure_user() -> int:
    db = SessionLocal()
    user = db.query(User).first()
    if not user:
        user = User(openid="qa_smoke_user", nickname="QA_Bot")
        db.add(user)
        db.commit()
        db.refresh(user)
    uid = user.id
    db.close()
    return uid


def run() -> None:
    uid = ensure_user()
    token = make_user_token(uid)
    headers = {"Authorization": f"Bearer {token}"}

    results: list[dict] = []
    plan = [
        ("GET", "/health", None, None, 200),
        ("GET", "/exam-catalog", None, headers, 200),
        ("GET", "/user/onboarding-status", None, headers, 200),
        ("GET", "/user/exam-targets", None, headers, 200),
        ("GET", "/progress/summary", None, headers, 200),
        ("GET", "/practice-sessions/daily-task", None, headers, 200),
        ("GET", "/wrong-questions", None, headers, 200),
        ("GET", "/favorites", None, headers, 200),
        ("GET", "/auth/me", None, headers, 200),
        # engagement endpoints (newly added)
        ("GET", "/study-plan", None, headers, 200),
        ("GET", "/notes", None, headers, 200),
        ("GET", "/check-ins", {"year": 2026, "month": 7}, headers, 200),
        ("POST", "/check-ins", {"date": "2026-07-16"}, headers, 200),
        ("GET", "/progress/weekly", None, headers, 200),
        # 401 path on a real protected endpoint
        ("GET", "/user/onboarding-status", None, {"Authorization": "Bearer invalid"}, 401),
    ]
    with httpx.Client(timeout=10.0) as c:
        for method, path, body, hdrs, expect in plan:
            url = BASE + path
            t0 = time.time()
            try:
                if method == "GET":
                    resp = c.get(url, headers=hdrs, params=body)
                else:
                    resp = c.post(url, headers=hdrs, json=body)
            except Exception as exc:
                results.append({
                    "method": method, "path": path, "expected": expect,
                    "status": -1, "error": str(exc), "ok": False,
                })
                continue
            dt = (time.time() - t0) * 1000
            ok = resp.status_code == expect
            try:
                payload = resp.json()
            except Exception:
                payload = resp.text[:200]
            results.append({
                "method": method, "path": path, "expected": expect,
                "status": resp.status_code, "ms": round(dt, 1),
                "ok": ok, "payload_excerpt": (
                    payload if isinstance(payload, (str, int, float, bool))
                    else {k: payload.get(k) for k in list(payload)[:6]}
                ) if isinstance(payload, dict) else str(payload)[:200],
            })

    # 写入结果
    OUT.write_text(json.dumps(results, ensure_ascii=False, indent=2))
    passed = sum(1 for r in results if r.get("ok"))
    failed = len(results) - passed
    print(f"API smoke done: {passed} passed, {failed} failed. Output: {OUT}")
    for r in results:
        marker = "✓" if r.get("ok") else "✗"
        print(f"  {marker} {r['method']:4s} {r['path']:35s} -> {r.get('status')} (expected {r['expected']})")


if __name__ == "__main__":
    run()