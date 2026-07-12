import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Card, Descriptions, Tag, Button, Form, Input, Space, message, Spin, Typography,
} from 'antd';
import { api } from '../../api/client';

export default function FeedbackDetailPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [fb, setFb] = useState<any>(null);
  const [replyForm] = Form.useForm();
  const [resolveForm] = Form.useForm();

  const load = async () => {
    const r = await api.get(`/admin/question-feedback/${id}`);
    setFb(r.data);
  };
  useEffect(() => { load(); }, [id]);

  if (!fb) return <Spin />;

  const reply = async () => {
    const v = await replyForm.validateFields();
    await api.post(`/admin/question-feedback/${id}/reply`, { content: v.content });
    message.success('已回复用户'); replyForm.resetFields(); load();
  };
  const resolve = async () => {
    const v = await resolveForm.validateFields();
    await api.post(`/admin/question-feedback/${id}/resolve`, {
      resolution_note: v.resolution_note,
      link_revision_version_id: v.link_revision_version_id || undefined,
    });
    message.success('已标记解决'); nav('/feedback');
  };

  return (
    <Card title={`反馈 #${fb.id}`} extra={<a onClick={() => nav('/feedback')}>返回</a>}>
      <Descriptions bordered column={2} size="small">
        <Descriptions.Item label="题目ID">{fb.question_id}</Descriptions.Item>
        <Descriptions.Item label="版本ID">{fb.question_version_id}</Descriptions.Item>
        <Descriptions.Item label="类型">{fb.feedback_type}</Descriptions.Item>
        <Descriptions.Item label="状态"><Tag>{fb.status}</Tag></Descriptions.Item>
        <Descriptions.Item label="用户答案" span={2}>{fb.user_selected_options}</Descriptions.Item>
        <Descriptions.Item label="反馈内容" span={2}>{fb.content}</Descriptions.Item>
        <Descriptions.Item label="提交时间" span={2}>{fb.created_at}</Descriptions.Item>
      </Descriptions>

      <Typography.Title level={5} style={{ marginTop: 16 }}>回复用户</Typography.Title>
      <Form form={replyForm} layout="vertical" onFinish={reply}>
        <Form.Item name="content" rules={[{ required: true, min: 2 }]}>
          <Input.TextArea rows={3} placeholder="回复内容" />
        </Form.Item>
        <Button type="primary" htmlType="submit">提交回复</Button>
      </Form>

      <Typography.Title level={5} style={{ marginTop: 16 }}>标记解决</Typography.Title>
      <Form form={resolveForm} layout="vertical" onFinish={resolve}>
        <Form.Item name="resolution_note" label="处理结论" rules={[{ required: true, min: 5 }]}>
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item name="link_revision_version_id" label="关联修订版本ID（可选）">
          <Input placeholder="如已为该题创建新草稿，填入新版本号" />
        </Form.Item>
        <Space>
          <Button type="primary" htmlType="submit">标记已解决</Button>
        </Space>
      </Form>
    </Card>
  );
}