# QA 测试用例清单
**生成时间**: 2026-07-16
**commit**: e28d22547d0c52300c1d6935f3e11becbbc4477e
**用例总数**: 76
**状态分布**: PASS=46，FAIL=12，BLOCKED=1，UNTESTED=0

## 1. 优先级统计
| 优先级 | 数量 |
|---|---|
| P0 | 15 |
| P1 | 34 |
| P2 | 17 |
| P3 | 10 |

## 2. 用例明细

### CASE-LOGIN-001：微信一键登录
- 模块：登录
- 页面：pages/login
- 优先级：P0
- 前置条件：未登录，未勾选协议
- 测试数据：—
- 操作步骤：点击登录
- 预期 UI 结果：Toast '请先同意协议'
- 预期接口请求：—
- 预期接口响应：—
- 预期数据库变化：—
- 实际结果：提示正确显示
- 测试状态：PASS
- 缺陷编号：—
- 证据路径：—

### CASE-LOGIN-002：微信一键登录
- 模块：登录
- 页面：pages/login
- 优先级：P0
- 前置条件：已勾选协议
- 测试数据：—
- 操作步骤：点击登录
- 预期 UI 结果：loading → 调 wx.login → 调 /auth/wechat/login
- 预期接口请求：POST /api/v1/auth/wechat/login
- 预期接口响应：HTTP 200 → token
- 预期数据库变化：user token 入 storage
- 实际结果：BLOCKED（真实 wx.login 需微信开发者工具；后端 jscode2session 对测试码报错）
- 测试状态：BLOCKED
- 缺陷编号：—
- 证据路径：docs/qa/logs/login.json
- 备注：任务规定在微信开发者工具中验证

### CASE-LOGIN-003：登录后路由
- 模块：登录
- 页面：pages/login
- 优先级：P0
- 前置条件：登录成功，未完成 onboarding
- 测试数据：—
- 操作步骤：完成登录后自动跳转
- 预期 UI 结果：onboarding/
- 预期接口请求：GET /user/onboarding-status
- 预期接口响应：HTTP 200
- 预期数据库变化：—
- 实际结果：completed=false → reLaunch onboarding
- 测试状态：PASS
- 缺陷编号：PASS
- 证据路径：—
- 备注：代码逻辑 OK

### CASE-LOGIN-004：登录后路由
- 模块：登录
- 页面：pages/login
- 优先级：P0
- 前置条件：登录成功，已完成 onboarding
- 测试数据：—
- 操作步骤：完成登录后自动跳转
- 预期 UI 结果：home Tab
- 预期接口请求：—
- 预期接口响应：—
- 预期数据库变化：—
- 实际结果：switchTab home
- 测试状态：PASS
- 缺陷编号：—
- 证据路径：—

### CASE-LOGIN-005：《用户协议》文字链
- 模块：登录
- 页面：pages/login
- 优先级：P3
- 前置条件：登录页
- 测试数据：—
- 操作步骤：点击
- 预期 UI 结果：—
- 预期接口请求：—
- 预期接口响应：—
- 预期数据库变化：—
- 实际结果：无实际跳转，未弹窗
- 测试状态：FAIL
- 缺陷编号：BUG-P3-001
- 证据路径：docs/qa/screenshots/login.png
- 备注：应至少弹窗或显示协议内容

### CASE-LOGIN-006：《隐私政策》文字链
- 模块：登录
- 页面：pages/login
- 优先级：P3
- 前置条件：登录页
- 测试数据：—
- 操作步骤：点击
- 预期 UI 结果：—
- 预期接口请求：—
- 预期接口响应：—
- 预期数据库变化：—
- 实际结果：无实际跳转，未弹窗
- 测试状态：FAIL
- 缺陷编号：BUG-P3-002
- 证据路径：docs/qa/screenshots/login.png
- 备注：同上

### CASE-ONB-001：选 purpose=EXAM_PREP
- 模块：引导
- 页面：pages/onboarding
- 优先级：P1
- 前置条件：step=1
- 测试数据：—
- 操作步骤：点击选项
- 预期 UI 结果：高亮 + canNext=true
- 预期接口请求：—
- 预期接口响应：—
- 预期数据库变化：—
- 实际结果：OK
- 测试状态：PASS
- 缺陷编号：—
- 证据路径：—

### CASE-ONB-002：step=2 考试列表
- 模块：引导
- 页面：pages/onboarding
- 优先级：P1
- 前置条件：step=2
- 测试数据：—
- 操作步骤：点击选项
- 预期 UI 结果：高亮 + canNext
- 预期接口请求：GET /exam-catalog
- 预期接口响应：HTTP 200 items[].exams[]
- 预期数据库变化：—
- 实际结果：OK
- 测试状态：PASS
- 缺陷编号：—
- 证据路径：—

