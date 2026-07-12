import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Switch, Select, Space, Popconfirm } from 'antd';
import { api } from '../../api/client';

export default function KnowledgePointsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  const load = async () => {
    const [a, b] = await Promise.all([api.get('/admin/knowledge-points'), api.get('/admin/chapters')]);
    setItems(a.data.items || []); setChapters(b.data.items || []);
  };
  useEffect(() => { load(); }, []);

  const onSave = async (vals: any) => {
    if (editing) await api.put(`/admin/knowledge-points/${editing.id}`, vals);
    else await api.post('/admin/knowledge-points', vals);
    setOpen(false); setEditing(null); form.resetFields(); load();
  };

  return (
    <div>
      <Button type="primary" style={{ marginBottom: 12 }} onClick={() => { setEditing(null); form.resetFields(); setOpen(true); }}>新增知识点</Button>
      <Table rowKey="id" dataSource={items} columns={[
        { title: '编码', dataIndex: 'code' },
        { title: '名称', dataIndex: 'name' },
        { title: '所属章节', dataIndex: 'chapter_id', render: (v) => chapters.find((c) => c.id === v)?.name },
        { title: '启用', dataIndex: 'is_active', render: (v) => v ? '是' : '否' },
        { title: '操作', render: (_: any, r: any) => (
          <Space>
            <a onClick={() => { setEditing(r); form.setFieldsValue(r); setOpen(true); }}>编辑</a>
            <Popconfirm title="确定删除？" onConfirm={async () => { await api.delete(`/admin/knowledge-points/${r.id}`); load(); }}><a>删除</a></Popconfirm>
          </Space>
        )},
      ]} />
      <Modal open={open} title={editing ? '编辑知识点' : '新增知识点'} onCancel={() => setOpen(false)} onOk={() => form.submit()} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={onSave}>
          <Form.Item name="chapter_id" label="所属章节" rules={[{ required: true }]}>
            <Select options={chapters.map((c) => ({ label: c.name, value: c.id }))} />
          </Form.Item>
          <Form.Item name="code" label="编码" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="is_active" label="启用" valuePropName="checked" initialValue={true}><Switch /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
