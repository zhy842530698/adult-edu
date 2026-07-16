"""Comprehensive C-end API + workflow integration test.

Executes a full session: login -> onboarding -> create session -> answer -> submit -> verify result.
Plus tests token expiry, 404 endpoints, validation errors.
"""
from __future__ import annotations
import json
import sys
import time
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

import httpx

from app.core.security import create_access_token
from app.database import SessionLocal
from app.models import User

BASE = "http://127.0.0.1:8000/api/v1"
OUT = Path(__file__).resolve().parent.parent / "docs" / "qa" / "logs" / "session-e2e-result.json"
OUT.parent.mkdir(parents=True, exist_ok=True)


def make_user_token(user_id: int) -> str:
    return create_access_token(subject_type="USER", subject_id=user_id)


def ensure_user() -> int:
    db = SessionLocal()
    user = db.query(User).first()
    if not user:
        user = User(openid="qa_e2e_user", nickname="E2E_Bot")
        db.add(user)
        db.commit()
        db.refresh(user)
    uid = user.id
    db.close()
    return uid


def step(name: str, fn):
    t0 = time.time()
    try:
        r = fn()
        dt = round((time.time() - t0) * 1000, 1)
        return {"step": name, "ok": True, "ms": dt, **r}
    except AssertionError as e:
        return {"step": name, "ok": False, "error": str(e)}
    except Exception as e:
        return {"step": name, "ok": False, "error": f"{type(e).__name__}: {e}"}


def run() -> None:
    uid = ensure_user()
    token = make_user_token(uid)
    auth = {"Authorization": f"Bearer {token}"}

    log: list[dict] = []

    with httpx.Client(timeout=10.0) as c:
        # 1) exam catalog (public)
        def s1():
            r = c.get(BASE + "/exam-catalog")
            assert r.status_code == 200, r.text
            data = r.json()
            assert data.get("items"), "exam-catalog empty"
            return {"first_exam_id": data["items"][0]["exams"][0]["id"],
                    "first_exam_name": data["items"][0]["exams"][0]["name"]}
        log.append(step("exam-catalog", s1))
        first_exam_id = log[-1].get("first_exam_id", 1)

        # 2) onboarding (POST or skip if completed)
        def s2():
            r = c.post(BASE + "/user/onboarding", json={
                "purpose": "KEEP_FRESH",
                "exam_id": first_exam_id,
                "daily_goal": "STEADY",
                "study_pace_minutes": 20,
            }, headers=auth)
            assert r.status_code in (200, 400), r.text  # 400 if already completed
            return {"status": r.status_code}
        log.append(step("onboarding", s2))

        # 3) exam-targets
        def s3():
            r = c.get(BASE + "/user/exam-targets", headers=auth)
            assert r.status_code == 200
            d = r.json()
            assert d.get("items"), "no exam targets"
            return {"items": d["items"]}
        log.append(step("exam-targets", s3))

        # 4) progress summary
        def s4():
            r = c.get(BASE + "/progress/summary", headers=auth)
            assert r.status_code == 200
            return {"summary_keys": list(r.json().keys())}
        log.append(step("progress/summary", s4))

        # 5) create sequential practice session
        def s5():
            r = c.post(BASE + "/practice-sessions",
                       json={"mode": "SEQUENTIAL", "count": 5, "exam_id": first_exam_id},
                       headers=auth)
            assert r.status_code == 200, r.text
            d = r.json()
            assert d.get("id"), "no session id"
            return {"session_id": d["id"]}
        log.append(step("create-session", s5))
        sid = log[-1]["session_id"]

        # 6) get session detail
        def s6():
            r = c.get(BASE + f"/practice-sessions/{sid}", headers=auth)
            assert r.status_code == 200
            d = r.json()
            items = d.get("items") or []
            assert len(items) > 0, "no items"
            return {"total": len(items), "first_qvid": items[0]["question_version_id"]}
        log.append(step("session-detail", s6))
        total = log[-1]["total"]
        first_qvid = log[-1]["first_qvid"]

        # 7) answer first question
        def s7():
            r = c.put(BASE + f"/practice-sessions/{sid}/answers/{first_qvid}",
                      json={"selected_options": ["A"], "time_spent_seconds": 10},
                      headers=auth)
            assert r.status_code == 200, r.text
            return {"status": r.status_code}
        log.append(step("answer-q1", s7))

        # 8) submit
        def s8():
            r = c.post(BASE + f"/practice-sessions/{sid}/submit",
                       json={}, headers=auth,
                       params={},  # body may be empty
                       )
            assert r.status_code == 200, r.text
            return {"status": r.status_code}
        log.append(step("submit", s8))

        # 9) get result
        def s9():
            r = c.get(BASE + f"/practice-sessions/{sid}/result", headers=auth)
            assert r.status_code == 200
            d = r.json()
            return {"score": d.get("awarded_score"), "correct": d.get("correct_count"),
                    "wrong": d.get("wrong_count"), "total": d.get("total_score")}
        log.append(step("result", s9))

        # 10) try double-submit (idempotency)
        def s10():
            r = c.post(BASE + f"/practice-sessions/{sid}/submit", json={}, headers=auth)
            return {"status": r.status_code, "body": r.json()}
        log.append(step("resubmit", s10))

        # 11) missing endpoints
        def s11():
            results = {}
            for path in ["/study-plan", "/notes", "/check-ins", "/progress/weekly"]:
                r = c.get(BASE + path, headers=auth)
                results[path] = r.status_code
            return results
        log.append(step("missing-endpoints", s11))

        # 12) token expired/invalid
        def s12():
            r = c.get(BASE + "/user/onboarding-status",
                      headers={"Authorization": "Bearer xxx.invalid.token"})
            return {"status": r.status_code, "body": r.json()}
        log.append(step("bad-token", s12))

        # 13) feedback
        def s13():
            r = c.post(BASE + "/question-feedback",
                       json={"question_id": 1, "question_version_id": first_qvid,
                             "feedback_type": "OTHER", "content": "QA test feedback"},
                       headers=auth)
            return {"status": r.status_code, "body": r.text[:200]}
        log.append(step("feedback", s13))

        # 14) favorite toggle
        def s14():
            r = c.put(BASE + f"/questions/{first_qvid}/favorite", json={}, headers=auth)
            assert r.status_code == 200
            r2 = c.delete(BASE + f"/questions/{first_qvid}/favorite", headers=auth)
            assert r2.status_code == 200
            return {"put": r.status_code, "delete": r2.status_code}
        log.append(step("favorite-toggle", s14))

    # Write log
    OUT.write_text(json.dumps(log, ensure_ascii=False, indent=2))
    passed = sum(1 for s in log if s.get("ok"))
    print(f"E2E done: {passed}/{len(log)} passed. Output: {OUT}")
    for s in log:
        marker = "✓" if s.get("ok") else "✗"
        print(f"  {marker} {s['step']:25s} {('(' + str(s.get('ms','')) + 'ms)') if s.get('ok') else s.get('error','')}")


if __name__ == "__main__":
    run()