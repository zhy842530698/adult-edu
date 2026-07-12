# 架构说明

## 总体拓扑

```
┌──────────────┐    ┌────────────────────┐    ┌──────────────────┐
│ 微信小程序 C 端│ → │  FastAPI REST API   │ → │   SQLite (MVP)   │
│  Taro + React │ ← │  + JWT + RBAC +    │ ← │  Alembic 迁移     │
└──────────────┘    │  幂等键 + 审计日志   │    └──────────────────┘
                    └────────────────────┘             ▲
┌──────────────┐            ▲                          │
│  运营后台 Web │ ───────────┘                          │
│ Vite + AntD  │                                       │
└──────────────┘
```

- **C 端**：仅与后端 API 通信，token 通过 `/api/v1/auth/wechat/login` 换取。
- **运营后台**：通过 `/api/v1/admin/*` 维护题库 / 目录 / 审核 / 试卷 / 反馈 / 报表 / 权限。
- **后端**：单进程 FastAPI，SQLite + 文件上传 + 内存任务（导入任务当前同步执行）。
- **小程序**：Taro 3 + React + TypeScript，可编译到微信小程序 / h5 / 其它端。

## 模块划分

| 包 | 职责 |
|---|---|
| `app/api/v1/c_end` | C 端 REST 路由（auth / catalog / practice / wrong / favorite / progress / feedback / target） |
| `app/api/v1/admin` | 后台 REST 路由（auth / catalog / question / review / import / paper / daily / user / feedback / dashboard / report / admin / role / audit / ops） |
| `app/core` | 配置、异常、幂等、分页、安全、存储 |
| `app/models` | SQLAlchemy 实体（用户 / 目录 / 题目 / 试卷 / 会话 / 反馈 / 导入 / 审计 / 后台权限） |
| `app/services` | 业务服务（auth、question、practice、scoring、import、html sanitize、rbac、idempotency、audit） |
| `app/seed` | 启动种子（角色 / 权限 / 超管 / CET-4 目录） |
| `admin-web/src` | 后台页面（按业务域划分） |
| `miniprogram/src` | 小程序页面（按用户旅程划分） |

## 题目生命周期与版本模型

```
Question (主记录)               QuestionVersion (版本)
+----------------------+        +----------------------+
| id                   │◀───────│ id                   |
| exam_id              │        | question_id          |
| subject_id           │        | version_no           |
| chapter_id           │        | status:              |
| current_version_id   │        |   DRAFT              |
| latest_version_no    │        |   REVIEW_PENDING     │
| tags / difficulty    │        |   PUBLISHED          |
| created_by / editor  │        |   OFFLINE            |
+----------------------+        |   REJECTED           |
                                | stem / analysis      |
                                | correct_options JSON |
                                | options (A-H)        |
                                | source/license       |
                                +----------------------+
```

- 已发布题目修改 → 新建 `QuestionVersion`，老版本冻结。
- 练习会话的 `SessionQuestion` 绑定 `question_version_id`，历史结果永远看到老版本。
- 评分策略 (`scoring_rule`) 与解析显示策略 (`analysis_display_rule`) 在创建会话时固化。

## 关键设计原则

1. **数据驱动**：考试方向 / 考试 / 科目 / 章节 / 知识点全部数据表，无任何前端硬编码。
2. **不可变版本**：已发布版本不可改、不可删；下架只影响新会话。
3. **幂等**：保存答案 / 交卷 / 导入确认 / 发布操作均接受 `Idempotency-Key`。
4. **服务端评分**：前端不计算正确性，单选严格相等 / 多选集合完全相等。
5. **模拟考试屏蔽答案**：`mode == MOCK` 且未交卷时，`session_to_dict(reveal_answers=False)` 不返回 `correct_options` / `analysis`。
6. **RBAC**：菜单级 + 操作级权限；后台所有写接口校验权限并写 `audit_logs`。
7. **审计可追溯**：登录、敏感操作、审核、封禁均写入 `audit_logs`（`admin_user_id / action / target_type / target_id / before / after / request_id / ip`）。
8. **富文本安全**：所有题干 / 解析 / 选项经 `bleach` 白名单清洗，禁脚本 / 内联事件 / 危险链接。

## 部署形态（MVP）

- 单进程 FastAPI + SQLite（文件 `backend/adult_edu.db`）。
- 文件上传目录 `backend/uploads/`（图片 / 音频），由 FastAPI `StaticFiles` 通过 `/static/...` 暴露。
- 不需要 Redis / Celery / S3：导入任务当前同步执行；生产化时建议接入 Redis + Celery + S3 兼容对象存储。

## 扩展路径

- 把 `database_url` 切到 PostgreSQL + Alembic 升级即可（模型层无 SQLite 专属语法）。
- 把 `get_session_local` 注入到 `tasks/` 即可接入 Celery；`import_service` 已抽象。
- RBAC 表结构支持行级权限扩展（资源级 owner_id 已在多张业务表预留）。