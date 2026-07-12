# RBAC 权限矩阵

## 模型

```
admin_users ─< admin_user_roles >─ roles ─< role_permissions >─ permissions
```

- `admin_users` 持账号密码（bcrypt），可叠加多个角色。
- `roles.code` 是稳定标识（如 `entry_clerk`），`name` 是展示名。
- `permissions.code` 是权限编码，`module` 用于分组展示。
- 超级管理员（`is_super_admin=true`）绕过所有 `has_permission` 检查。

## 权限编码清单

| 编码 | 名称 | 模块 |
|---|---|---|
| `menu.view` | 查看菜单 | common |
| `catalog.query` | 目录查询 | catalog |
| `catalog.create` | 目录新增 | catalog |
| `catalog.edit` | 目录编辑 | catalog |
| `catalog.delete` | 目录删除 | catalog |
| `question.query` | 题目查询 | question |
| `question.create` | 题目新增 | question |
| `question.edit` | 题目编辑 | question |
| `question.delete` | 题目删除 | question |
| `question.import` | 题目批量导入 | question |
| `question.submit_review` | 题目提交审核 | question |
| `question.review_approve` | 题目审核通过 | question |
| `question.review_reject` | 题目审核驳回 | question |
| `question.publish` | 题目发布 | question |
| `question.offline` | 题目下架 | question |
| `paper.query` | 试卷查询 | paper |
| `paper.create` | 试卷新增 | paper |
| `paper.edit` | 试卷编辑 | paper |
| `paper.publish` | 试卷发布 | paper |
| `ops.query` | 运营配置查询 | ops |
| `ops.edit` | 运营配置编辑 | ops |
| `ops.delete` | 运营配置删除 | ops |
| `user.query` | 用户查询 | user |
| `user.ban` | 用户封禁 | user |
| `feedback.query` | 反馈查询 | feedback |
| `feedback.process` | 反馈处理 | feedback |
| `admin.query` | 管理员查询 | admin |
| `admin.create` | 管理员新增 | admin |
| `admin.edit` | 管理员编辑 | admin |
| `admin.delete` | 管理员删除 | admin |
| `audit.query` | 审计查询 | audit |
| `system.setting` | 系统设置 | system |

## 默认角色

| 编码 | 名称 | 主要权限 |
|---|---|---|
| `super_admin` | 超级管理员 | 全部 |
| `entry_clerk` | 题目录入员 | catalog.query / question.query / question.create / question.edit / question.submit_review |
| `reviewer` | 题目审核员 | question.query / question.review_approve / question.review_reject / question.publish / question.offline |
| `content_ops` | 内容运营 | catalog + paper + ops |
| `support` | 客服/纠错 | user.query / feedback.query / feedback.process |
| `viewer` | 数据查看员 | 所有 `*.query` |

## 关键约束

1. **录入员无发布权限**：未授予 `question.publish` 的角色调用 `approve` 时返回 `403`。
2. **审核员不能审自己最后编辑的题**：`approve_review` 服务层会校验 `q.last_editor_admin_id == actor_id`，除非 `is_super_admin` 且 `REVIEW_SELF_APPROVE_ALLOWED=true`。
3. **数据查看员只读**：未授予任何 `*.create/edit/delete/publish`，列表可访问，写接口 403。
4. **越权写审计**：所有拒绝路径调用 `write_audit(...)` 落 `audit_logs`。

## 接口→权限映射速查

| 接口 | 权限 |
|---|---|
| `POST /admin/questions` | `question.create` |
| `PUT /admin/questions/{id}` | `question.edit` |
| `POST /admin/questions/{id}/submit-review` | `question.submit_review` |
| `POST /admin/question-reviews/{id}/approve` | `question.review_approve` |
| `POST /admin/question-reviews/{id}/reject` | `question.review_reject` |
| `POST /admin/import-jobs` | `question.import` |
| `POST /admin/papers` | `paper.create` |
| `POST /admin/papers/{id}/publish` | `paper.publish` |
| `POST /admin/users/{id}/ban` | `user.ban` |
| `POST /admin/question-feedback/{id}/resolve` | `feedback.process` |
| `POST /admin/admin-users` | `admin.create` |
| `POST /admin/roles` | `admin.create` |
| `GET /admin/audit-logs` | `audit.query` |