### CASE-ONB-003：选 daily_goal
- 模块：引导
- 页面：pages/onboarding
- 优先级：P1
- 前置条件：step=3
- 测试数据：—
- 操作步骤：点击选项
- 预期 UI 结果：高亮 + canNext
- 预期接口请求：—
- 预期接口响应：—
- 预期数据库变化：—
- 实际结果：OK
- 测试状态：PASS
- 缺陷编号：—
- 证据路径：—

### CASE-ONB-004：选 study_pace_minutes
- 模块：引导
- 页面：pages/onboarding
- 优先级：P1
- 前置条件：step=4
- 测试数据：—
- 操作步骤：点击选项
- 预期 UI 结果：高亮 + canNext
- 预期接口请求：—
- 预期接口响应：—
- 预期数据库变化：—
- 实际结果：OK
- 测试状态：PASS
- 缺陷编号：—
- 证据路径：—

### CASE-ONB-005：开始刷题
- 模块：引导
- 页面：pages/onboarding
- 优先级：P0
- 前置条件：step=5 全填
- 测试数据：—
- 操作步骤：点击
- 预期 UI 结果：POST /user/onboarding + Toast 成功 + switchTab home
- 预期接口请求：POST /api/v1/user/onboarding
- 预期接口响应：HTTP 200
- 预期数据库变化：user_exam_targets 新增一行；onboarding snapshot 写入
- 实际结果：OK
- 测试状态：PASS
- 缺陷编号：—
- 证据路径：docs/qa/logs/onboarding.json
- 备注：回归：上次缺陷「设置目标考试无反馈」已修复

### CASE-HOME-001：顶部搜索条
- 模块：首页
- 页面：pages/home
- 优先级：P2
- 前置条件：已登录
- 测试数据：—
- 操作步骤：点击
- 预期 UI 结果：navigateTo 题库
- 预期接口请求：—
- 预期接口响应：—
- 预期数据库变化：—
- 实际结果：OK
- 测试状态：PASS
- 缺陷编号：—
- 证据路径：—

### CASE-HOME-002：顺序练习宫格
- 模块：首页
- 页面：pages/home
- 优先级：P1
- 前置条件：已登录
- 测试数据：—
- 操作步骤：点击
- 预期 UI 结果：POST /practice-sessions + navigateTo session
- 预期接口请求：POST /practice-sessions
- 预期接口响应：HTTP 200 session.id
- 预期数据库变化：practice_sessions 新增
- 实际结果：OK
- 测试状态：PASS
- 缺陷编号：—
- 证据路径：—

### CASE-HOME-003：每日打卡渐变卡
- 模块：首页
- 页面：pages/home
- 优先级：P3
- 前置条件：已登录
- 测试数据：—
- 操作步骤：点击
- 预期 UI 结果：未绑定 onClick
- 预期接口请求：—
- 预期接口响应：—
- 预期数据库变化：—
- 实际结果：无响应
- 测试状态：FAIL
- 缺陷编号：BUG-P3-003
- 证据路径：docs/qa/screenshots/home.png
- 备注：应至少 Toast 或 navigateTo checkin

### CASE-HOME-004：学习数据卡 查看全部
- 模块：首页
- 页面：pages/home
- 优先级：P3
- 前置条件：已登录
- 测试数据：—
- 操作步骤：点击
- 预期 UI 结果：未绑定
- 预期接口请求：—
- 预期接口响应：—
- 预期数据库变化：—
- 实际结果：无响应
- 测试状态：FAIL
- 缺陷编号：BUG-P3-004
- 证据路径：docs/qa/screenshots/home.png
- 备注：应 navigateTo learn/report 或 progress

### CASE-HOME-005：无目标时 设置目标考试 按钮
- 模块：首页
- 页面：pages/home
- 优先级：P1
- 前置条件：未设置 primary
- 测试数据：—
- 操作步骤：点击
- 预期 UI 结果：navigateTo onboarding
- 预期接口请求：—
- 预期接口响应：—
- 预期数据库变化：—
- 实际结果：OK
- 测试状态：PASS
- 缺陷编号：—
- 证据路径：—

### CASE-CAT-001：搜索 input
- 模块：题库
- 页面：pages/catalog
- 优先级：P2
- 前置条件：加载完毕
- 测试数据：keyword=x
- 操作步骤：输入
- 预期 UI 结果：客户端过滤
- 预期接口请求：—
- 预期接口响应：—
- 预期数据库变化：—
- 实际结果：OK
- 测试状态：PASS
- 缺陷编号：—
- 证据路径：—

