import React, { useEffect, useState } from 'react';
import {
  Table, Button, Tag, Space, Modal, Input, Form, message,
} from 'antd';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/auth';

export default function ReviewPage() {
  const hasPerm = useAuthStore((s) => s.hasPerm);
  const [items, setItems] = useState<any[]>([]);
  const [rejectOpen, setRejectOpen] = useState<{ id: number } | null>(null);
  const [rejectForm] = Form.useForm();

  const load = async () => {
    const r = await api.get('/admin/question-reviews');
    setItems(r.data.items || []);
  };
  useEffect(() => { load(); }, []);

  const approve = async (id: number) => {
    Modal.confirm({
      title: '确认通过审核',
      content: '通过后将生成已发布版本，可在题库中查看。',
      okText: '确认',
      onOk: async () => {
        await api.post(`/admin/question-reviews/${id}/approve`);
        message.success('已通过'); load();
      },
    });
  };

  const reject = async () => {
    const vals = await rejectForm.validateFields();
    await api.post(`/admin/question-reviews/${rejectOpen!.id}/reject`, { reason: vals.reason });
    message.success('已驳回'); setRejectOpen(null); rejectForm.resetFields(); load();
  };

  return (
    <div>
      <Table
        rowKey="id"
        dataSource={items}
        columns={[
          { title: '审核ID', dataIndex: 'id', width: 80 },
          { title: '题目ID', dataIndex: 'question_id', width: 100 },
          { title: '版本ID', dataIndex: 'question_version_id', width: 100 },
          { title: '提交人', dataIndex: 'submitted_by', width: 100 },
          {
            title: '当前决定', dataIndex: 'decision', width: 120,
            render: (v) => (
              <Tag color={v === 'PENDING' ? 'processing' : v === 'APPROVED' ? 'success' : 'error'}>{v}</Tag>
            ),
          },
          { title: '驳回原因', dataIndex: 'reject_reason' },
          { title: '提交时间', dataIndex: 'submitted_at', width: 180 },
          { title: '审核时间', dataIndex: 'reviewed_at', width: 180 },
          {
            title: '操作', fixed: 'right' as const, width: 220, render: (_: any, r: any) => (
              <Space>
                {r.decision === 'PENDING' && hasPerm('question.review_approve') && (
                  <Button size="small" type="primary" onClick={() => approve(r.id)}>通过</Button>
                )}
                {r.decision === 'PENDING' && hasPerm('question.review_reject') && (
                  <Button size="small" danger onClick={() => setRejectOpen({ id: r.id })}>驳回</Button>
                )}
              </Space>
            ),
          },
        ]}
      />
      <Modal
        open={!!rejectOpen}
        title="驳回审核"
        onCancel={() => setRejectOpen(null)}
        onOk={reject}
        okText="确认驳回"
        okButtonProps={{ danger: true }}
      >
        <Form form={rejectForm} layout="vertical">
          <Form.Item name="reason" label="驳回原因" rules={[{ required: true, min: 5 }]}>
            <Input.TextArea rows={4} placeholder="请清晰描述驳回原因，便于录入员改进" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}