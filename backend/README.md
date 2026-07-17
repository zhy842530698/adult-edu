# Backend — 成人教育刷题小程序 FastAPI 服务

> 单进程 FastAPI 后端，承载 C 端用户、运营后台的全部业务接口。

## 技术栈

| 层 | 选型 |
|---|---|
| Web 框架 | FastAPI 0.115 + Uvicorn |
| ORM | SQLAlchemy 2.0 + Alembic 1.13 |
| 数据校验 | Pydantic 2.9 + pydantic-settings |
| 鉴权 | python-jose（JWT HS256） + passlib（bcrypt） |
| 文件处理 | openpyxl（Excel 导入导出）、pdfplumber（PDF→Excel 提取）、bleach（富文本清洗） |
| 测试 | pytest 8 + pytest-asyncio + httpx |

## 目录结构

```
backend/
├── alembic/                 # 数据库迁移版本（env.py + versions/）
├── alembic.ini              # Alembic 配置
├── app/
│   ├── main.py              # create_app() 工厂 + lifespan + 全局中间件
│   ├── config.py            # Settings（pydantic-settings，单一来源）
│   ├── database.py          # engine / SessionLocal / Base / get_db
│   ├── deps.py              # resolve_user / resolve_admin / optional_*
│   ├── errors.py            # 统一异常处理 + JSON 响应包装
│   ├── request_id.py        # 请求 ID 中间件 + ctxvar
│   ├── api/
│   │   └── v1/
│   │       ├── router.py    # 聚合 c_end + admin 所有 router
│   │       ├── c_end/       # C 端接口（11 个文件）
│   │       └── admin/       # 运营后台接口（17 个文件）
│   ├── core/                # exceptions / pagination / security / storage
│   ├── models/              # 13 个 SQLAlchemy 实体
│   ├── schemas/             # Pydantic schema（按需补全）
│   ├── services/            # 业务服务层（auth/question/practice/scoring/import/rbac/...）
│   └── seed/
│       └── seed_data.py     # 角色、权限、超管、CET-4 目录种子
├── scripts/
│   ├── init_db.sh           # alembic upgrade head + app.seed.seed_data
│   ├── gen_template.py      # 生成 Excel 导入模板
│   ├── pdf_to_excel.py      # PDF 工具离线脚本
│   ├── backfill_sequential_progress.py
│   └── cleanup_smoke.py
├── uploads/                 # 静态资源（images / audios）
├── requirements.txt
└── adult_edu.db             # SQLite 数据文件（运行后生成）
```

## 运行

```bash
# 建议在仓库根目录通过 Makefile 操作，常见命令：
make install     # 创建 .venv 并安装依赖
make seed        # alembic upgrade head + 灌种子数据
make backend     # 后台启动 uvicorn，监听 :8000
make backend-logs    # tail -f backend.log
make backend-stop    # 优雅停止
make backend-status  # 查看 PID / 状态
make test        # pytest -q
make smoke       # 端到端 smoke（依赖后端已启动）
make verify      # seed + backend + smoke 一键全链路校验
make template    # 生成 docs/excel-import-template.xlsx
make clean       # 清理缓存 / 日志 / 数据库（不含 .venv / uploads）
```

直接调用：

```bash
python3 -m venv ../.venv && source ../.venv/bin/activate
pip install -r requirements.txt
bash scripts/init_db.sh
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

启动后：

- Swagger UI：`http://localhost:8000/docs`
- 健康检查：`GET /api/v1/health`
- 静态资源：`http://localhost:8000/static/...`

## 配置

通过 `backend/.env`（`init_db.sh` 会自动从 `.env.example` 复制）：

| Key | 默认 | 说明 |
|---|---|---|
| `database_url` | `sqlite:///./adult_edu.db` | SQLAlchemy URL，生产可切到 PostgreSQL |
| `jwt_secret` | `dev-only-please-change-in-prod` | 签名密钥，**必须**在生产修改 |
| `jwt_alg` | `HS256` | JWT 算法 |
| `jwt_expire_min` | `7200` | token 有效期（分钟） |
| `review_self_approve_allowed` | `False` | 是否允许审核员通过自己最后编辑的题目 |
| `wechat_appid` / `wechat_secret` | 空 | jscode2session 凭证，留空走 mock openid |
| `admin_default_password` | `Admin@123` | 种子超管初始密码 |
| `upload_dir` | `backend/uploads` | 上传根目录 |
| `static_url_prefix` | `/static` | FastAPI 静态文件挂载前缀 |
| `cors_origins` | `http://localhost:5173, http://127.0.0.1:5173, http://192.168.1.2:5173` | CORS 白名单 |

## 全局行为

- **请求 ID**：每个请求自动生成 / 透传 `X-Request-Id`，写入日志与响应头。
- **统一响应**：`{"code": "OK", "message": "...", "data": ...}`；错误由 `errors.install_handlers` 包装为 `{"code", "message", "request_id"}`。
- **CORS**：默认允许 `localhost:5173`、`127.0.0.1:5173`、本机 LAN IP `192.168.1.2:5173`；扩展需改 `cors_origins`。
- **静态文件**：`uploads/` 目录通过 `/static` 直接对外访问。
- **JWT**：`Authorization: Bearer <token>`，payload 含 `sub_type`（`USER` / `ADMIN`）、`sub_id`、`iat`、`exp`。
- **幂等键**：保存答案 / 交卷 / 导入确认 / 发布 等写接口支持 `Idempotency-Key` 头，`IdempotencyKey` 表持久化。
- **审计**：管理员登录、敏感操作、审核、封禁均写入 `audit_logs`。