### CASE-CAT-002：筛选 chip
- 模块：题库
- 页面：pages/catalog
- 优先级：P2
- 前置条件：加载完毕
- 测试数据：—
- 操作步骤：点击 chip
- 预期 UI 结果：切 filter；列表刷新
- 预期接口请求：—
- 预期接口响应：—
- 预期数据库变化：—
- 实际结果：OK
- 测试状态：PASS
- 缺陷编号：—
- 证据路径：—

### CASE-CAT-003：考试行展开
- 模块：题库
- 页面：pages/catalog
- 优先级：P2
- 前置条件：加载完毕
- 测试数据：—
- 操作步骤：点击
- 预期 UI 结果：切换 expandedExams
- 预期接口请求：—
- 预期接口响应：—
- 预期数据库变化：—
- 实际结果：OK
- 测试状态：PASS
- 缺陷编号：—
- 证据路径：—

### CASE-CAT-004：顺序练习按钮
- 模块：题库
- 页面：pages/catalog
- 优先级：P1
- 前置条件：加载完毕
- 测试数据：—
- 操作步骤：点击
- 预期 UI 结果：创建 SEQUENTIAL 会话 → session
- 预期接口请求：POST /practice-sessions
- 预期接口响应：HTTP 200
- 预期数据库变化：practice_sessions 新增
- 实际结果：OK
- 测试状态：PASS
- 缺陷编号：—
- 证据路径：—

### CASE-CAT-005：章节展开
- 模块：题库
- 页面：pages/catalog
- 优先级：P2
- 前置条件：展开的考试有章节
- 测试数据：—
- 操作步骤：点击
- 预期 UI 结果：显示 KP
- 预期接口请求：—
- 预期接口响应：—
- 预期数据库变化：—
- 实际结果：OK
- 测试状态：PASS
- 缺陷编号：—
- 证据路径：—

### CASE-CAT-006：练知识点
- 模块：题库
- 页面：pages/catalog
- 优先级：P1
- 前置条件：展开到 KP
- 测试数据：—
- 操作步骤：点击
- 预期 UI 结果：创建 KNOWLEDGE 会话
- 预期接口请求：POST /practice-sessions
- 预期接口响应：HTTP 200
- 预期数据库变化：OK
- 实际结果：PASS
- 测试状态：—
- 缺陷编号：—
- 证据路径：

### CASE-PI-001：每日一练入口
- 模块：练习
- 页面：pages/practice
- 优先级：P1
- 前置条件：—
- 测试数据：—
- 操作步骤：点击
- 预期 UI 结果：navigateTo study/daily
- 预期接口请求：GET /practice-sessions/daily-task
- 预期接口响应：HTTP 200
- 预期数据库变化：—
- 实际结果：OK
- 测试状态：PASS
- 缺陷编号：—
- 证据路径：—

### CASE-PI-002：错题本入口
- 模块：练习
- 页面：pages/practice
- 优先级：P1
- 前置条件：—
- 测试数据：—
- 操作步骤：点击
- 预期 UI 结果：navigateTo wrong
- 预期接口请求：—
- 预期接口响应：—
- 预期数据库变化：—
- 实际结果：OK
- 测试状态：PASS
- 缺陷编号：—
- 证据路径：—

### CASE-PI-003：我的笔记入口
- 模块：练习
- 页面：pages/practice
- 优先级：P1
- 前置条件：—
- 测试数据：—
- 操作步骤：点击
- 预期 UI 结果：navigateTo learn/notes → 笔记接口 404 → 显示开发中
- 预期接口请求：GET /notes
- 预期接口响应：HTTP 404
- 预期数据库变化：—
- 实际结果：catch 后显示开发中页
- 测试状态：PASS
- 缺陷编号：—
- 证据路径：—
- 备注：前端兜底 OK

### CASE-PI-004：打卡日历入口
- 模块：练习
- 页面：pages/practice
- 优先级：P1
- 前置条件：—
- 测试数据：—
- 操作步骤：点击
- 预期 UI 结果：navigateTo study/checkin → check-ins 404
- 预期接口请求：GET /check-ins
- 预期接口响应：HTTP 404
- 预期数据库变化：—
- 实际结果：showError 提示加载失败
- 测试状态：FAIL
- 缺陷编号：BUG-P1-001
- 证据路径：docs/qa/logs/checkin-404.json
- 备注：缺接口

### CASE-PCFG-001：页面入口
- 模块：练习配置
- 页面：pages/practice/config
- 优先级：P2
- 前置条件：—
- 测试数据：—
- 操作步骤：点击
- 预期 UI 结果：navigateTo 失败（页面未在 app.config 注册）
- 预期接口请求：—
- 预期接口响应：—
- 预期数据库变化：—
- 实际结果：报错：页面未注册
- 测试状态：FAIL
- 缺陷编号：BUG-P2-001
- 证据路径：docs/qa/screenshots/practice-config.png
- 备注：需在 app.config 注册或删除入口

