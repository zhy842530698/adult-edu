# API 文档

完整 OpenAPI 文档：启动后端后访问 `http://127.0.0.1:8000/docs`。

## 通用约定

- 前缀：`/api/v1`
- 鉴权：`Authorization: Bearer <token>`
- 请求 ID：每个响应携带 `X-Request-Id`，请求体里也带回来便于定位。
- 幂等键：写接口支持 `Idempotency-Key: <uuid>`。
- 分页：`page` / `page_size` / 响应里 `total`。
- 错误信封：`{ code, message, request_id, data? }`。

## C 端核心接口

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/auth/wechat/login` | mock 登录：`code: "mock-<openid>"` |
| GET | `/auth/me` | 当前用户 |
| GET | `/user/exam-targets` | 我的考试目标 |
| POST | `/user/exam-targets` | 设置主目标考试 |
| PUT | `/user/daily-target` | 设置每日题量 |
| POST | `/user/logout` | 注销账号（匿名化 PII） |
| GET | `/exam-catalog` | 公开考试目录（按 direction→exam→subject→chapter→kp 嵌套） |
| GET | `/exams/{id}/progress` | 单考试学习进度 |
| POST | `/practice-sessions` | 创建练习会话（mode: SEQUENTIAL/RANDOM/CHAPTER/KNOWLEDGE/WRONG/FAVORITE/MOCK/DAILY） |
| GET | `/practice-sessions/{id}` | 会话详情（mock 模式交卷前不返回答案） |
| PUT | `/practice-sessions/{id}/answers/{qvid}` | 保存答案（建议带 Idempotency-Key） |
| POST | `/practice-sessions/{id}/submit` | 交卷 |
| GET | `/practice-sessions/{id}/result` | 结果页 |
| GET | `/practice-sessions/daily-task` | 今日每日一练 |
| GET | `/wrong-questions` | 错题本 |
| POST | `/wrong-questions/practice` | 错题再练 |
| GET | `/favorites` | 收藏列表 |
| PUT | `/questions/{id}/favorite` | 收藏 |
| DELETE | `/questions/{id}/favorite` | 取消收藏 |
| GET | `/progress/summary` | 总学习进度 |
| POST | `/question-feedback` | 提交纠错（自动携带 question_id + question_version_id） |

## 运营后台核心接口

| 方法 | 路径 | 所需权限 |
|---|---|---|
| POST | `/admin/auth/login` | - |
| GET | `/admin/auth/me` | 已登录 |
| GET/POST/PUT/DELETE | `/admin/exam-categories` | catalog.* |
| GET/POST/PUT/DELETE | `/admin/exams` | catalog.* |
| GET/POST/PUT/DELETE | `/admin/subjects` | catalog.* |
| GET/POST/PUT/DELETE | `/admin/chapters` | catalog.* |
| GET/POST/PUT/DELETE | `/admin/knowledge-points` | catalog.* |
| GET/POST | `/admin/questions` | question.query / question.create |
| GET | `/admin/questions/{id}` | question.query |
| PUT | `/admin/questions/{id}` | question.edit（已发布则创建新版本） |
| DELETE | `/admin/questions/{id}` | question.delete（仅草稿可物理删） |
| POST | `/admin/questions/{id}/submit-review` | question.submit_review |
| POST | `/admin/questions/{id}/offline` | question.offline |
| GET | `/admin/question-reviews` | question.query |
| POST | `/admin/question-reviews/{id}/approve` | question.review_approve（不能审自己最后编辑的题，除非超管 + 配置允许） |
| POST | `/admin/question-reviews/{id}/reject` | question.review_reject（必须填 reason） |
| POST | `/admin/import-jobs` | question.import |
| GET | `/admin/import-jobs/{id}` | question.query |
| POST | `/admin/import-jobs/{id}/confirm` | question.import（幂等） |
| GET | `/admin/import-jobs/template/download` | question.query |
| GET/POST | `/admin/papers` | paper.query / paper.create |
| POST | `/admin/papers/{id}/publish` | paper.publish |
| GET/POST | `/admin/daily-practice-configs` | ops.query / ops.edit |
| GET | `/admin/users` | user.query |
| POST | `/admin/users/{id}/ban` | user.ban（必须 reason） |
| POST | `/admin/users/{id}/unban` | user.ban |
| GET | `/admin/question-feedback` | feedback.query |
| POST | `/admin/question-feedback/{id}/reply` | feedback.process |
| POST | `/admin/question-feedback/{id}/resolve` | feedback.process |
| GET | `/admin/dashboard/summary` | menu.view |
| GET | `/admin/reports/questions` | menu.view |
| GET/POST/DELETE | `/admin/admin-users` | admin.* |
| GET/POST/PUT | `/admin/roles` | admin.* |
| GET | `/admin/audit-logs` | audit.query |
| GET/POST/PUT/DELETE | `/admin/ops/banners` | ops.* |
| GET/POST/DELETE | `/admin/ops/announcements` | ops.* |

## 错误码

| code | http | 含义 |
|---|---|---|
| `AUTH_REQUIRED` | 401 | 未登录或 token 无效 |
| `PERMISSION_DENIED` | 403 | 无权限 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `CONFLICT` | 409 | 唯一索引冲突 / 状态冲突 |
| `VALIDATION_FAILED` | 422 | 请求体不合法 |
| `INVALID_SELECTED_OPTIONS` | 400 | 选项不合法 |
| `SESSION_ALREADY_SUBMITTED` | 400 | 会话已交卷 |
| `INSUFFICIENT_QUESTIONS` | 400 | 题量不足，data.actual_available 为实际可用 |
| `IDEMPOTENCY_CONFLICT` | 409 | 同 key 不同请求体 |
| `INTERNAL_ERROR` | 500 | 未捕获异常 |

## 关键幂等场景

```text
PUT /practice-sessions/{sid}/answers/{qvid}
  Idempotency-Key: <任意 uuid，重试保持不变>
  Body: { "selected_options": ["A"], "time_spent_seconds": 10 }

POST /practice-sessions/{sid}/submit
  Idempotency-Key: <提交幂等键>
  Body: {}

POST /admin/import-jobs/{jid}/confirm
  Body: {}   # 仅检查 job_id；重复确认不会重复生成题目

POST /admin/papers/{pid}/publish
  Body: {}   # 重复调用幂等
```