## 数据模型（13 张表）

| 表 | 用途 |
|---|---|
| `exam_categories` | 考试大类（如 CET-4 / 公务员） |
| `exams` | 具体考试方向 |
| `subjects` | 科目（隶属于考试） |
| `chapters` | 章节（隶属于科目） |
| `knowledge_points` | 知识点（隶属于章节） |
| `users` | C 端用户（含 openid / 头像 / 隐私版本） |
| `user_exam_targets` | 用户的考试目标 + 每日刷题目标 |
| `user_question_state` | 每题状态（顺序练习游标 / 答题正误） |
| `user_sequential_progress` | 顺序练习通关进度 |
| `user_daily_stats` | 每日答题统计 |
| `questions` | 题目主表（含 current_version_id / latest_version_no） |
| `question_versions` | 题目版本（`DRAFT/REVIEW_PENDING/PUBLISHED/OFFLINE/REJECTED`） |
| `question_options` | 选项（A–H，至多 8 项） |
| `question_knowledge_points` | 题目 ↔ 知识点多对多 |
| `question_assets` | 题目附图 / 音频 |
| `question_review_records` | 审核记录 |
| `papers` / `paper_versions` / `paper_questions` | 试卷 |
| `practice_sessions` / `session_questions` / `user_answers` | 练习会话 |
| `home_banners` / `announcements` / `daily_practice_configs` | 运营配置 |
| `question_feedback` / `feedback_replies` | 纠错工单 |
| `import_jobs` / `import_job_rows` | Excel / PDF 导入任务 |
| `admin_users` / `admin_user_roles` | 后台账号与角色绑定 |
| `roles` / `permissions` / `role_permissions` | RBAC |
| `audit_logs` / `login_logs` | 审计与登录流水 |
| `idempotency_keys` | 幂等键持久化 |

数据库迁移：

```bash
alembic revision --autogenerate -m "msg"   # 自动生成版本
alembic upgrade head                       # 升级到最新
alembic downgrade -1                        # 回滚一版
```

## REST 路由

所有接口统一挂在 `/api/v1` 下，详情见 [`docs/api.md`](../docs/api.md) 与 `http://localhost:8000/docs`。

### C 端（`/api/v1/...`）

| 模块 | 前缀 | 关键端点 |
|---|---|---|
| 登录 | `/auth` | `POST /wechat/login`、`GET /me` |
| 用户目标 / 协议 | `/user` | `GET/POST /user/exam-targets`、`PUT /user/daily-target`、`POST /user/agreement`、`POST /user/logout` |
| Onboarding | `/user` | `GET /user/onboarding-status`、`POST /user/onboarding` |
| 目录 | `/catalog` | `GET /exam-catalog`、`GET /exams/{exam_id}/progress` |
| 练习 | `/practice-sessions` | `POST /`（创建会话）、`GET /{id}`、`PUT /{id}/answers/{qv_id}`（幂等）、`POST /{id}/submit`、`GET /{id}/result`、`GET /daily-task` |
| 错题 | `/wrong-questions` | `GET /`、`POST /practice`（重练）、`POST /{qid}/remove` |
| 收藏 | `/favorite` | `GET /favorites`、`PUT/DELETE /questions/{id}/favorite` |
| 进度 | `/progress` | `GET /summary` |
| 反馈 | `/question-feedback` | `POST /` |
| 学习互动 | `/study-plan`、`/notes`、`/check-ins`、`/progress/weekly` | 计划、笔记、打卡、周报 |

### 运营后台（`/api/v1/admin/...`，全部需 ADMIN token）

| 模块 | 前缀 | 关键端点 |
|---|---|---|
| 登录 | `/admin/auth` | `POST /login`、`GET /me` |
| 目录 | `/admin` | `/exam-categories`、`/exams`、`/subjects`、`/chapters`、`/knowledge-points` 完整 CRUD |
| 题目 | `/admin/questions` | `GET/POST /`、`GET/PUT/DELETE /{id}`、`POST /{id}/submit-review`、`POST /batch/submit-review`、`POST /{id}/offline`、`POST /batch` |
| 审核 | `/admin/question-reviews` | `GET /`、`POST /{rid}/approve`、`POST /{rid}/reject`、`POST /batch/approve` |
| 导入 | `/admin/import-jobs` | `GET /`、`POST /`（上传 Excel）、`GET /{jid}`、`POST /{jid}/confirm`、`GET /template/download` |
| PDF 工具 | `/admin/pdf-tools` | `POST /convert`（pdfplumber → Excel） |
| 试卷 | `/admin/papers` | `GET /`、`POST /`、`POST /{pid}/publish`（含版本快照） |
| 每日一练 | `/admin/daily-practice-configs` | `GET /`、`POST /` |
| 用户 | `/admin/users` | `GET /`、`POST /{uid}/ban`、`POST /{uid}/unban` |
| 反馈工单 | `/admin/question-feedback` | `GET /`、`POST /{fid}/reply`、`POST /{fid}/resolve` |
| 工作台 | `/admin/dashboard` | `GET /summary`（今日/近 7 日关键指标） |
| 报表 | `/admin/reports` | `GET /questions`（题目维度统计） |
| 管理员 | `/admin/admin-users` | `GET /`、`POST /`、`DELETE /{aid}` |
| 角色 | `/admin/roles` | `GET /`、`POST /`、`PUT /{rid}`、`GET /permissions` |
| 审计 | `/admin/audit-logs` | `GET /`（需 `audit.query`） |
| 运营配置 | `/admin/ops` | `/banners`、`/announcements` 完整 CRUD |
| 资源上传 | `/admin/uploads` | `POST /images`、`POST /audios` |