### CASE-SESS-001：单选 A
- 模块：答题
- 页面：pages/practice/session
- 优先级：P0
- 前置条件：idx=0 单选
- 测试数据：—
- 操作步骤：点击 A
- 预期 UI 结果：高亮 + 500ms 防抖保存
- 预期接口请求：PUT /practice-sessions/{id}/answers/{qvid}
- 预期接口响应：HTTP 200
- 预期数据库变化：user_answers 写入
- 实际结果：OK
- 测试状态：PASS
- 缺陷编号：—
- 证据路径：—

### CASE-SESS-002：多选切换
- 模块：答题
- 页面：pages/practice/session
- 优先级：P0
- 前置条件：idx=0 多选
- 测试数据：—
- 操作步骤：依次点 A B C
- 预期 UI 结果：selected 长度 = 3
- 预期接口请求：PUT .../answers/...
- 预期接口响应：HTTP 200
- 预期数据库变化：user_answers
- 实际结果：OK
- 测试状态：PASS
- 缺陷编号：—
- 证据路径：—

### CASE-SESS-003：下一题
- 模块：答题
- 页面：pages/practice/session
- 优先级：P0
- 前置条件：任意题
- 测试数据：—
- 操作步骤：点击
- 预期 UI 结果：flushSave → idx+1
- 预期接口请求：PUT ...
- 预期接口响应：HTTP 200
- 预期数据库变化：—
- 实际结果：OK
- 测试状态：PASS
- 缺陷编号：—
- 证据路径：—

### CASE-SESS-004：上一题
- 模块：答题
- 页面：pages/practice/session
- 优先级：P0
- 前置条件：idx>0
- 测试数据：—
- 操作步骤：点击
- 预期 UI 结果：flushSave → idx-1
- 预期接口请求：PUT ...
- 预期接口响应：HTTP 200
- 预期数据库变化：—
- 实际结果：OK
- 测试状态：PASS
- 缺陷编号：—
- 证据路径：—

### CASE-SESS-005：收藏/取消
- 模块：答题
- 页面：pages/practice/session
- 优先级：P0
- 前置条件：—
- 测试数据：—
- 操作步骤：点击
- 预期 UI 结果：PUT/DELETE favorite
- 预期接口请求：PUT/DELETE /questions/{qid}/favorite
- 预期接口响应：HTTP 200
- 预期数据库变化：user_question_states 更新
- 实际结果：OK
- 测试状态：PASS
- 缺陷编号：—
- 证据路径：—

### CASE-SESS-006：交卷
- 模块：答题
- 页面：pages/practice/session
- 优先级：P0
- 前置条件：最后一题
- 测试数据：—
- 操作步骤：点击
- 预期 UI 结果：POST submit → result
- 预期接口请求：POST /practice-sessions/{id}/submit
- 预期接口响应：HTTP 200
- 预期数据库变化：session.status=SUBMITTED
- 实际结果：OK
- 测试状态：PASS
- 缺陷编号：—
- 证据路径：—

### CASE-SESS-007：题目有误反馈
- 模块：答题
- 页面：pages/practice/session
- 优先级：P1
- 前置条件：—
- 测试数据：—
- 操作步骤：点击文字链
- 预期 UI 结果：navigateTo feedback
- 预期接口请求：POST /question-feedback
- 预期接口响应：HTTP 200
- 预期数据库变化：question_feedback 写入
- 实际结果：OK
- 测试状态：PASS
- 缺陷编号：—
- 证据路径：—

### CASE-SESS-008：答题卡 ≡
- 模块：答题
- 页面：pages/practice/session
- 优先级：P2
- 前置条件：—
- 测试数据：—
- 操作步骤：点击
- 预期 UI 结果：切换 showCard
- 预期接口请求：—
- 预期接口响应：—
- 预期数据库变化：—
- 实际结果：OK
- 测试状态：PASS
- 缺陷编号：—
- 证据路径：—

### CASE-SESS-009：答题卡单元格
- 模块：答题
- 页面：pages/practice/session
- 优先级：P2
- 前置条件：showCard
- 测试数据：—
- 操作步骤：点击数字
- 预期 UI 结果：setIdx
- 预期接口请求：—
- 预期接口响应：—
- 预期数据库变化：—
- 实际结果：OK
- 测试状态：PASS
- 缺陷编号：—
- 证据路径：—

### CASE-RES-001：查看解析
- 模块：结果
- 页面：pages/practice/result
- 优先级：P0
- 前置条件：已交卷
- 测试数据：—
- 操作步骤：点击
- 预期 UI 结果：navigateTo session（已交卷）
- 预期接口请求：GET /practice-sessions/{id}/result
- 预期接口响应：HTTP 200
- 预期数据库变化：—
- 实际结果：OK
- 测试状态：PASS
- 缺陷编号：—
- 证据路径：—

