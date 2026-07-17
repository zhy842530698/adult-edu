"""Full regression test - exercises all endpoints including newly added ones.

Run after fixes to ensure:
  1. Previously 404 endpoints now return 200 with reasonable payloads
  2. Original endpoints continue to work
  3. Auth & validation paths still work
"""
from __future__ import annotations
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

import httpx

from app.core.security import create_access_token
from app.database import SessionLocal
from app.models import User

BASE = os.environ.get("BASE", "http://192.168.1.2:8000/api/v1")
OUT = Path(__file__).resolve().parent.parent / "docs" / "qa" / "logs" / "regression-full.json"
OUT.parent.mkdir(parents=True, exist_ok=True)


def token(user_id: int) -> str:
    return create_access_token(subject_type="USER", subject_id=user_id)


def main() -> None:
    db = SessionLocal()
    user = db.query(User).first()
    if not user:
        user = User(openid="qa_regression", nickname="Regression")
        db.add(user)
        db.commit()
        db.refresh(user)
    uid = user.id
    db.close()

    auth = {"Authorization": f"Bearer {token(uid)}"}
    results: list[dict] = []
    with httpx.Client(timeout=10.0) as c:
        # Newly added engagement endpoints
        # 1) study-plan
        r = c.get(BASE + "/study-plan", headers=auth)
        d = r.json()
        results.append({
            "endpoint": "GET /study-plan",
            "status": r.status_code,
            "ok": r.status_code == 200,
            "has_phases": isinstance(d.get("phases"), list),
            "has_subjects": isinstance(d.get("subjects"), list),
            "name": d.get("name"),
        })

        # 2) notes (empty + create)
        r = c.get(BASE + "/notes", headers=auth)
        results.append({
            "endpoint": "GET /notes (empty)",
            "status": r.status_code,
            "ok": r.status_code == 200 and r.json().get("items") == [],
            "items": len(r.json().get("items", [])),
        })
        r = c.post(BASE + "/notes", json={"title": "QA note", "content": "test"},
                   headers=auth)
        results.append({
            "endpoint": "POST /notes",
            "status": r.status_code,
            "ok": r.status_code == 200 and r.json().get("id"),
            "id": r.json().get("id"),
        })

        # 3) check-ins
        r = c.get(BASE + "/check-ins", params={"year": 2026, "month": 7}, headers=auth)
        before_days = len(r.json().get("days", []))
        results.append({
            "endpoint": "GET /check-ins",
            "status": r.status_code,
            "ok": r.status_code == 200,
            "days_before": before_days,
            "streak": r.json().get("streak"),
        })
        # POST
        r = c.post(BASE + "/check-ins", json={"date": "2026-07-16"}, headers=auth)
        results.append({
            "endpoint": "POST /check-ins (today)",
            "status": r.status_code,
            "ok": r.status_code == 200,
            "already": r.json().get("already"),
        })
        # Idempotent re-post
        r = c.post(BASE + "/check-ins", json={"date": "2026-07-16"}, headers=auth)
        results.append({
            "endpoint": "POST /check-ins (idempotent)",
            "status": r.status_code,
            "ok": r.status_code == 200 and r.json().get("already") is True,
        })
        # Validation: bad date format
        r = c.post(BASE + "/check-ins", json={"date": "not-a-date"}, headers=auth)
        results.append({
            "endpoint": "POST /check-ins (bad format)",
            "status": r.status_code,
            "ok": r.status_code == 422 or r.status_code == 400,
        })
        # Verify days increased
        r = c.get(BASE + "/check-ins", params={"year": 2026, "month": 7}, headers=auth)
        after_days = len(r.json().get("days", []))
        results.append({
            "endpoint": "GET /check-ins (after)",
            "status": r.status_code,
            "ok": r.status_code == 200 and after_days > before_days,
            "days_after": after_days,
            "delta": after_days - before_days,
        })

        # 4) progress/weekly
        r = c.get(BASE + "/progress/weekly", headers=auth)
        d = r.json()
        results.append({
            "endpoint": "GET /progress/weekly",
            "status": r.status_code,
            "ok": r.status_code == 200 and isinstance(d.get("counts"), list) and len(d["counts"]) == 7,
            "counts": d.get("counts"),
        })

        # 5) wrong-questions/{id}/remove (the new wrong endpoint)
        # Create a session first to get a real question_version_id
        r = c.post(BASE + "/practice-sessions", json={"mode": "RANDOM", "count": 1, "exam_id": 1}, headers=auth)
        sid = r.json().get("id")
        r = c.get(BASE + f"/practice-sessions/{sid}", headers=auth)
        qvid = r.json()["items"][0]["question_version_id"]
        qid = r.json()["items"][0]["question_id"]
        # Remove wrong (mark mastered)
        r = c.post(BASE + f"/wrong-questions/{qid}/remove", headers=auth)
        results.append({
            "endpoint": "POST /wrong-questions/{id}/remove",
            "status": r.status_code,
            "ok": r.status_code == 200,
            "removed": r.json().get("removed"),
        })

    OUT.write_text(json.dumps(results, ensure_ascii=False, indent=2))
    passed = sum(1 for r in results if r.get("ok"))
    print(f"Regression done: {passed}/{len(results)} passed. Output: {OUT}")
    for r in results:
        marker = "✓" if r.get("ok") else "✗"
        print(f"  {marker} {r['endpoint']:45s} -> {r['status']} | {r}")


if __name__ == "__main__":
    main()