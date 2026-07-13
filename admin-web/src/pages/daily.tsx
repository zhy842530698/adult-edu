import React, { useEffect, useState } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, InputNumber, DatePicker, Space, message,
} from 'antd';
import dayjs from 'dayjs';
// src/pages/daily.tsx
import { api } from "../api/client";

export default function DailyPage() {
  const [items, setItems] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const load = async () => {
    const r = await api.get('/admin/daily-practice-configs');
    setItems(r.data.items || []);
  };
  useEffect(() => {
    api.get('/admin/exams').then((r) => setExams(r.data.items || []));
    load();
  }, []);

  const onSubmit = async (vals: any) => {
    const payload = {
      config_date: (vals.config_date as any).format('YYYY-MM-DD'),
      exam_id: vals.exam_id,
      question_count: vals.question_count,
      auto_pick_rule: vals.auto_pick_rule,
    };
    await api.post('/admin/daily-practice-configs', payload);
    message.success('已保存'); setOpen(false); form.resetFields(); load();
  };

  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        <Button type="primary" onClick={() => setOpen(true)}>配置每日一练</Button>
      </Space>
      <Table rowKey="id" dataSource={items} columns={[
        { title: '日期', dataIndex: 'config_date', width: 130 },
        { title: '考试', dataIndex: 'exam_id', width: 200, render: (v) => exams.find((e) => e.id === v)?.name },
        { title: '题量', dataIndex: 'question_count', width: 100 },
        { title: '抽题规则', dataIndex: 'auto_pick_rule', width: 130 },
      ]} />
      <Modal open={open} title="配置每日一练" onCancel={() => setOpen(false)} onOk={() => form.submit()} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={onSubmit}
          initialValues={{ question_count: 10, auto_pick_rule: 'RANDOM' }}>
          <Form.Item name="config_date" label="日期" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} defaultValue={dayjs()} />
          </Form.Item>
          <Form.Item name="exam_id" label="考试" rules={[{ required: true }]}>
            <Select options={exams.map((e) => ({ label: e.name, value: e.id }))} />
          </Form.Item>
          <Form.Item name="question_count" label="题量">
            <InputNumber min={1} max={50} />
          </Form.Item>
          <Form.Item name="auto_pick_rule" label="抽题规则">
            <Select options={[
              { label: '随机', value: 'RANDOM' },
              { label: '按难度比例', value: 'BY_DIFFICULTY' },
              { label: '手工指定', value: 'MANUAL' },
            ]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}