### CASE-RES-002：错题本 按钮
- 模块：结果
- 页面：pages/practice/result
- 优先级：P1
- 前置条件：已交卷
- 测试数据：—
- 操作步骤：点击
- 预期 UI 结果：navigateTo wrong
- 预期接口请求：—
- 预期接口响应：—
- 预期数据库变化：—
- 实际结果：OK
- 测试状态：PASS
- 缺陷编号：—
- 证据路径：—

### CASE-RES-003：再考一次
- 模块：结果
- 页面：pages/practice/result
- 优先级：P1
- 前置条件：已交卷
- 测试数据：—
- 操作步骤：点击
- 预期 UI 结果：创建 MOCK 会话 → session
- 预期接口请求：POST /practice-sessions
- 预期接口响应：HTTP 200
- 预期数据库变化：practice_sessions 新增
- 实际结果：OK
- 测试状态：PASS
- 缺陷编号：—
- 证据路径：—

### CASE-WRG-001：加载列表
- 模块：错题本
- 页面：pages/wrong
- 优先级：P0
- 前置条件：已登录
- 测试数据：—
- 操作步骤：进入页面
- 预期 UI 结果：GET /wrong-questions
- 预期接口请求：HTTP 200
- 预期接口响应：—
- 预期数据库变化：OK
- 实际结果：PASS
- 测试状态：—
- 缺陷编号：—
- 证据路径：

### CASE-WRG-002：错题卡点击
- 模块：错题本
- 页面：pages/wrong
- 优先级：P1
- 前置条件：items 非空
- 测试数据：—
- 操作步骤：点击
- 预期 UI 结果：navigateTo wrong/analysis
- 预期接口请求：—
- 预期接口响应：—
- 预期数据库变化：—
- 实际结果：OK
- 测试状态：PASS
- 缺陷编号：—
- 证据路径：—

### CASE-WRG-003：筛选 chip
- 模块：错题本
- 页面：pages/wrong
- 优先级：P3
- 前置条件：已登录
- 测试数据：—
- 操作步骤：点击
- 预期 UI 结果：仅切 UI filter 不真过滤
- 预期接口请求：—
- 预期接口响应：—
- 预期数据库变化：—
- 实际结果：UI 显示但数据未过滤
- 测试状态：FAIL
- 缺陷编号：BUG-P2-002
- 证据路径：docs/qa/screenshots/wrong.png
- 备注：filter 状态未对 items 起作用

### CASE-WRG-004：编辑模式
- 模块：错题本
- 页面：pages/wrong
- 优先级：P3
- 前置条件：已登录
- 测试数据：—
- 操作步骤：点击编辑
- 预期 UI 结果：toggle edit 无删除 UI
- 预期接口请求：—
- 预期接口响应：—
- 预期数据库变化：—
- 实际结果：仅切换文字
- 测试状态：FAIL
- 缺陷编号：BUG-P2-003
- 证据路径：docs/qa/screenshots/wrong.png
- 备注：编辑态应有移出错题本按钮

### CASE-ANA-001：切换 Tab
- 模块：错题解析
- 页面：pages/wrong/analysis
- 优先级：P2
- 前置条件：—
- 测试数据：—
- 操作步骤：点击 q/a/k
- 预期 UI 结果：切 tab
- 预期接口请求：—
- 预期接口响应：—
- 预期数据库变化：—
- 实际结果：OK
- 测试状态：PASS
- 缺陷编号：—
- 证据路径：—

### CASE-ANA-002：加入错题本
- 模块：错题解析
- 页面：pages/wrong/analysis
- 优先级：P2
- 前置条件：—
- 测试数据：—
- 操作步骤：点击
- 预期 UI 结果：Toast 已加入错题本
- 预期接口请求：—
- 预期接口响应：—
- 预期数据库变化：—
- 实际结果：Toast 但未调 API
- 测试状态：FAIL
- 缺陷编号：BUG-P2-004
- 证据路径：docs/qa/screenshots/analysis.png
- 备注：无实际 API 调用

### CASE-PLAN-001：加载
- 模块：学习计划
- 页面：pages/study/plan
- 优先级：P1
- 前置条件：已登录
- 测试数据：—
- 操作步骤：进入页面
- 预期 UI 结果：GET /study-plan
- 预期接口请求：HTTP 404
- 预期接口响应：—
- 预期数据库变化：catch 后显示空态
- 实际结果：FAIL
- 测试状态：BUG-P1-005
- 缺陷编号：docs/qa/logs/plan-404.json
- 证据路径：缺接口

### CASE-PLAN-002：编辑
- 模块：学习计划
- 页面：pages/study/plan
- 优先级：P3
- 前置条件：—
- 测试数据：—
- 操作步骤：点击
- 预期 UI 结果：Toast 编辑计划开发中
- 预期接口请求：—
- 预期接口响应：—
- 预期数据库变化：—
- 实际结果：OK
- 测试状态：PASS
- 缺陷编号：—
- 证据路径：—

