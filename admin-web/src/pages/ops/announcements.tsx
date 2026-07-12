import React, { useEffect, useState } from 'react';
import {
  Table, Button, Modal, Form, Input, Switch, Space, Popconfirm, message,
} from 'antd';
import { api } from '../../api/client';

export default function AnnouncementsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const load = async () => {
    const r = await api.get('/admin/ops/announcements');
    setItems(r.data.items || []);
  };
  useEffect(() => { load(); }, []);

  const onSubmit = async (vals: any) => {
    await api.post('/admin/ops/announcements', vals);
    message.success('已发布'); setOpen(false); form.resetFields(); load();
  };

  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        <Button type="primary" onClick={() => setOpen(true)}>新增公告</Button>
      </Space>
      <Table rowKey="id" dataSource={items} columns={[
        { title: 'ID', dataIndex: 'id', width: 70 },
        { title: '标题', dataIndex: 'title' },
        {
          title: '启用', dataIndex: 'is_active', width: 100,
          render: (v) => v ? '是' : '否',
        },
        { title: '创建时间', dataIndex: 'created_at', width: 180 },
        {
          title: '操作', fixed: 'right' as const, width: 120, render: (_: any, r: any) => (
            <Popconfirm title="删除公告？" onConfirm={async () => {
              await api.delete(`/admin/ops/announcements/${r.id}`); message.success('已删除'); load();
            }}><a>删除</a></Popconfirm>
          ),
        },
      ]} />
      <Modal open={open} title="新增公告" onCancel={() => setOpen(false)} onOk={() => form.submit()} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={onSubmit} initialValues={{ is_active: true }}>
          <Form.Item name="title" label="标题" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="content" label="内容" rules={[{ required: true }]}>
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="is_active" label="启用" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}