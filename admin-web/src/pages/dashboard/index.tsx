import React, { useEffect, useMemo, useState } from 'react';
import { Card, Col, Row, Statistic, Spin, Typography, Tag, Space, Empty, Tooltip } from 'antd';
import { CheckCircleTwoTone, ClockCircleTwoTone, FileTextTwoTone } from '@ant-design/icons';
import dayjs from 'dayjs';
import { api } from '../../api/client';

type Summary = {
  today: {
    new_users: number;
    active_users: number;
    answer_count: number;
    session_count: number;
  };
  queues: {
    pending_reviews: number;
    failed_imports: number;
    open_feedbacks: number;
  };
  questions: {
    total: number;
    approved: number;
    pending: number;
    draft: number;
  };
  users: {
    total: number;
  };
  trend_7d: { date: string; sessions: number }[];
};

// AntD v5 status tokens — green/gold/gray are CVD-designed and ship with
// every AntD theme, so no new dependency is needed.
const STATUS = {
  approved: { color: '#52c41a', label: '已通过' },
  pending:  { color: '#faad14', label: '待审核' },
  draft:    { color: '#bfbfbf', label: '草稿' },
} as const;

function BreakdownBar({
  total,
  approved,
  pending,
  draft,
}: {
  total: number;
  approved: number;
  pending: number;
  draft: number;
}) {
  if (total <= 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无题目" style={{ padding: 16 }} />;
  }
  const segs = [
    { key: 'approved', count: approved, ...STATUS.approved },
    { key: 'pending',  count: pending,  ...STATUS.pending },
    { key: 'draft',    count: draft,    ...STATUS.draft },
  ];
  // Guarantee 1px visible segment even for 0 counts so the legend numbers
  // still map to a color the eye can find.
  const minPx = 4;
  const weightedTotal = Math.max(
    1,
    ...segs.map((s) => s.count),
  );
  return (
    <div>
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: 10,
          borderRadius: 999,
          overflow: 'hidden',
          background: '#f5f5f5',
        }}
        role="img"
        aria-label={`题目分布：已通过 ${approved}、待审核 ${pending}、草稿 ${draft}，共 ${total}`}
      >
        {segs.map((s) => {
          const flex = s.count > 0 ? Math.max((s.count / total) * 100, (minPx / 600) * 100) : 0;
          return (
            <Tooltip key={s.key} title={`${s.label} ${s.count}（${pct(s.count, total)}%）`}>
              <div
                style={{
                  flex,
                  background: s.color,
                  transition: 'flex 0.3s ease',
                }}
              />
            </Tooltip>
          );
        })}
      </div>
      <Space size={16} wrap style={{ marginTop: 12 }}>
        {segs.map((s) => (
          <Space key={s.key} size={6}>
            <span
              style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                borderRadius: 2,
                background: s.color,
              }}
            />
            <Typography.Text type="secondary">{s.label}</Typography.Text>
            <Typography.Text strong>{s.count.toLocaleString()}</Typography.Text>
            <Typography.Text type="secondary">({pct(s.count, total)}%)</Typography.Text>
          </Space>
        ))}
      </Space>
    </div>
  );
}

function pct(n: number, d: number) {
  if (d <= 0) return '0';
  return ((n / d) * 100).toFixed(1);
}

/**
 * Lightweight 7-day session bar chart. Single-hue sequential bars with a
 * hairline baseline, hover tooltips, and overflow-safe axis labels. We render
 * raw SVG instead of pulling in @ant-design/plots because the project has no
 * chart dependency today and this is one chart.
 */
function TrendChart({ data }: { data: { date: string; sessions: number }[] }) {
  // Fill in missing days so the x-axis is always 7 evenly-spaced bars.
  const days = useMemo(() => {
    const today = dayjs().startOf('day');
    const map = new Map(data.map((d) => [d.date, d.sessions]));
    return Array.from({ length: 7 }).map((_, i) => {
      const d = today.subtract(6 - i, 'day');
      const key = d.format('YYYY-MM-DD');
      return { date: key, sessions: map.get(key) ?? 0, day: d };
    });
  }, [data]);

  const max = Math.max(1, ...days.map((d) => d.sessions));
  // Snap to a "nice" upper bound so the gridline count is stable across days.
  const niceMax = niceCeil(max);

  const width = 720;
  const height = 200;
  const padL = 36;
  const padR = 12;
  const padT = 16;
  const padB = 36;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const barGap = 12;
  const slotW = plotW / days.length;
  const barW = Math.max(8, slotW - barGap);

  return (
    <svg
      role="img"
      aria-label="最近 7 日练习会话柱状图"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      width="100%"
      height={height}
      style={{ display: 'block' }}
    >
      {/* Y axis grid (4 lines) — hairline, one shade off surface, never dashed */}
      {Array.from({ length: 5 }).map((_, i) => {
        const y = padT + (plotH * i) / 4;
        const v = niceMax - (niceMax * i) / 4;
        return (
          <g key={i}>
            <line x1={padL} x2={width - padR} y1={y} y2={y} stroke="#f0f0f0" strokeWidth={1} />
            <text x={padL - 6} y={y + 4} textAnchor="end" fontSize={11} fill="#bfbfbf">
              {Math.round(v)}
            </text>
          </g>
        );
      })}

      {/* Bars */}
      {days.map((d, i) => {
        const h = niceMax === 0 ? 0 : (d.sessions / niceMax) * plotH;
        const x = padL + slotW * i + (slotW - barW) / 2;
        const y = padT + plotH - h;
        return (
          <g key={d.date}>
            <Tooltip title={`${d.date}: ${d.sessions} 会话`}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                rx={3}
                ry={3}
                fill="#1677ff"
                opacity={d.sessions === 0 ? 0.35 : 0.92}
              />
            </Tooltip>
            {/* Direct-label only the peak — anti-pattern: don't label every bar */}
            {d.sessions === max && max > 0 && (
              <text
                x={x + barW / 2}
                y={y - 4}
                textAnchor="middle"
                fontSize={11}
                fill="#1677ff"
                fontWeight={600}
              >
                {d.sessions}
              </text>
            )}
          </g>
        );
      })}

      {/* Baseline */}
      <line
        x1={padL}
        x2={width - padR}
        y1={padT + plotH}
        y2={padT + plotH}
        stroke="#d9d9d9"
        strokeWidth={1}
      />

      {/* X axis labels — show every other day to avoid crowding */}
      {days.map((d, i) => (
        <text
          key={d.date}
          x={padL + slotW * i + slotW / 2}
          y={padT + plotH + 18}
          textAnchor="middle"
          fontSize={11}
          fill="#8c8c8c"
        >
          {i % 2 === 0 ? d.day.format('MM-DD') : '·'}
        </text>
      ))}
    </svg>
  );
}

