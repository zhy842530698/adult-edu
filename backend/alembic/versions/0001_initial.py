"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-07-12 22:00:00

This migration creates the full P0 schema. Future migrations should be split.
"""
from alembic import op
import sqlalchemy as sa


revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # catalog
    op.create_table(
        "exam_categories",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("code", sa.String(64), nullable=False, unique=True),
        sa.Column("name", sa.String(128), nullable=False),
        sa.Column("sort_order", sa.Integer, nullable=False, default=0),
        sa.Column("is_active", sa.Boolean, nullable=False, default=True),
        sa.Column("icon_url", sa.String(512)),
        sa.Column("description", sa.Text),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )
    op.create_table(
        "exams",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("category_id", sa.Integer, sa.ForeignKey("exam_categories.id"), nullable=False),
        sa.Column("code", sa.String(64), nullable=False, unique=True),
        sa.Column("name", sa.String(128), nullable=False),
        sa.Column("sort_order", sa.Integer, nullable=False, default=0),
        sa.Column("is_active", sa.Boolean, nullable=False, default=True),
        sa.Column("icon_url", sa.String(512)),
        sa.Column("description", sa.Text),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )
    op.create_table(
        "subjects",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("exam_id", sa.Integer, sa.ForeignKey("exams.id"), nullable=False),
        sa.Column("code", sa.String(64), nullable=False),
        sa.Column("name", sa.String(128), nullable=False),
        sa.Column("sort_order", sa.Integer, nullable=False, default=0),
        sa.Column("is_active", sa.Boolean, nullable=False, default=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
        sa.UniqueConstraint("exam_id", "code", name="uq_subjects_exam_code"),
    )
    op.create_table(
        "chapters",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("subject_id", sa.Integer, sa.ForeignKey("subjects.id"), nullable=False),
        sa.Column("code", sa.String(64), nullable=False),
        sa.Column("name", sa.String(128), nullable=False),
        sa.Column("sort_order", sa.Integer, nullable=False, default=0),
        sa.Column("is_active", sa.Boolean, nullable=False, default=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
        sa.UniqueConstraint("subject_id", "code", name="uq_chapters_subject_code"),
    )
    op.create_table(
        "knowledge_points",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("chapter_id", sa.Integer, sa.ForeignKey("chapters.id"), nullable=False),
        sa.Column("code", sa.String(64), nullable=False),
        sa.Column("name", sa.String(128), nullable=False),
        sa.Column("sort_order", sa.Integer, nullable=False, default=0),
        sa.Column("is_active", sa.Boolean, nullable=False, default=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
        sa.UniqueConstraint("chapter_id", "code", name="uq_kp_chapter_code"),
    )

    # users
    op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("openid", sa.String(128), nullable=False, unique=True),
        sa.Column("nickname", sa.String(128)),
        sa.Column("avatar_url", sa.String(512)),
        sa.Column("agreed_privacy_version", sa.String(32)),
        sa.Column("agreed_at", sa.DateTime),
        sa.Column("is_banned", sa.Boolean, nullable=False, default=False),
        sa.Column("banned_reason", sa.String(256)),
        sa.Column("anonymized_at", sa.DateTime),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )
    op.create_table(
        "user_exam_targets",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("exam_id", sa.Integer, sa.ForeignKey("exams.id"), nullable=False),
        sa.Column("is_primary", sa.Boolean, nullable=False, default=False),
        sa.Column("daily_question_goal", sa.Integer, nullable=False, default=20),
        sa.Column("target_exam_date", sa.Date),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
        sa.UniqueConstraint("user_id", "exam_id", name="uq_user_exam_target"),
    )

    # questions
    op.create_table(
        "questions",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("question_type", sa.String(32), nullable=False),  # SINGLE_CHOICE / MULTIPLE_CHOICE
        sa.Column("exam_id", sa.Integer, sa.ForeignKey("exams.id"), nullable=False),
        sa.Column("subject_id", sa.Integer, sa.ForeignKey("subjects.id"), nullable=False),
        sa.Column("chapter_id", sa.Integer, sa.ForeignKey("chapters.id")),
        sa.Column("difficulty", sa.Integer, nullable=False, default=3),
        sa.Column("tags", sa.String(512)),
        sa.Column("current_version_id", sa.Integer),  # set after first publish
        sa.Column("latest_version_no", sa.Integer, nullable=False, default=1),
        sa.Column("created_by", sa.Integer),  # admin_user_id
        sa.Column("last_editor_admin_id", sa.Integer),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )
    op.create_index("ix_questions_exam_subject", "questions", ["exam_id", "subject_id"])

    op.create_table(
        "question_versions",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("question_id", sa.Integer, sa.ForeignKey("questions.id"), nullable=False),
        sa.Column("version_no", sa.Integer, nullable=False),
        sa.Column("status", sa.String(32), nullable=False, default="DRAFT"),  # DRAFT/REVIEW_PENDING/PUBLISHED/REJECTED/OFFLINE
        sa.Column("stem", sa.Text, nullable=False),
        sa.Column("analysis", sa.Text, nullable=False),
        sa.Column("correct_options", sa.String(64), nullable=False),  # JSON-encoded list e.g. '["A"]'
        sa.Column("score", sa.Float, nullable=False, default=1.0),
        sa.Column("scoring_rule", sa.String(32), nullable=False, default="EXACT_MATCH"),
        sa.Column("source_name", sa.String(256), nullable=False),
        sa.Column("source_year", sa.Integer),
        sa.Column("source_question_no", sa.String(64)),
        sa.Column("license_type", sa.String(64), nullable=False),
        sa.Column("external_ref", sa.String(256)),
        sa.Column("published_by", sa.Integer),
        sa.Column("published_at", sa.DateTime),
        sa.Column("created_by", sa.Integer, nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.UniqueConstraint("question_id", "version_no", name="uq_qv_question_version"),
    )
    op.create_table(
        "question_options",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("question_version_id", sa.Integer, sa.ForeignKey("question_versions.id"), nullable=False),
        sa.Column("option_code", sa.String(4), nullable=False),  # A-H
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("sort_order", sa.Integer, nullable=False, default=0),
        sa.UniqueConstraint("question_version_id", "option_code", name="uq_qo_version_code"),
    )
    op.create_table(
        "question_knowledge_points",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("question_version_id", sa.Integer, sa.ForeignKey("question_versions.id"), nullable=False),
        sa.Column("knowledge_point_id", sa.Integer, sa.ForeignKey("knowledge_points.id"), nullable=False),
        sa.UniqueConstraint("question_version_id", "knowledge_point_id", name="uq_qkp_version_kp"),
    )
    op.create_table(
        "question_assets",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("question_version_id", sa.Integer, sa.ForeignKey("question_versions.id"), nullable=False),
        sa.Column("asset_type", sa.String(16), nullable=False),  # IMAGE/AUDIO
        sa.Column("url", sa.String(512), nullable=False),
        sa.Column("file_name", sa.String(256)),
        sa.Column("file_size", sa.Integer),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )
    op.create_table(
        "question_review_records",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("question_version_id", sa.Integer, sa.ForeignKey("question_versions.id"), nullable=False),
        sa.Column("submitted_by", sa.Integer, nullable=False),
        sa.Column("reviewer_id", sa.Integer),
        sa.Column("decision", sa.String(16), nullable=False),  # PENDING/APPROVED/REJECTED
        sa.Column("reject_reason", sa.Text),
        sa.Column("submitted_at", sa.DateTime, nullable=False),
        sa.Column("reviewed_at", sa.DateTime),
    )

    # papers
    op.create_table(
        "papers",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("exam_id", sa.Integer, sa.ForeignKey("exams.id"), nullable=False),
        sa.Column("title", sa.String(256), nullable=False),
        sa.Column("paper_type", sa.String(32), nullable=False, default="PRACTICE"),  # PRACTICE/MOCK/REAL_PAST
        sa.Column("description", sa.Text),
        sa.Column("is_published", sa.Boolean, nullable=False, default=False),
        sa.Column("current_version_id", sa.Integer),
        sa.Column("created_by", sa.Integer, nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )
    op.create_table(
        "paper_versions",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("paper_id", sa.Integer, sa.ForeignKey("papers.id"), nullable=False),
        sa.Column("version_no", sa.Integer, nullable=False, default=1),
        sa.Column("total_questions", sa.Integer, nullable=False, default=0),
        sa.Column("total_score", sa.Float, nullable=False, default=0),
        sa.Column("pass_score", sa.Float, nullable=False, default=0),
        sa.Column("duration_minutes", sa.Integer, nullable=False, default=0),
        sa.Column("answer_display_rule", sa.String(32), nullable=False, default="AFTER_SUBMIT"),
        sa.Column("available_from", sa.DateTime),
        sa.Column("available_to", sa.DateTime),
        sa.Column("published_by", sa.Integer),
        sa.Column("published_at", sa.DateTime),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.UniqueConstraint("paper_id", "version_no", name="uq_pv_paper_version"),
    )
    op.create_table(
        "paper_questions",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("paper_version_id", sa.Integer, sa.ForeignKey("paper_versions.id"), nullable=False),
        sa.Column("question_version_id", sa.Integer, sa.ForeignKey("question_versions.id"), nullable=False),
        sa.Column("sequence_no", sa.Integer, nullable=False),
        sa.Column("score", sa.Float, nullable=False, default=1.0),
        sa.UniqueConstraint("paper_version_id", "sequence_no", name="uq_pq_paper_seq"),
    )

    # practice
    op.create_table(
        "practice_sessions",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("exam_id", sa.Integer, sa.ForeignKey("exams.id")),
        sa.Column("paper_id", sa.Integer, sa.ForeignKey("papers.id")),
        sa.Column("mode", sa.String(32), nullable=False),  # SEQUENTIAL/RANDOM/CHAPTER/KNOWLEDGE/WRONG/FAVORITE/MOCK/DAILY
        sa.Column("status", sa.String(32), nullable=False, default="CREATED"),
        sa.Column("total_score", sa.Float, nullable=False, default=0),
        sa.Column("awarded_score", sa.Float, nullable=False, default=0),
        sa.Column("correct_count", sa.Integer, nullable=False, default=0),
        sa.Column("wrong_count", sa.Integer, nullable=False, default=0),
        sa.Column("unanswered_count", sa.Integer, nullable=False, default=0),
        sa.Column("started_at", sa.DateTime, nullable=False),
        sa.Column("submitted_at", sa.DateTime),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )
    op.create_index("ix_sessions_user_status", "practice_sessions", ["user_id", "status"])
    op.create_table(
        "session_questions",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("session_id", sa.Integer, sa.ForeignKey("practice_sessions.id"), nullable=False),
        sa.Column("question_id", sa.Integer, sa.ForeignKey("questions.id"), nullable=False),
        sa.Column("question_version_id", sa.Integer, sa.ForeignKey("question_versions.id"), nullable=False),
        sa.Column("sequence_no", sa.Integer, nullable=False),
        sa.Column("score", sa.Float, nullable=False, default=1.0),
        sa.Column("scoring_rule", sa.String(32), nullable=False, default="EXACT_MATCH"),
        sa.Column("analysis_display_rule", sa.String(32), nullable=False, default="INSTANT"),
        sa.UniqueConstraint("session_id", "sequence_no", name="uq_sq_session_seq"),
    )
    op.create_table(
        "user_answers",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("session_id", sa.Integer, sa.ForeignKey("practice_sessions.id"), nullable=False),
        sa.Column("question_version_id", sa.Integer, sa.ForeignKey("question_versions.id"), nullable=False),
        sa.Column("selected_options", sa.Text, nullable=False),  # JSON-encoded list
        sa.Column("is_correct", sa.Boolean),
        sa.Column("awarded_score", sa.Float),
        sa.Column("time_spent_seconds", sa.Integer, nullable=False, default=0),
        sa.Column("submit_count", sa.Integer, nullable=False, default=0),
        sa.Column("answered_at", sa.DateTime, nullable=False),
        sa.UniqueConstraint("session_id", "question_version_id", name="uq_ua_session_qv"),
    )

    # user state
    op.create_table(
        "user_question_states",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("question_id", sa.Integer, sa.ForeignKey("questions.id"), nullable=False),
        sa.Column("first_wrong_at", sa.DateTime),
        sa.Column("last_wrong_at", sa.DateTime),
        sa.Column("wrong_count", sa.Integer, nullable=False, default=0),
        sa.Column("correct_count", sa.Integer, nullable=False, default=0),
        sa.Column("consecutive_correct", sa.Integer, nullable=False, default=0),
        sa.Column("mastered", sa.Boolean, nullable=False, default=False),
        sa.Column("next_review_at", sa.DateTime),
        sa.Column("is_favorite", sa.Boolean, nullable=False, default=False),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
        sa.UniqueConstraint("user_id", "question_id", name="uq_uqs_user_question"),
    )
    op.create_table(
        "user_daily_stats",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("stat_date", sa.Date, nullable=False),
        sa.Column("answer_count", sa.Integer, nullable=False, default=0),
        sa.Column("correct_count", sa.Integer, nullable=False, default=0),
        sa.Column("duration_seconds", sa.Integer, nullable=False, default=0),
        sa.UniqueConstraint("user_id", "stat_date", name="uq_uds_user_date"),
    )

    # ops
    op.create_table(
        "home_banners",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("title", sa.String(128), nullable=False),
        sa.Column("image_url", sa.String(512), nullable=False),
        sa.Column("link_type", sa.String(32), nullable=False, default="EXAM"),  # EXAM/PAPER/URL/NONE
        sa.Column("link_target", sa.String(256)),
        sa.Column("sort_order", sa.Integer, nullable=False, default=0),
        sa.Column("is_active", sa.Boolean, nullable=False, default=True),
        sa.Column("starts_at", sa.DateTime),
        sa.Column("ends_at", sa.DateTime),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )
    op.create_table(
        "announcements",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("title", sa.String(256), nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, default=True),
        sa.Column("starts_at", sa.DateTime),
        sa.Column("ends_at", sa.DateTime),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )
    op.create_table(
        "daily_practice_configs",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("config_date", sa.Date, nullable=False, unique=True),
        sa.Column("exam_id", sa.Integer, sa.ForeignKey("exams.id"), nullable=False),
        sa.Column("question_count", sa.Integer, nullable=False, default=10),
        sa.Column("auto_pick_rule", sa.String(64), nullable=False, default="RANDOM"),  # RANDOM/MANUAL
        sa.Column("manual_question_version_ids", sa.Text),  # JSON list, used when auto_pick_rule=MANUAL
        sa.Column("created_by", sa.Integer, nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )

    # feedback
    op.create_table(
        "question_feedback",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("user_id", sa.Integer, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("exam_id", sa.Integer, sa.ForeignKey("exams.id")),
        sa.Column("question_id", sa.Integer, sa.ForeignKey("questions.id"), nullable=False),
        sa.Column("question_version_id", sa.Integer, sa.ForeignKey("question_versions.id"), nullable=False),
        sa.Column("session_id", sa.Integer, sa.ForeignKey("practice_sessions.id")),
        sa.Column("user_answer_snapshot", sa.Text),  # JSON-encoded
        sa.Column("feedback_type", sa.String(32), nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("status", sa.String(32), nullable=False, default="OPEN"),  # OPEN/PROCESSING/RESOLVED/REJECTED
        sa.Column("assigned_to", sa.Integer),
        sa.Column("first_response_at", sa.DateTime),
        sa.Column("resolved_at", sa.DateTime),
        sa.Column("resolution_note", sa.Text),
        sa.Column("linked_revision_version_id", sa.Integer, sa.ForeignKey("question_versions.id")),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )
    op.create_table(
        "feedback_replies",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("feedback_id", sa.Integer, sa.ForeignKey("question_feedback.id"), nullable=False),
        sa.Column("replier_id", sa.Integer, nullable=False),
        sa.Column("replier_type", sa.String(16), nullable=False),  # ADMIN/USER
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )

    # import jobs
    op.create_table(
        "import_jobs",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("uploaded_by", sa.Integer, nullable=False),
        sa.Column("filename", sa.String(256), nullable=False),
        sa.Column("file_sha256", sa.String(64), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, default="PENDING"),  # PENDING/PARSING/READY/CONFIRMED/FAILED
        sa.Column("total_rows", sa.Integer, nullable=False, default=0),
        sa.Column("ok_rows", sa.Integer, nullable=False, default=0),
        sa.Column("warn_rows", sa.Integer, nullable=False, default=0),
        sa.Column("error_rows", sa.Integer, nullable=False, default=0),
        sa.Column("confirmed_question_count", sa.Integer, nullable=False, default=0),
        sa.Column("error_report_path", sa.String(512)),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )
    op.create_table(
        "import_job_rows",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("job_id", sa.Integer, sa.ForeignKey("import_jobs.id"), nullable=False),
        sa.Column("row_no", sa.Integer, nullable=False),
        sa.Column("status", sa.String(16), nullable=False, default="OK"),  # OK/WARN/ERROR
        sa.Column("payload_json", sa.Text),
        sa.Column("errors_json", sa.Text),
        sa.Column("created_question_version_id", sa.Integer),
    )

    # admin + RBAC
    op.create_table(
        "admin_users",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("username", sa.String(64), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(256), nullable=False),
        sa.Column("display_name", sa.String(128)),
        sa.Column("is_active", sa.Boolean, nullable=False, default=True),
        sa.Column("is_super_admin", sa.Boolean, nullable=False, default=False),
        sa.Column("failed_login_count", sa.Integer, nullable=False, default=0),
        sa.Column("locked_until", sa.DateTime),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )
    op.create_table(
        "roles",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("code", sa.String(64), nullable=False, unique=True),
        sa.Column("name", sa.String(128), nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )
    op.create_table(
        "permissions",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("code", sa.String(64), nullable=False, unique=True),
        sa.Column("name", sa.String(128), nullable=False),
        sa.Column("module", sa.String(64), nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )
    op.create_table(
        "admin_user_roles",
        sa.Column("admin_user_id", sa.Integer, sa.ForeignKey("admin_users.id"), primary_key=True),
        sa.Column("role_id", sa.Integer, sa.ForeignKey("roles.id"), primary_key=True),
    )
    op.create_table(
        "role_permissions",
        sa.Column("role_id", sa.Integer, sa.ForeignKey("roles.id"), primary_key=True),
        sa.Column("permission_id", sa.Integer, sa.ForeignKey("permissions.id"), primary_key=True),
    )

    # audit
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("admin_user_id", sa.Integer, sa.ForeignKey("admin_users.id")),
        sa.Column("action", sa.String(64), nullable=False),
        sa.Column("target_type", sa.String(64)),
        sa.Column("target_id", sa.String(64)),
        sa.Column("before_json", sa.Text),
        sa.Column("after_json", sa.Text),
        sa.Column("ip", sa.String(64)),
        sa.Column("user_agent", sa.String(512)),
        sa.Column("request_id", sa.String(64)),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )
    op.create_index("ix_audit_created", "audit_logs", ["created_at"])
    op.create_table(
        "login_logs",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("subject_type", sa.String(16), nullable=False),  # USER/ADMIN
        sa.Column("subject_id", sa.Integer),
        sa.Column("username_or_openid", sa.String(128)),
        sa.Column("success", sa.Boolean, nullable=False),
        sa.Column("fail_reason", sa.String(256)),
        sa.Column("ip", sa.String(64)),
        sa.Column("user_agent", sa.String(512)),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )

    # idempotency
    op.create_table(
        "idempotency_keys",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("key", sa.String(128), nullable=False, unique=True),
        sa.Column("endpoint", sa.String(256), nullable=False),
        sa.Column("subject_type", sa.String(16), nullable=False),  # USER/ADMIN
        sa.Column("subject_id", sa.Integer, nullable=False),
        sa.Column("request_hash", sa.String(64), nullable=False),
        sa.Column("response_json", sa.Text, nullable=False),
        sa.Column("status_code", sa.Integer, nullable=False, default=200),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )


def downgrade() -> None:
    for tbl in [
        "idempotency_keys",
        "login_logs",
        "audit_logs",
        "role_permissions",
        "admin_user_roles",
        "permissions",
        "roles",
        "admin_users",
        "import_job_rows",
        "import_jobs",
        "feedback_replies",
        "question_feedback",
        "daily_practice_configs",
        "announcements",
        "home_banners",
        "user_daily_stats",
        "user_question_states",
        "user_answers",
        "session_questions",
        "practice_sessions",
        "paper_questions",
        "paper_versions",
        "papers",
        "question_review_records",
        "question_assets",
        "question_knowledge_points",
        "question_options",
        "question_versions",
        "questions",
        "user_exam_targets",
        "users",
        "knowledge_points",
        "chapters",
        "subjects",
        "exams",
        "exam_categories",
    ]:
        op.drop_table(tbl)