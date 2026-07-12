import React, { useEffect, useState } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, Tag, Space, message,
} from 'antd';
import { api } from '../../api/client';

export default function RolesPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [perms, setPerms] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState<any>(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  const load = async () => {
    const [a, b] = await Promise.all([api.get('/admin/roles'), api.get('/admin/roles/permissions')]);
    setRoles(a.data.items || []); setPerms(b.data.items || []);
  };
  useEffect(() => { load(); }, []);

  const onCreate = async (vals: any) => {
    await api.post('/admin/roles', vals); message.success('已创建'); setOpen(false); form.resetFields(); load();
  };
  const onEdit = async (vals: any) => {
    await api.put(`/admin/roles/${editOpen.id}`, vals); message.success('已更新'); setEditOpen(null); load();
  };

  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        <Button type="primary" onClick={() => setOpen(true)}>新增角色</Button>
      </Space>
      <Table rowKey="id" dataSource={roles} columns={[
        { title: 'ID', dataIndex: 'id', width: 70 },
        { title: '编码', dataIndex: 'code' },
        { title: '名称', dataIndex: 'name' },
        {
          title: '权限数', width: 100,
          render: (_: any, r: any) => r.permissions?.length || 0,
        },
        {
          title: '操作', width: 100, render: (_: any, r: any) => (
            <a onClick={() => { setEditOpen(r); editForm.setFieldsValue({
              code: r.code, name: r.name, description: r.description,
              permission_ids: r.permissions,
            }); }}>编辑</a>
          ),
        },
      ]} />

      <Modal open={open} title="新增角色" onCancel={() => setOpen(false)} onOk={() => form.submit()} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={onCreate}>
          <Form.Item name="code" label="编码" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="description" label="描述"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="permission_ids" label="权限">
            <Select mode="multiple" showSearch optionFilterProp="label"
              options={perms.map((p) => ({ label: `${p.module} / ${p.code}（${p.name}）`, value: p.code }))} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal open={!!editOpen} title={`编辑角色 #${editOpen?.id}`} onCancel={() => setEditOpen(null)} onOk={() => editForm.submit()} destroyOnClose>
        <Form form={editForm} layout="vertical" onFinish={onEdit}>
          <Form.Item name="code" label="编码" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="description" label="描述"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="permission_ids" label="权限">
            <Select mode="multiple" showSearch optionFilterProp="label"
              options={perms.map((p) => ({ label: `${p.module} / ${p.code}（${p.name}）`, value: p.code }))} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}