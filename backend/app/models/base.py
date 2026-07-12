"""Re-export all ORM models so Alembic autogen + cross-imports work."""
from app.database import Base  # noqa: F401

# Import order matters only when models reference each other; SQLAlchemy
# resolves relationships lazily, so we just need each class to be imported
# once so it registers on Base.metadata.
from app.models.audit import AuditLog, LoginLog  # noqa: F401
from app.models.catalog import (  # noqa: F401
    Chapter,
    Exam,
    ExamCategory,
    KnowledgePoint,
    Subject,
)
from app.models.feedback import FeedbackReply, QuestionFeedback  # noqa: F401
from app.models.import_job import ImportJob, ImportJobRow  # noqa: F401
from app.models.ops import Announcement, DailyPracticeConfig, HomeBanner  # noqa: F401
from app.models.paper import Paper, PaperQuestion, PaperVersion  # noqa: F401
from app.models.practice import (  # noqa: F401
    PracticeSession,
    SessionQuestion,
    UserAnswer,
)
from app.models.question import (  # noqa: F401
    Question,
    QuestionAsset,
    QuestionKnowledgePoint,
    QuestionOption,
    QuestionReviewRecord,
    QuestionVersion,
)
from app.models.user import User, UserExamTarget  # noqa: F401
from app.models.admin import (  # noqa: F401
    AdminUser,
    AdminUserRole,
    Permission,
    Role,
    RolePermission,
)
from app.models.user_state import UserDailyStat, UserQuestionState  # noqa: F401
from app.models.audit import IdempotencyKey  # noqa: F401


__all__ = [
    "Base",
    # catalog
    "ExamCategory",
    "Exam",
    "Subject",
    "Chapter",
    "KnowledgePoint",
    # user
    "User",
    "UserExamTarget",
    # question
    "Question",
    "QuestionVersion",
    "QuestionOption",
    "QuestionKnowledgePoint",
    "QuestionAsset",
    "QuestionReviewRecord",
    # paper
    "Paper",
    "PaperVersion",
    "PaperQuestion",
    # practice
    "PracticeSession",
    "SessionQuestion",
    "UserAnswer",
    # state
    "UserQuestionState",
    "UserDailyStat",
    # ops
    "HomeBanner",
    "Announcement",
    "DailyPracticeConfig",
    # feedback
    "QuestionFeedback",
    "FeedbackReply",
    # import
    "ImportJob",
    "ImportJobRow",
    # admin
    "AdminUser",
    "Role",
    "Permission",
    "AdminUserRole",
    "RolePermission",
    # audit
    "AuditLog",
    "LoginLog",
    "IdempotencyKey",
]