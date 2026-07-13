"""C-end auth: WeChat code login."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import resolve_user
from app.models import User
from app.services.auth_service import wechat_login

router = APIRouter()


class WechatLoginReq(BaseModel):
    code: str = Field(..., min_length=1, description="wx.login 返回的一次性 code")
    nickname: str | None = None


class WechatLoginResp(BaseModel):
    token: str
    user: dict


@router.post("/wechat/login", response_model=WechatLoginResp)
def login(payload: WechatLoginReq, request: Request, db: Session = Depends(get_db)):
    token, user = wechat_login(
        db,
        code_or_openid=payload.code,
        nickname=payload.nickname,
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    return {
        "token": token,
        "user": {
            "id": user.id,
            "openid": user.openid,
            "nickname": user.nickname,
            "avatar_url": user.avatar_url,
            "agreed_privacy_version": user.agreed_privacy_version,
        },
    }


@router.get("/me")
def me(user: User = Depends(resolve_user)):
    return {
        "id": user.id,
        "openid": user.openid,
        "nickname": user.nickname,
        "avatar_url": user.avatar_url,
        "agreed_privacy_version": user.agreed_privacy_version,
        "agreed_at": user.agreed_at.isoformat() if user.agreed_at else None,
    }
