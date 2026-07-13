"""Authentication services — admin login + WeChat jscode2session."""
from __future__ import annotations

from datetime import datetime, timedelta

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.core.exceptions import AuthRequired
from app.core.security import create_access_token, hash_password, verify_password
from app.models import AdminUser, User
from app.services.audit import write_login_log


# ---------- ADMIN ----------

def admin_login(
    db: Session,
    *,
    username: str,
    password: str,
    ip: str | None,
    user_agent: str | None,
) -> tuple[str, AdminUser]:
    admin = db.execute(
        select(AdminUser).where(AdminUser.username == username)
    ).scalar_one_or_none()

    if admin is None or not verify_password(password, admin.password_hash):
        if admin is not None:
            admin.failed_login_count += 1
            # basic lockout: 5 failures → 10 min lock
            if admin.failed_login_count >= 5:
                admin.locked_until = datetime.utcnow() + timedelta(minutes=10)
            db.commit()
        write_login_log(
            db, subject_type="ADMIN", subject_id=admin.id if admin else None,
            username_or_openid=username, success=False, fail_reason="bad_credentials",
            ip=ip, user_agent=user_agent,
        )
        raise AuthRequired("账号或密码错误")

    if not admin.is_active:
        write_login_log(
            db, subject_type="ADMIN", subject_id=admin.id, username_or_openid=username,
            success=False, fail_reason="inactive", ip=ip, user_agent=user_agent,
        )
        raise AuthRequired("账号已停用")

    if admin.locked_until and admin.locked_until > datetime.utcnow():
        write_login_log(
            db, subject_type="ADMIN", subject_id=admin.id, username_or_openid=username,
            success=False, fail_reason="locked", ip=ip, user_agent=user_agent,
        )
        raise AuthRequired("账号已锁定，请稍后再试")

    admin.failed_login_count = 0
    admin.locked_until = None
    db.commit()
    write_login_log(
        db, subject_type="ADMIN", subject_id=admin.id, username_or_openid=username,
        success=True, ip=ip, user_agent=user_agent,
    )
    token = create_access_token(subject_type="ADMIN", subject_id=admin.id, extra={"is_super_admin": admin.is_super_admin})
    return token, admin


# ---------- WECHAT ----------

def wechat_login(
    db: Session,
    *,
    code_or_openid: str,
    nickname: str | None,
    ip: str | None,
    user_agent: str | None,
) -> tuple[str, User]:
    """Exchange the one-time code returned by wx.login for a stable openid."""
    if not settings.wechat_appid or not settings.wechat_secret:
        raise AuthRequired("服务端未配置 WECHAT_APPID/WECHAT_SECRET")
    try:
        resp = httpx.get(
            "https://api.weixin.qq.com/sns/jscode2session",
            params={
                "appid": settings.wechat_appid,
                "secret": settings.wechat_secret,
                "js_code": code_or_openid,
                "grant_type": "authorization_code",
            },
            timeout=5.0,
        )
        resp.raise_for_status()
        data = resp.json()
    except Exception as exc:  # pragma: no cover
        write_login_log(
            db, subject_type="USER", subject_id=None, username_or_openid=code_or_openid,
            success=False, fail_reason="wechat_unreachable", ip=ip, user_agent=user_agent,
        )
        raise AuthRequired(f"微信服务不可达：{exc}") from exc
    if "openid" not in data:
        write_login_log(
            db, subject_type="USER", subject_id=None, username_or_openid=code_or_openid,
            success=False, fail_reason=f"wechat:{data.get('errmsg', 'unknown')}",
            ip=ip, user_agent=user_agent,
        )
        raise AuthRequired(f"微信登录失败：{data.get('errmsg', 'code 无效')}")
    openid = data["openid"]

    user = db.execute(select(User).where(User.openid == openid)).scalar_one_or_none()
    if user is None:
        user = User(openid=openid, nickname=nickname or "学习用户")
        db.add(user)
        db.commit()
        db.refresh(user)

    if user.is_banned:
        write_login_log(
            db, subject_type="USER", subject_id=user.id, username_or_openid=openid,
            success=False, fail_reason="banned", ip=ip, user_agent=user_agent,
        )
        raise AuthRequired("账号已封禁")

    write_login_log(
        db, subject_type="USER", subject_id=user.id, username_or_openid=openid,
        success=True, ip=ip, user_agent=user_agent,
    )
    token = create_access_token(subject_type="USER", subject_id=user.id)
    return token, user