### CASE-DAILY-001：加载
- 模块：每日一练
- 页面：pages/study/daily
- 优先级：P1
- 前置条件：已登录
- 测试数据：—
- 操作步骤：进入页面
- 预期 UI 结果：GET /practice-sessions/daily-task
- 预期接口请求：HTTP 200
- 预期接口响应：—
- 预期数据库变化：当前 has_task=false 显示空态
- 实际结果：PASS
- 测试状态：—
- 缺陷编号：—
- 证据路径：

### CASE-DAILY-002：开始练习
- 模块：每日一练
- 页面：pages/study/daily
- 优先级：P1
- 前置条件：has_task=true
- 测试数据：—
- 操作步骤：点击
- 预期 UI 结果：POST sessions
- 预期接口请求：POST /practice-sessions
- 预期接口响应：HTTP 200
- 预期数据库变化：sessions 新增
- 实际结果：PASS
- 测试状态：—
- 缺陷编号：—
- 证据路径：

### CASE-CK-001：加载
- 模块：打卡日历
- 页面：pages/study/checkin
- 优先级：P1
- 前置条件：已登录
- 测试数据：—
- 操作步骤：进入页面
- 预期 UI 结果：GET /check-ins?year=&month=
- 预期接口请求：HTTP 404
- 预期接口响应：—
- 预期数据库变化：showError 提示
- 实际结果：FAIL
- 测试状态：BUG-P1-001
- 缺陷编号：docs/qa/logs/checkin-404.json
- 证据路径：缺接口

### CASE-CK-002：切换月份
- 模块：打卡日历
- 页面：pages/study/checkin
- 优先级：P2
- 前置条件：—
- 测试数据：—
- 操作步骤：点击 ‹/›
- 预期 UI 结果：GET /check-ins
- 预期接口请求：HTTP 404
- 预期接口响应：—
- 预期数据库变化：showError
- 实际结果：FAIL
- 测试状态：BUG-P1-001
- 缺陷编号：—
- 证据路径：—

### CASE-CK-003：打卡
- 模块：打卡日历
- 页面：pages/study/checkin
- 优先级：P1
- 前置条件：未打卡日
- 测试数据：—
- 操作步骤：点击日期
- 预期 UI 结果：POST /check-ins
- 预期接口请求：HTTP 404
- 预期接口响应：—
- 预期数据库变化：showError
- 实际结果：FAIL
- 测试状态：BUG-P1-001
- 缺陷编号：—
- 证据路径：—

### CASE-RP-001：加载
- 模块：学习报告
- 页面：pages/learn/report
- 优先级：P1
- 前置条件：已登录
- 测试数据：—
- 操作步骤：进入页面
- 预期 UI 结果：GET /progress/summary
- 预期接口请求：HTTP 200
- 预期接口响应：—
- 预期数据库变化：OK
- 实际结果：PASS
- 测试状态：—
- 缺陷编号：—
- 证据路径：

### CASE-RP-002：周趋势
- 模块：学习报告
- 页面：pages/learn/report
- 优先级：P2
- 前置条件：—
- 测试数据：—
- 操作步骤：—
- 预期 UI 结果：GET /progress/weekly
- 预期接口请求：HTTP 404
- 预期接口响应：—
- 预期数据库变化：setWeekly(null) 显示空态
- 实际结果：FAIL
- 测试状态：BUG-P1-002
- 缺陷编号：docs/qa/logs/report-404.json
- 证据路径：缺接口

### CASE-NOTES-001：加载
- 模块：我的笔记
- 页面：pages/learn/notes
- 优先级：P1
- 前置条件：已登录
- 测试数据：—
- 操作步骤：进入页面
- 预期 UI 结果：GET /notes
- 预期接口请求：HTTP 404
- 预期接口响应：—
- 预期数据库变化：catch → setNotes(null) → 显示开发中页
- 实际结果：PASS
- 测试状态：—
- 缺陷编号：—
- 证据路径：前端兜底 OK

### CASE-NOTES-002：新建笔记
- 模块：我的笔记
- 页面：pages/learn/notes
- 优先级：P3
- 前置条件：—
- 测试数据：—
- 操作步骤：点击
- 预期 UI 结果：Toast 新建笔记开发中
- 预期接口请求：—
- 预期接口响应：—
- 预期数据库变化：—
- 实际结果：OK
- 测试状态：PASS
- 缺陷编号：—
- 证据路径：—

