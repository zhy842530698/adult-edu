"""Domain exceptions → uniform error envelope."""
from __future__ import annotations


class AppError(Exception):
    """Base class for all expected domain errors."""

    code: str = "INTERNAL_ERROR"
    http_status: int = 500

    def __init__(self, message: str = "", *, code: str | None = None, status: int | None = None) -> None:
        super().__init__(message or self.code)
        self.message = message or self.code
        if code:
            self.code = code
        if status:
            self.http_status = status


class AuthRequired(AppError):
    code = "AUTH_REQUIRED"
    http_status = 401


class PermissionDenied(AppError):
    code = "PERMISSION_DENIED"
    http_status = 403


class NotFound(AppError):
    code = "NOT_FOUND"
    http_status = 404


class Conflict(AppError):
    code = "CONFLICT"
    http_status = 409


class ValidationFailed(AppError):
    code = "VALIDATION_FAILED"
    http_status = 422


class QuestionNotPublished(AppError):
    code = "QUESTION_NOT_PUBLISHED"
    http_status = 400


class InvalidSelectedOptions(AppError):
    code = "INVALID_SELECTED_OPTIONS"
    http_status = 400


class SessionAlreadySubmitted(AppError):
    code = "SESSION_ALREADY_SUBMITTED"
    http_status = 400


class InsufficientQuestions(AppError):
    """Includes payload extras (actual_available)."""

    code = "INSUFFICIENT_QUESTIONS"
    http_status = 400

    def __init__(self, message: str = "题量不足", *, actual_available: int = 0) -> None:
        super().__init__(message)
        self.actual_available = actual_available


class PoolCompleted(AppError):
    """SEQUENTIAL 创建会话时被拒：用户在该 exam 下答过的题量已覆盖已发布题库。"""

    code = "POOL_COMPLETED"
    http_status = 400


class ImportValidationFailed(AppError):
    code = "IMPORT_VALIDATION_FAILED"
    http_status = 422


class VersionConflict(AppError):
    code = "VERSION_CONFLICT"
    http_status = 409


class IdempotencyConflict(AppError):
    code = "IDEMPOTENCY_CONFLICT"
    http_status = 409