function niceCeil(n: number) {
  if (n <= 5) return 5;
  if (n <= 10) return 10;
  const mag = Math.pow(10, Math.floor(Math.log10(n)));
  const norm = n / mag;
  const step = norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return step * mag;
}

export default function DashboardPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = (initial = false) => {
    if (initial) setLoading(true);
    else setRefreshing(true);
    api
      .get<Summary>('/admin/dashboard/summary')
      .then((r) => setData(r.data))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => {
    load(true);
  }, []);

  if (loading || !data) {
    return (
      <div style={{ padding: 80, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  const today = data.today;
  const queues = data.queues;
  const questions = data.questions;
  const totalUsers = data.users?.total ?? 0;
  const trend = data.trend_7d ?? [];

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>工作台</Typography.Title>
        <a onClick={() => load(false)}>{refreshing ? '刷新中…' : '刷新'}</a>
      </Space>

      {/* Row 1 — 题库总览 + 总用户数 + 今日活跃（运营视角的三块大数） */}
      <Row gutter={16}>
        <Col xs={24} md={12} lg={14}>
          <Card
            title="题库总览"
            extra={
              <Typography.Text type="secondary">
                最近 30 天新增：暂未统计
              </Typography.Text>
            }
          >
            <Space size={24} align="end" wrap>
              <Statistic
                title="题目总数"
                value={questions.total}
                suffix="题"
                valueStyle={{ fontSize: 36, fontWeight: 600 }}
              />
              <Statistic
                title="总用户数"
                value={totalUsers}
                suffix="人"
                valueStyle={{ fontSize: 28 }}
              />
            </Space>
            <div style={{ marginTop: 20 }}>
              <BreakdownBar
                total={questions.total}
                approved={questions.approved}
                pending={questions.pending}
                draft={questions.draft}
              />
            </div>
          </Card>
        </Col>
        <Col xs={24} md={12} lg={10}>
          <Card title="今日运营" bodyStyle={{ paddingTop: 8 }}>
            <Row gutter={16}>
              <Col span={12}>
                <Statistic title="今日新增用户" value={today.new_users ?? 0} />
              </Col>
              <Col span={12}>
                <Statistic title="今日活跃用户" value={today.active_users ?? 0} />
              </Col>
              <Col span={12} style={{ marginTop: 16 }}>
                <Statistic title="今日答题数" value={today.answer_count ?? 0} />
              </Col>
              <Col span={12} style={{ marginTop: 16 }}>
                <Statistic title="今日完成会话" value={today.session_count ?? 0} />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Row 2 — 队列（待办视角） */}
      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col xs={24} md={8}>
          <Card>
            <Statistic
              title={
                <Space>
                  <ClockCircleTwoTone twoToneColor={STATUS.pending.color} />
                  待审核题目
                </Space>
              }
              value={queues.pending_reviews ?? questions.pending}
              valueStyle={{
                color: (queues.pending_reviews ?? questions.pending) > 0 ? STATUS.pending.color : undefined,
                fontSize: 24,
              }}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic
              title={
                <Space>
                  <FileTextTwoTone twoToneColor="#cf1322" />
                  待处理纠错工单
                </Space>
              }
              value={queues.open_feedbacks ?? 0}
              valueStyle={{ color: (queues.open_feedbacks ?? 0) > 0 ? '#cf1322' : undefined, fontSize: 24 }}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic
              title={
                <Space>
                  <CheckCircleTwoTone twoToneColor="#1677ff" />
                  失败导入任务
                </Space>
              }
              value={queues.failed_imports ?? 0}
              valueStyle={{ fontSize: 24 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Row 3 — 趋势（运营视角的趋势面板） */}
      <Card
        style={{ marginTop: 16 }}
        title={
          <Space>
            <span>最近 7 日练习会话趋势</span>
            <Tag color="processing">近 7 日</Tag>
          </Space>
        }
        extra={
          <Typography.Text type="secondary">
            数据源：PracticeSession.started_at
          </Typography.Text>
        }
      >
        {trend.length === 0 ? (
          <Empty description="暂无数据" />
        ) : (
          <TrendChart data={trend} />
        )}
      </Card>
    </div>
  );
}