## 业务服务（`app/services/`）

| 文件 | 职责 |
|---|---|
| `auth_service.py` | 微信 code 换 token（mock 模式 / jscode2session）、后台账号密码登录 |
| `question_service.py` | 题目创建 / 编辑 / 提交审核 / 发布 / 下架 + 版本快照 |
| `practice_service.py` | 创建会话（7 种模式）、按游标取下一题、保存答案、交卷评分 |
| `scoring.py` | 单选严格相等 / 多选集合完全相等的评分实现 |
| `excel_parser.py` | Excel 解析（含列校验、错误行收集） |
| `import_service.py` | 导入任务编排（异步执行、统计、确认落库） |
| `rbac.py` | `has_permission` / `admin_permissions` 鉴权查询 |
| `idempotency.py` | 幂等键存储 / 重放检测 |
| `audit.py` | `write_audit` 写入审计日志 |
| `html_sanitizer.py` | `bleach` 白名单清洗富文本题干 / 解析 |

## 题目版本与生命周期

```
Question (主记录)               QuestionVersion (版本)
+----------------------+        +--------------------------------+
| id                   │◀───────│ id                             |
| current_version_id   │        | question_id                    |
| latest_version_no    │        | version_no                     |
+----------------------+        | status: DRAFT/REVIEW_PENDING/  |
                                |         PUBLISHED/OFFLINE/     |
                                |         REJECTED               |
                                | stem / analysis                |
                                | correct_options JSON           |
                                | options (A-H)                  |
                                | source / license               |
                                +--------------------------------+
```

- 已发布版本**不可改、不可删**；修改走「编辑 → 提交审核 → 通过 → 新版本发布」流程，老版本自动冻结。
- `SessionQuestion.question_version_id` 绑定到具体版本，历史会话永远看到老版本。
- `PracticeSession.scoring_rule` 与 `analysis_display_rule` 在创建会话时固化。
- 模拟考试（`mode == MOCK`）未交卷时，`session_to_dict(reveal_answers=False)` 不返回 `correct_options / analysis`。

## RBAC（6 个内置角色）

| 角色 | 主要权限 |
|---|---|
| `super_admin` | 全部权限 |
| `entry_clerk` | 录入 / 修改草稿 / 提交审核，不可发布 |
| `reviewer` | 审核、批、驳、发布、下架 |
| `content_ops` | 首页、公告、试卷、每日一练 |
| `support` | 反馈工单处理 |
| `viewer` | 只读报表 |

完整权限码见 [`docs/rbac.md`](../docs/rbac.md) 与 `app/seed/seed_data.py` 的 `PERMISSIONS` 表。

## 默认账号

> 种子数据中创建的超管账号：`admin / Admin@123`（仅用于本地开发，生产请改 `admin_default_password` 并重新 seed）。

## 测试

```bash
make test            # 后端 pytest 全量
make smoke           # 端到端 smoke（依赖 :8000）
make verify          # seed + 后端 + smoke 一条龙
```

测试目录约定放在 `backend/tests/`（如存在）；smoke 脚本位于 [`docs/smoke.sh`](../docs/smoke.sh)。

## 常见问题

- **修改数据库**：写好模型后 `alembic revision --autogenerate -m "..."`，审阅生成的 `versions/*.py`，再 `alembic upgrade head`。
- **切到 PostgreSQL**：仅需改 `DATABASE_URL`，模型层未使用 SQLite 专属语法。
- **接入异步任务**：`import_service` 已抽象，注入到 Celery / Arq 只需替换执行器。
- **CORS 报错**：把对应 origin 加到 `cors_origins` 列表。

## 相关文档

- [`docs/architecture.md`](../docs/architecture.md) — 总体架构与设计原则
- [`docs/runbook.md`](../docs/runbook.md) — 启动 / 重启 / 故障排查
- [`docs/database.md`](../docs/database.md) — ER 图
- [`docs/rbac.md`](../docs/rbac.md) — 权限矩阵
- [`docs/excel-import.md`](../docs/excel-import.md) — Excel 导入字段规范
- [`docs/api.md`](../docs/api.md) — 接口摘要（完整定义以 `/docs` 为准）