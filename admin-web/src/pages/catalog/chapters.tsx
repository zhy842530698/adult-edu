import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Switch, Select, Space, Popconfirm } from 'antd';
import { api } from '../../api/client';

export default function ChaptersPage() {
  const [items, setItems] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form] = Form.useForm();

  const load = async () => {
    const [a, b] = await Promise.all([api.get('/admin/chapters'), api.get('/admin/subjects')]);
    setItems(a.data.items || []); setSubjects(b.data.items || []);
  };
  useEffect(() => { load(); }, []);

  const onSave = async (vals: any) => {
    if (editing) await api.put(`/admin/chapters/${editing.id}`, vals);
    else await api.post('/admin/chapters', vals);
    setOpen(false); setEditing(null); form.resetFields(); load();
  };

  return (
    <div>
      <Button type="primary" style={{ marginBottom: 12 }} onClick={() => { setEditing(null); form.resetFields(); setOpen(true); }}>新增章节</Button>
      <Table rowKey="id" dataSource={items} columns={[
        { title: '编码', dataIndex: 'code' },
        { title: '名称', dataIndex: 'name' },
        { title: '所属科目', dataIndex: 'subject_id', render: (v) => subjects.find((s) => s.id === v)?.name },
        { title: '启用', dataIndex: 'is_active', render: (v) => v ? '是' : '否' },
        { title: '操作', render: (_: any, r: any) => (
          <Space>
            <a onClick={() => { setEditing(r); form.setFieldsValue(r); setOpen(true); }}>编辑</a>
            <Popconfirm title="确定删除？" onConfirm={async () => { await api.delete(`/admin/chapters/${r.id}`); load(); }}><a>删除</a></Popconfirm>
          </Space>
        )},
      ]} />
      <Modal open={open} title={editing ? '编辑章节' : '新增章节'} onCancel={() => setOpen(false)} onOk={() => form.submit()} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={onSave}>
          <Form.Item name="subject_id" label="所属科目" rules={[{ required: true }]}>
            <Select options={subjects.map((s) => ({ label: s.name, value: s.id }))} />
          </Form.Item>
          <Form.Item name="code" label="编码" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="is_active" label="启用" valuePropName="checked" initialValue={true}><Switch /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
