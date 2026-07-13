# 已知限制与未来扩展

## 当前 MVP 不实现的（按需求文档 §15）

- **题型**：判断 / 填空 / 简答 / 作文 / 口语 / 组合主观题。
- **AI 能力**：AI 识题、AI 出题、AI 解析、AI 评分。
- **商业化**：会员、支付、优惠券、兑换码、订单。
- **多端**：教师端、机构端、班级、作业、私有题库、多租户。
- **课程**：直播、录播、社区、私信。
- **运营增强**：智能推荐、用户分群、消息自动化、渠道归因、转化漏斗。
- **PDF / Word OCR** 批量识题。

## 工程上的妥协

1. **SQLite 单文件**：开发体验好，但并发写有限。生产化务必切 PostgreSQL。
2. **导入任务同步执行**：当前 `import_service` 在请求线程内解析 Excel；大文件会阻塞。生产化建议改 Celery + Redis。
3. **本地文件存储**：上传的图片 / 音频写到 `backend/uploads/`，FastAPI 直接暴露。生产化切 S3 兼容对象存储 + CDN。
4. **微信登录配置**：已接入 `wx.login` 与 `jscode2session`，部署前必须配置与小程序 AppID 匹配的 `WECHAT_APPID`、`WECHAT_SECRET`。
5. **超管自审默认禁**：`REVIEW_SELF_APPROVE_ALLOWED=false`，需要超管审自己最后编辑的题时设置环境变量为 `true`。
6. **考试进度接口是占位**：`GET /exams/{id}/progress` 当前返回全 0，留待接入聚合表。
7. **C 端没拉科目 / 章节的题目量**：UI 仅展示目录结构，题量从后台列表读。
8. **错题本 / 收藏不分页**：MVP 上限 200 条；超量后分页 + 筛选条件再上。
9. **后台操作日志按 action 过滤**，但不支持模糊搜索 + 时间范围；后续可加 `gte/lte` 参数。
10. **无操作权限审计的「拒绝」细分**：当前 `audit_logs` 仅写成功路径的 before/after，越权拒绝只写 action 而无 actor 结果；后续可加 `result: SUCCESS/REJECTED` 字段。

## 数据一致性的兜底

- 题目发布后会话绑定 `question_version_id`，历史结果永远可查。
- 已发布版本不可物理删除；下架只影响新会话。
- 同一用户对同一题目的状态 (`user_question_states`) 唯一索引保证 O(1) 更新。
- 导入任务使用 `idempotency_keys` 记录幂等键 + 请求哈希，避免重传重复生成。

## 后续可平滑扩展的接口

| 已有 | 扩展方向 |
|---|---|
| `POST /auth/wechat/login` | 已接入真实 jscode2session；手机号与 UnionID 尚未接入 |
| `POST /practice-sessions` | 增加 AB 测试分组、智能推荐选题 |
| `POST /question-feedback` | 增加图片 / 视频附件；接入客服 IM |
| `POST /import-jobs` | 改异步任务队列 + 进度推送 |
| `GET /admin/reports/questions` | 增加留存 / 漏斗 / 渠道分析 |
| `GET /admin/dashboard/summary` | 接入 BI 工具（Metabase / Superset） |

## 部署形态

- **最小化**：单进程 FastAPI + SQLite + 本地文件存储；适合 demo / 内部测试。
- **推荐生产**：PostgreSQL + Redis + Celery + S3 兼容对象存储 + Nginx 反向代理 + Prometheus 监控。
