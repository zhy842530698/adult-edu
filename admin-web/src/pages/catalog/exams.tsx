import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Switch, InputNumber, Select, Space, Popconfirm } from 'antd';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/auth';

export default function ExamsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();
  const hasPerm = useAuthStore((s) => s.hasPerm);

  const load = async () => {
    const [a, b] = await Promise.all([api.get('/admin/exams'), api.get('/admin/exam-categories')]);
    setItems(a.data.items || []);
    setCats(b.data.items || []);
  };
  useEffect(() => { load(); }, []);

  const onSave = async (vals: any) => {
    if (editing) await api.put(`/admin/exams/${editing.id}`, vals);
    else await api.post('/admin/exams', vals);
    setOpen(false); setEditing(null); form.resetFields(); load();
  };

  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        {hasPerm('catalog.create') && <Button type="primary" onClick={() => { setEditing(null); form.resetFields(); setOpen(true); }}>新增考试</Button>}
      </Space>
      <Table rowKey="id" dataSource={items} columns={[
        { title: '编码', dataIndex: 'code' },
        { title: '名称', dataIndex: 'name' },
        { title: '所属方向', dataIndex: 'category_id', render: (v) => cats.find((c) => c.id === v)?.name },
        { title: '排序', dataIndex: 'sort_order' },
        { title: '启用', dataIndex: 'is_active', render: (v) => v ? '是' : '否' },
        {
          title: '操作', render: (_: any, r: any) => (
            <Space>
              {hasPerm('catalog.edit') && <a onClick={() => { setEditing(r); form.setFieldsValue(r); setOpen(true); }}>编辑</a>}
              {hasPerm('catalog.delete') && <Popconfirm title="确定删除？" onConfirm={async () => { await api.delete(`/admin/exams/${r.id}`); load(); }}><a>删除</a></Popconfirm>}
            </Space>
          ),
        },
      ]} />
      <Modal open={open} title={editing ? '编辑考试' : '新增考试'} onCancel={() => setOpen(false)} onOk={() => form.submit()} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={onSave}>
          <Form.Item name="category_id" label="所属方向" rules={[{ required: true }]}>
            <Select options={cats.map((c) => ({ label: c.name, value: c.id }))} />
          </Form.Item>
          <Form.Item name="code" label="编码" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="sort_order" label="排序" initialValue={0}><InputNumber min={0} /></Form.Item>
          <Form.Item name="is_active" label="启用" valuePropName="checked" initialValue={true}><Switch /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
