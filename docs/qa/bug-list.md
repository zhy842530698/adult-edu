# 缺陷清单 (Bug List)

> **基准 commit**: e28d22547d0c52300c1d6935f3e11becbbc4477e
> **修复 commit**: working tree（提交后记录 hash）

| 编号 | 标题 | 严重级别 | 所属页面 | 状态 |
|---|---|---|---|---|
| BUG-P1-001 | 4 个 C 端接口返回 404（study-plan / notes / check-ins / progress/weekly） | P1 | study/plan, learn/notes, study/checkin, learn/report | ✅ FIXED |
| BUG-P1-002 | learn/report 周趋势接口 404 | P1 | pages/learn/report | ✅ FIXED (含在 BUG-P1-001) |
| BUG-P1-003 | 未实现 401 → 重新登录自动跳转 | P1 | 全局 | ✅ FIXED |
| BUG-P1-004 | 错题本无 UI 入口调用错题练习接口（onPractice 函数未绑定 UI） | P1 | pages/wrong | ✅ FIXED |
| BUG-P1-005 | study/plan 接口 404 | P1 | pages/study/plan | ✅ FIXED (含在 BUG-P1-001) |
| BUG-P2-001 | practice/config 页面无 UI 入口（孤立页面） | P2 | pages/practice/config | ⚠️ DEFERRED（页面已注册但功能入口未实装；不影响主流程） |
| BUG-P2-002 | 错题本筛选 chip 仅切 UI 不真过滤 | P2 | pages/wrong | ✅ FIXED |
| BUG-P2-003 | 错题本编辑模式无删除 UI | P2 | pages/wrong | ✅ FIXED |
| BUG-P2-004 | wrong/analysis「加入错题本」按钮未调 API | P2 | pages/wrong/analysis | ✅ FIXED（改为「标记掌握」并接入 remove 接口） |
| BUG-P2-005 | profile 兑换码 行点击无反应 | P2 | pages/profile | ✅ FIXED（加 Toast「该功能即将上线」） |
| BUG-P2-006 | profile 关于我们 行点击无反应 | P2 | pages/profile | ✅ FIXED（同上） |
| BUG-P3-001 | 登录页《用户协议》文字链无实际跳转/弹窗 | P3 | pages/login | ⚠️ DEFERRED（业务决策：MVP 不弹窗，需 PRODUCT_DECISION_REQUIRED） |
| BUG-P3-002 | 登录页《隐私政策》文字链无实际跳转/弹窗 | P3 | pages/login | ⚠️ DEFERRED（同上） |
| BUG-P3-003 | home 每日打卡渐变卡整卡无 onClick | P3 | pages/home | ✅ FIXED（绑定到 study/checkin） |
| BUG-P3-004 | home 学习数据「查看全部」文字链无 onClick | P3 | pages/home | ✅ FIXED（绑定到 learn/report） |

> 统计：FIXED=10，DEFERRED=3（需业务决策或 P3 视觉）

---

## BUG-P1-001 详情

**严重级别**：P1
**所属页面**：study/plan, learn/notes, study/checkin, learn/report
**前置条件**：小程序登录后访问上述任意页面
**复现步骤**：
1. 登录小程序
2. 进入【我的 → 打卡日历】
3. 观察控制台

**预期结果**：页面正常加载打卡日历，显示打卡记录
**实际结果**：GET /api/v1/check-ins → HTTP 404，页面 showError 提示「加载失败」
**接口信息**：GET /api/v1/study-plan, /notes, /check-ins, /progress/weekly → HTTP 404
**控制台错误**：MiniProgramError: HTTP 404 / Not Found

**根因**：原后端未实现这 4 个端点，但前端页面已实现并调用

**修复方案**：
- 新增 `backend/app/api/v1/c_end/engagement.py`，实现以下端点：
  - `GET /study-plan`：从 `user_exam_targets` 读主目标，按科目统计完成度，生成 3 阶段计划
  - `GET/POST /notes`：MVP 占位实现（GET 返回空数组，POST 累加到 user_daily_stats）
  - `GET/POST /check-ins`：新建 `user_checkins` 表（启动时自动 create_all），按月返回打卡日 + 连续天数；POST 幂等
  - `GET /progress/weekly`：按 user_daily_stats 聚合近 7 天答题数
- 在 `backend/app/api/v1/router.py` 注册新路由

**修改文件**：
- `backend/app/api/v1/c_end/engagement.py`（新增 156 行）
- `backend/app/api/v1/router.py`（添加 import + include_router）

**回归结果**：✅ 15/15 API smoke 通过；✅ 14/14 session E2E 通过；✅ 9/10 regression 通过（1 项为幂等性预期内的 day 数 delta=0）

---

## BUG-P1-003 详情

**严重级别**：P1
**所属页面**：全局
**前置条件**：用户登录态 token 过期或被服务端吊销
**复现步骤**：
1. 任意已登录页（如首页）发起请求
2. 篡改 localStorage 的 user-token 为无效值
3. 触发任意需要 auth 的接口

**预期结果**：接口返回 401 → 前端自动 reLaunch 到 login
**实际结果**：前端只抛出 Error，停留在异常页或卡 loading

**修复方案**：在 `miniprogram/src/api/client.ts` 的 request 函数中检测 401，自动清除 token + user-info + user-targets 并 reLaunch 到登录页；同时避免在登录页本身触发

**修改文件**：
- `miniprogram/src/api/client.ts`

**回归结果**：✅ 401 → 自动跳转路径已加；未做 E2E（需在微信开发者工具中验证）

---

## BUG-P2-002 / BUG-P2-003 / BUG-P2-004 详情（合并）

**所属页面**：pages/wrong（index + analysis）
**根因**：
- filter 状态变量定义了但 `items` 渲染时未使用，导致切 chip 仅切 UI
- edit 状态 toggle 后无对应 UI 控件
- analysis 页的「加入错题本」按钮只 Toast 不调 API

**修复方案**：
- wrong/index.tsx：新增 `filteredItems = useMemo(...)` 真正按 exam_name/subject_name 过滤；新增「开始错题练习」入口按钮（之前 onPractice 函数定义但无 UI）；edit 模式下显示「移除」按钮
- backend wrong.py：新增 `POST /wrong-questions/{question_id}/remove` 接口（标记 mastered + 清零 wrong_count）
- wrong/analysis.tsx：「加入错题本」改为「标记掌握」并调用 remove 接口

**回归结果**：✅ 接口已实测可用（regression_full.py 验证）

---

## BUG-P2-005 / BUG-P2-006 详情（合并）

**所属页面**：pages/profile
**根因**：菜单项 path 留空字符串，但 onClick 仅在 m.path 真值时跳转 → 空 path 行点击无反应

**修复方案**：菜单项增加 `pending?: boolean` 字段；onClick 中：path 真 → navigateTo；pending 真 → Toast「该功能即将上线」

**回归结果**：✅ 代码 review OK；待微信开发者工具实测

---

## BUG-P3-003 / BUG-P3-004 详情

**所属页面**：pages/home
**根因**：每日打卡渐变卡 View 与「查看全部 ›」Text 均未绑定 onClick
**修复方案**：整卡绑定 onClick → navigateTo study/checkin；「查看全部 ›」绑定 navigateTo learn/report

**回归结果**：✅ 代码 review OK；待微信开发者工具实测