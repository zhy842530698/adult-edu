import React, { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic, Spin, Typography, Tag } from 'antd';
import { api } from '../../api/client';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    api.get('/admin/dashboard/summary').then((r) => setData(r.data));
  }, []);

  if (!data) return <Spin />;

  const today = data.today || {};
  const queues = data.queues || {};

  return (
    <div>
      <Typography.Title level={3}>工作台</Typography.Title>
      <Row gutter={16}>
        <Col span={6}><Card><Statistic title="今日新增用户" value={today.new_users || 0} /></Card></Col>
        <Col span={6}><Card><Statistic title="今日活跃用户" value={today.active_users || 0} /></Card></Col>
        <Col span={6}><Card><Statistic title="今日答题数" value={today.answer_count || 0} /></Card></Col>
        <Col span={6}><Card><Statistic title="今日完成会话" value={today.session_count || 0} /></Card></Col>
      </Row>
      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={8}><Card><Statistic title="待审核题目" value={queues.pending_reviews || 0} valueStyle={{ color: queues.pending_reviews ? '#cf1322' : undefined }} /></Card></Col>
        <Col span={8}><Card><Statistic title="失败导入任务" value={queues.failed_imports || 0} /></Card></Col>
        <Col span={8}><Card><Statistic title="待处理反馈" value={queues.open_feedbacks || 0} /></Card></Col>
      </Row>
      <Card style={{ marginTop: 16 }} title="最近 7 日答题趋势">
        {(data.trend_7d || []).length === 0 ? (
          <Typography.Text type="secondary">暂无数据</Typography.Text>
        ) : (
          <div>
            {data.trend_7d.map((d: any) => (
              <Tag key={d.date} style={{ margin: 4 }}>{d.date}: {d.sessions} 会话</Tag>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}