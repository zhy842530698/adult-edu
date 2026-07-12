# MVP 20 项验收对照清单

> 对应需求文档 §14。本版本以可运行代码 + 端到端 smoke（`docs/smoke.sh`）作为依据；自动化单测后续补充。

| # | 验收项 | 通过 | 证据 / 备注 |
|:---:|---|:---:|---|
| 1 | 后台可新增考试 / 科目 / 章节 / 知识点；停用后不进入 C 端新练习 | ✅ | `docs/smoke.sh` step 2（停用后 catalog 不返回） |
| 2 | 录入员可新增但无权直接发布 | ✅ | `seed_data.entry_clerk` 角色无 `question.publish`；`approve` 接口需 `question.review_approve` 权限 |
| 3 | 单选答案 ≠ 1 个禁止提交；多选答案 < 2 个禁止提交 | ✅ | `question_service._validate_correct_options` |
| 4 | Excel 导入可逐行校验并输出错误报告，确认后只生成草稿 | ✅ | `import_service.create_import_job` + `confirm_import`；逐行 `errors_json` 落库 |
| 5 | 同一任务重复确认不会产生重复题目 | ✅ | `confirmed_question_count` 在第一次 confirm 后不再变化 |
| 6 | 审核员可驳回，必须填写原因 | ✅ | `reject_review(reason=...)` 空字符串 → `ValidationFailed` |
| 7 | 已发布题目修改创建新版本；历史会话仍展示旧版本 | ✅ | `edit_question` 已发布分支建新 `QuestionVersion`；`SessionQuestion` 绑定 `question_version_id` |
| 8 | 下架题不进入新会话；历史结果可查 | ✅ | `offline_question` 将 `q.current_version_id=None`；`_pick_questions_for_mode` 过滤 |
| 9 | 用户可完成顺序 / 随机 / 章节 / 错题 / 收藏练习 | ✅ | `_pick_questions_for_mode` 支持全部 mode |
| 10 | 题量不足时返回实际题量并提示 | ✅ | `InsufficientQuestions(actual_available=N)`；smoke step 6 验证 |
| 11 | 退出 / 断网后已保存答案可恢复 | ✅ | `PUT .../answers/{qvid}` 即写即存；GET 会话即返回 `selected_options` |
| 12 | 单选服务端判分；多选顺序不同但集合相同仍判对 | ✅ | `score_single` / `score_multi`；smoke step 7 |
| 13 | 多选少选 / 错选 / 多选均判错，MVP 不算部分分 | ✅ | `score_multi` 仅集合完全相等返回 True |
| 14 | 重复保存和重复交卷幂等，不重复计分 | ✅ | `idempotency.lookup` 命中则返回原 response；smoke step 8 |
| 15 | 模拟考试交卷前接口不返回标准答案与解析 | ✅ | `session_to_dict(reveal_answers=...)`；smoke step 9 |
| 16 | 答错自动进错题本；连续答对更新掌握状态 | ✅ | `_update_user_question_state` |
| 17 | 用户可提交关联具体题目版本的纠错；后台可处理并关联修订草稿 | ✅ | `POST /api/v1/question-feedback` 带 `question_id + question_version_id` |
| 18 | 后台可查看用户 / 答题 / 题目错误率 / 待办数据 | ✅ | `/admin/dashboard/summary` + `/admin/reports/questions` |
| 19 | 越权发布 / 封禁被拒绝并写审计日志 | ✅ | `PERMISSION_DENIED` + `audit_logs`；smoke step 10 |
| 20 | 本地一条命令启动；测试 / 部署 / 已知限制有文档 | ✅ | `make install seed backend admin` + `docs/runbook.md` + `docs/known-limitations.md` |

## 通过率：20 / 20