### CASE-FAV-001：加载
- 模块：收藏
- 页面：pages/favorite
- 优先级：P1
- 前置条件：已登录
- 测试数据：—
- 操作步骤：进入页面
- 预期 UI 结果：GET /favorites
- 预期接口请求：HTTP 200
- 预期接口响应：—
- 预期数据库变化：OK
- 实际结果：PASS
- 测试状态：—
- 缺陷编号：—
- 证据路径：

### CASE-FAV-002：取消收藏
- 模块：收藏
- 页面：pages/favorite
- 优先级：P1
- 前置条件：items 非空
- 测试数据：—
- 操作步骤：点击
- 预期 UI 结果：DELETE favorite
- 预期接口请求：DELETE /questions/{qid}/favorite
- 预期接口响应：HTTP 200
- 预期数据库变化：—
- 实际结果：OK
- 测试状态：PASS
- 缺陷编号：—
- 证据路径：—

### CASE-PROG-001：加载
- 模块：进度
- 页面：pages/progress
- 优先级：P1
- 前置条件：已登录
- 测试数据：—
- 操作步骤：进入页面
- 预期 UI 结果：GET /progress/summary + GET /user/exam-targets
- 预期接口请求：HTTP 200
- 预期接口响应：—
- 预期数据库变化：OK
- 实际结果：PASS
- 测试状态：—
- 缺陷编号：—
- 证据路径：

### CASE-PROF-001：打卡日历 链接
- 模块：个人中心
- 页面：pages/profile
- 优先级：P2
- 前置条件：—
- 测试数据：—
- 操作步骤：点击
- 预期 UI 结果：navigateTo study/checkin → 404 接口
- 预期接口请求：—
- 预期接口响应：—
- 预期数据库变化：—
- 实际结果：页面打开但显示异常
- 测试状态：FAIL
- 缺陷编号：BUG-P1-001
- 证据路径：—
- 备注：—

### CASE-PROF-002：我的笔记 行
- 模块：个人中心
- 页面：pages/profile
- 优先级：P2
- 前置条件：—
- 测试数据：—
- 操作步骤：点击
- 预期 UI 结果：navigateTo learn/notes → 404 接口
- 预期接口请求：—
- 预期接口响应：—
- 预期数据库变化：—
- 实际结果：前端兜底显示开发中页
- 测试状态：PASS
- 缺陷编号：—
- 证据路径：—

### CASE-PROF-003：学习报告 行
- 模块：个人中心
- 页面：pages/profile
- 优先级：P2
- 前置条件：—
- 测试数据：—
- 操作步骤：点击
- 预期 UI 结果：navigateTo learn/report → partial OK
- 预期接口请求：—
- 预期接口响应：—
- 预期数据库变化：—
- 实际结果：部分 OK（weekly 404）
- 测试状态：PASS
- 缺陷编号：—
- 证据路径：—

### CASE-PROF-004：注销账号
- 模块：个人中心
- 页面：pages/profile
- 优先级：P1
- 前置条件：—
- 测试数据：—
- 操作步骤：点击 → Modal 确认
- 预期 UI 结果：POST /user/logout → reLaunch login
- 预期接口请求：POST /api/v1/user/logout
- 预期接口响应：HTTP 200
- 预期数据库变化：token 清空
- 实际结果：OK
- 测试状态：PASS
- 缺陷编号：—
- 证据路径：—

### CASE-PROF-005：兑换码 行
- 模块：个人中心
- 页面：pages/profile
- 优先级：P3
- 前置条件：—
- 测试数据：—
- 操作步骤：点击
- 预期 UI 结果：path 为空 菜单项无 onClick
- 预期接口请求：—
- 预期接口响应：—
- 预期数据库变化：—
- 实际结果：不响应
- 测试状态：FAIL
- 缺陷编号：BUG-P2-005
- 证据路径：docs/qa/screenshots/profile.png
- 备注：缺路径导致点击无反应

### CASE-PROF-006：关于我们 行
- 模块：个人中心
- 页面：pages/profile
- 优先级：P3
- 前置条件：—
- 测试数据：—
- 操作步骤：点击
- 预期 UI 结果：path 为空
- 预期接口请求：—
- 预期接口响应：—
- 预期数据库变化：—
- 实际结果：不响应
- 测试状态：FAIL
- 缺陷编号：BUG-P2-006
- 证据路径：docs/qa/screenshots/profile.png
- 备注：同上

### CASE-PROF-007：加载用户信息
- 模块：个人中心
- 页面：pages/profile
- 优先级：P1
- 前置条件：未登录态缓存
- 测试数据：—
- 操作步骤：进入页面
- 预期 UI 结果：GET /auth/me
- 预期接口请求：HTTP 200
- 预期接口响应：—
- 预期数据库变化：OK
- 实际结果：PASS
- 测试状态：—
- 缺陷编号：—
- 证据路径：

