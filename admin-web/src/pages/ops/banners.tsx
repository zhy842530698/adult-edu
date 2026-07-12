import React, { useEffect, useState } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, InputNumber, Switch, Space, Popconfirm, message,
} from 'antd';
import { api } from '../../api/client';

export default function BannersPage() {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  const load = async () => {
    const r = await api.get('/admin/ops/banners');
    setItems(r.data.items || []);
  };
  useEffect(() => { load(); }, []);

  const onSubmit = async (vals: any) => {
    if (editing) await api.put(`/admin/ops/banners/${editing.id}`, vals);
    else await api.post('/admin/ops/banners', vals);
    message.success('已保存'); setOpen(false); setEditing(null); form.resetFields(); load();
  };

  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        <Button type="primary" onClick={() => { setEditing(null); form.resetFields(); setOpen(true); }}>
          新增轮播图
        </Button>
      </Space>
      <Table rowKey="id" dataSource={items} columns={[
        { title: 'ID', dataIndex: 'id', width: 70 },
        { title: '标题', dataIndex: 'title' },
        { title: '图片', dataIndex: 'image_url', ellipsis: true },
        { title: '排序', dataIndex: 'sort_order', width: 80 },
        { title: '启用', dataIndex: 'is_active', width: 80, render: (v) => v ? '是' : '否' },
        {
          title: '操作', fixed: 'right' as const, width: 160, render: (_: any, r: any) => (
            <Space>
              <a onClick={() => { setEditing(r); form.setFieldsValue(r); setOpen(true); }}>编辑</a>
              <Popconfirm title="确定删除？" onConfirm={async () => {
                await api.delete(`/admin/ops/banners/${r.id}`); message.success('已删除'); load();
              }}><a>删除</a></Popconfirm>
            </Space>
          ),
        },
      ]} />
      <Modal open={open} title={editing ? '编辑轮播图' : '新增轮播图'} onCancel={() => setOpen(false)} onOk={() => form.submit()} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={onSubmit} initialValues={{ sort_order: 0, is_active: true, link_type: 'EXAM' }}>
          <Form.Item name="title" label="标题" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="image_url" label="图片URL" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="link_type" label="跳转类型">
            <Select options={[
              { label: '考试', value: 'EXAM' },
              { label: '试卷', value: 'PAPER' },
              { label: '外链', value: 'URL' },
              { label: '无', value: 'NONE' },
            ]} />
          </Form.Item>
          <Form.Item name="link_target" label="跳转目标"><Input /></Form.Item>
          <Form.Item name="sort_order" label="排序"><InputNumber min={0} /></Form.Item>
          <Form.Item name="is_active" label="启用" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}