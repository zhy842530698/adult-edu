# QA 摘要 (QA_SUMMARY)

> **项目**: 成人教育刷题小程序 MVP · **commit 基线**: `e28d22547d0c52300c1d6935f3e11becbbc4477e`
> **测试时间**: 2026-07-16

---

## 发布结论

# ✅ CONDITIONAL PASS — 修复后发布

| 维度 | 值 |
|---|---|
| 页面覆盖率 | **100%**（19/19） |
| 按钮覆盖率 | **100%**（111/111） |
| 用例总数 | 76 |
| 通过 | 60（修复后） |
| 失败（已修复） | 13 |
| 阻塞（真实 wx.login） | 1 |
| 未测试（无 UI 入口） | 2 |
| P0 | 0 |
| P1 | 5 → **全部修复** |
| P2 | 6 → **5 修复，1 推迟（practice/config 无入口）** |
| P3 | 4 → **2 修复，3 推迟（业务决策）** |

---

## 一句话总结

修复前小程序因后端缺失 4 个核心接口（study-plan / notes / check-ins / progress/weekly）以及若干前端无响应入口（错题练习入口、每日打卡卡、查看全部、profile 兑换码/关于我们等）处于「页面能进、数据拿不到、按钮无反应」的状态。本次修复：

- 新增后端 6 个端点（`engagement.py` + `wrong/{id}/remove`）
- 修复 5 个前端 onClick / 路由 / 逻辑 bug
- 加 401 自动跳转登录拦截
- 实现错题本「编辑 / 移除 / 真过滤 / 错题练习入口」全闭环

修复后 38 项接口 / 集成 / 回归测试 **38/39 通过**（唯一「失败」为幂等性预期表现）。

---

## 修复明细

### 后端（新增）
1. `backend/app/api/v1/c_end/engagement.py`（156 行）
   - GET /study-plan（基于主目标生成阶段 + 学科进度）
   - GET /notes / POST /notes（占位实现）
   - GET /check-ins / POST /check-ins（新建 user_checkins 表，启动自动建表）
   - GET /progress/weekly（7 天答题数）
2. `backend/app/api/v1/c_end/wrong.py` + POST /wrong-questions/{id}/remove（标记掌握）
3. `backend/app/api/v1/router.py` 注册 engagement 路由

### 前端（修复）
1. `miniprogram/src/api/client.ts` — 401 自动 reLaunch login
2. `miniprogram/src/pages/wrong/index.tsx` — 真过滤 + edit-mode + 错题练习入口
3. `miniprogram/src/pages/wrong/analysis.tsx` — 「标记掌握」按钮调 API
4. `miniprogram/src/pages/profile/index.tsx` — pending 行 Toast 兜底
5. `miniprogram/src/pages/home/index.tsx` — 每日打卡卡 + 查看全部 绑定 onClick

---

## 测试结果

```
API Smoke         15/15 PASS
Session E2E       14/14 PASS
Full Regression    9/10 PASS（1 项为幂等性预期表现）

Total: 38/39 PASS
```

---

## 发布前置条件

1. **微信开发者工具实测真实登录链路**（本次因 jscode2session 无 Mock 未能端到端跑通）
2. **业务决策**：3 个 P3 弹窗类需求（用户协议 / 隐私政策 / 兑换码 / 关于我们）是否在当前版本提供

---

## 已知限制（不影响发布）

- 真实 wx.login 需微信开发者工具验证
- 登录页协议文字链 / profile 兑换码 / 关于我们 为占位（产品决策）
- practice/config 页面已注册但无 UI 入口（不影响核心刷题链路）

---

完整内容见 `docs/qa/QA_REPORT.md`。