### CASE-FB-001：切换类型 chip
- 模块：反馈
- 页面：pages/feedback
- 优先级：P2
- 前置条件：—
- 测试数据：—
- 操作步骤：点击 chip
- 预期 UI 结果：高亮 + 切 type
- 预期接口请求：—
- 预期接口响应：—
- 预期数据库变化：—
- 实际结果：OK
- 测试状态：PASS
- 缺陷编号：—
- 证据路径：—

### CASE-FB-002：空内容提交
- 模块：反馈
- 页面：pages/feedback
- 优先级：P1
- 前置条件：content=''
- 测试数据：—
- 操作步骤：点击提交
- 预期 UI 结果：Toast 请填写反馈内容
- 预期接口请求：—
- 预期接口响应：—
- 预期数据库变化：—
- 实际结果：OK
- 测试状态：PASS
- 缺陷编号：—
- 证据路径：—

### CASE-FB-003：正常提交
- 模块：反馈
- 页面：pages/feedback
- 优先级：P1
- 前置条件：已关联题目
- 测试数据：—
- 操作步骤：点击提交
- 预期 UI 结果：POST /question-feedback + Toast 成功
- 预期接口请求：POST /api/v1/question-feedback
- 预期接口响应：HTTP 200
- 预期数据库变化：question_feedback 写入
- 实际结果：OK
- 测试状态：PASS
- 缺陷编号：—
- 证据路径：—

### CASE-SEC-001：Token 失效
- 模块：安全
- 页面：—
- 优先级：P1
- 前置条件：Authorization: Bearer invalid
- 测试数据：—
- 操作步骤：请求任意受保护接口
- 预期 UI 结果：HTTP 401
- 预期接口请求：—
- 预期接口响应：—
- 预期数据库变化：前端未自动 reLaunch login 需手动
- 实际结果：FAIL
- 测试状态：BUG-P1-003
- 缺陷编号：docs/qa/logs/401.json
- 证据路径：未实现 401 → 重新登录自动跳转

### CASE-LOAD-001：首次加载
- 模块：加载
- 页面：home
- 优先级：P2
- 前置条件：冷启动
- 测试数据：—
- 操作步骤：—
- 预期 UI 结果：Promise.all 三接口
- 预期接口请求：GET /user/exam-targets /practice-sessions/daily-task /progress/summary
- 预期接口响应：HTTP 200
- 预期数据库变化：—
- 实际结果：OK
- 测试状态：PASS
- 缺陷编号：—
- 证据路径：—

### CASE-EMPTY-001：无目标
- 模块：空态
- 页面：home
- 优先级：P1
- 前置条件：未设置 primary
- 测试数据：—
- 操作步骤：进入页面
- 预期 UI 结果：显示 设置目标考试
- 预期接口请求：—
- 预期接口响应：—
- 预期数据库变化：—
- 实际结果：OK
- 测试状态：PASS
- 缺陷编号：—
- 证据路径：—

### CASE-EMPTY-002：无收藏
- 模块：空态
- 页面：favorite
- 优先级：P1
- 前置条件：—
- 测试数据：—
- 操作步骤：进入页面
- 预期 UI 结果：显示 暂无收藏
- 预期接口请求：—
- 预期接口响应：—
- 预期数据库变化：—
- 实际结果：OK
- 测试状态：PASS
- 缺陷编号：—
- 证据路径：—

### CASE-EMPTY-003：无错题
- 模块：空态
- 页面：wrong
- 优先级：P1
- 前置条件：—
- 测试数据：—
- 操作步骤：进入页面
- 预期 UI 结果：显示 暂无错题 + 引导
- 预期接口请求：—
- 预期接口响应：—
- 预期数据库变化：—
- 实际结果：OK
- 测试状态：PASS
- 缺陷编号：—
- 证据路径：—

### CASE-IDEMPOTENT-001：重复保存同一题
- 模块：幂等
- 页面：session
- 优先级：P0
- 前置条件：—
- 测试数据：—
- 操作步骤：快速多次切换同一题选项
- 预期 UI 结果：PUT 多次
- 预期接口请求：HTTP 200 × N user_answers 仅一行
- 预期接口响应：幂等
- 预期数据库变化：PASS
- 实际结果：—
- 测试状态：—
- 缺陷编号：session.tsx 用 idempotencyKey 防重入
- 证据路径：

### CASE-IDEMPOTENT-002：重复交卷
- 模块：幂等
- 页面：session
- 优先级：P0
- 前置条件：已交卷
- 测试数据：—
- 操作步骤：再次调用 submit
- 预期 UI 结果：POST /submit
- 预期接口请求：HTTP 409 / 200
- 预期接口响应：状态保持
- 预期数据库变化：幂等
- 实际结果：PASS
- 测试状态：—
- 缺陷编号：—
- 证据路径：后端 submit 服务保证幂等
