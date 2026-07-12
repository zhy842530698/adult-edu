import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Form, Input, Select, InputNumber, Button, Card, Space, message, Tag, Divider, DatePicker,
} from 'antd';
import { api } from '../../api/client';

const { RangePicker } = DatePicker;

export default function PaperEditPage() {
  const { id } = useParams<{ id?: string }>();
  const nav = useNavigate();
  const [form] = Form.useForm();
  const [exams, setExams] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [selectedQVs, setSelectedQVs] = useState<number[]>([]);

  useEffect(() => {
    api.get('/admin/exams').then((r) => setExams(r.data.items || []));
    api.get('/admin/questions', { params: { page_size: 100, status: 'PUBLISHED' } })
      .then((r) => setQuestions(r.data.items || []));
  }, []);

  useEffect(() => {
    if (!id) return;
    // No GET /admin/papers/{id} on backend MVP; just allow editing via creating a new version later.
  }, [id]);

  const addSelected = (qvId: number) => {
    if (selectedQVs.includes(qvId)) return;
    setSelectedQVs([...selectedQVs, qvId]);
  };
  const remove = (qvId: number) => setSelectedQVs(selectedQVs.filter((x) => x !== qvId));

  const onSubmit = async (vals: any) => {
    const payload: any = {
      exam_id: vals.exam_id,
      title: vals.title,
      paper_type: vals.paper_type,
      description: vals.description,
      pass_score: vals.pass_score || 0,
      duration_minutes: vals.duration_minutes || 0,
      answer_display_rule: vals.answer_display_rule || 'AFTER_SUBMIT',
      question_version_ids: selectedQVs,
    };
    if (vals.range && vals.range.length === 2) {
      payload.available_from = vals.range[0].toISOString();
      payload.available_to = vals.range[1].toISOString();
    }
    await api.post('/admin/papers', payload);
    message.success('已创建试卷（未发布）'); nav('/papers');
  };

  return (
    <Card title={id ? `编辑试卷 #${id}` : '新建试卷'} extra={<a onClick={() => nav('/papers')}>返回</a>}>
      <Form form={form} layout="vertical" onFinish={onSubmit}
        initialValues={{ paper_type: 'PRACTICE', answer_display_rule: 'AFTER_SUBMIT' }}>
        <Space size="large" wrap>
          <Form.Item name="exam_id" label="所属考试" rules={[{ required: true }]}>
            <Select options={exams.map((e) => ({ label: e.name, value: e.id }))} style={{ width: 200 }} />
          </Form.Item>
          <Form.Item name="paper_type" label="类型">
            <Select options={[
              { label: '练习卷', value: 'PRACTICE' },
              { label: '模拟卷', value: 'MOCK' },
              { label: '历年真题', value: 'HISTORY' },
            ]} style={{ width: 140 }} />
          </Form.Item>
          <Form.Item name="title" label="标题" rules={[{ required: true }]}>
            <Input style={{ width: 280 }} />
          </Form.Item>
          <Form.Item name="pass_score" label="及格分">
            <InputNumber min={0} />
          </Form.Item>
          <Form.Item name="duration_minutes" label="时长（分钟）">
            <InputNumber min={0} />
          </Form.Item>
          <Form.Item name="answer_display_rule" label="答案显示">
            <Select options={[
              { label: '交卷后', value: 'AFTER_SUBMIT' },
              { label: '即时', value: 'IMMEDIATE' },
              { label: '不显示', value: 'NEVER' },
            ]} style={{ width: 140 }} />
          </Form.Item>
          <Form.Item name="range" label="可见时间">
            <RangePicker showTime />
          </Form.Item>
        </Space>
        <Form.Item name="description" label="说明">
          <Input.TextArea rows={2} />
        </Form.Item>

        <Divider orientation="left" plain>选题（已发布版本）</Divider>
        <div style={{ maxHeight: 240, overflow: 'auto', border: '1px solid #eee', padding: 8, marginBottom: 12 }}>
          {questions.length === 0 && <span style={{ color: '#999' }}>暂无可用已发布题目</span>}
          {questions.map((q) => (
            <Tag
              key={q.id}
              style={{ cursor: 'pointer', marginBottom: 6 }}
              color={selectedQVs.includes(q.current_version_id) ? 'success' : 'default'}
              onClick={() => addSelected(q.current_version_id)}
            >
              #{q.id} {q.question_type === 'SINGLE_CHOICE' ? '单选' : '多选'} v{q.current_version_id}
            </Tag>
          ))}
        </div>
        <div>
          <b>已选 {selectedQVs.length} 题</b>
          <div>
            {selectedQVs.map((qv, idx) => (
              <Tag key={qv} closable onClose={() => remove(qv)} style={{ marginTop: 4 }}>
                #{idx + 1} v{qv}
              </Tag>
            ))}
          </div>
        </div>

        <Form.Item style={{ marginTop: 16 }}>
          <Space>
            <Button type="primary" htmlType="submit" disabled={selectedQVs.length === 0}>保存为草稿</Button>
            <Button onClick={() => nav('/papers')}>取消</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
}