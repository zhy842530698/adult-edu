import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Switch, InputNumber, Space, Popconfirm } from 'antd';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/auth';

export default function ExamCategoriesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();
  const hasPerm = useAuthStore((s) => s.hasPerm);

  const load = () => api.get('/admin/exam-categories').then((r) => setItems(r.data.items || []));
  useEffect(() => { load(); }, []);

  const onSave = async (vals: any) => {
    if (editing) await api.put(`/admin/exam-categories/${editing.id}`, vals);
    else await api.post('/admin/exam-categories', vals);
    setOpen(false); setEditing(null); form.resetFields(); load();
  };

  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        {hasPerm('catalog.create') && <Button type="primary" onClick={() => { setEditing(null); form.resetFields(); setOpen(true); }}>新增考试方向</Button>}
      </Space>
      <Table rowKey="id" dataSource={items} columns={[
        { title: '编码', dataIndex: 'code' },
        { title: '名称', dataIndex: 'name' },
        { title: '排序', dataIndex: 'sort_order' },
        { title: '启用', dataIndex: 'is_active', render: (v) => v ? '是' : '否' },
        {
          title: '操作', render: (_: any, r: any) => (
            <Space>
              {hasPerm('catalog.edit') && <a onClick={() => { setEditing(r); form.setFieldsValue(r); setOpen(true); }}>编辑</a>}
              {hasPerm('catalog.delete') && <Popconfirm title="确定删除？" onConfirm={async () => { await api.delete(`/admin/exam-categories/${r.id}`); load(); }}><a>删除</a></Popconfirm>}
            </Space>
          ),
        },
      ]} />
      <Modal open={open} title={editing ? '编辑考试方向' : '新增考试方向'} onCancel={() => setOpen(false)} onOk={() => form.submit()} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={onSave}>
          <Form.Item name="code" label="编码" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="sort_order" label="排序" initialValue={0}><InputNumber min={0} /></Form.Item>
          <Form.Item name="is_active" label="启用" valuePropName="checked" initialValue={true}><Switch /></Form.Item>
          <Form.Item name="icon_url" label="图标 URL"><Input /></Form.Item>
          <Form.Item name="description" label="简介"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
