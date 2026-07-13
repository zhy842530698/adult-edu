import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Form, Input, Select, InputNumber, Button, Card, Space, message, Switch, Divider,
  Upload, Tag, Image, Empty, Popconfirm, Tooltip,
} from 'antd';
import { InboxOutlined, DeleteOutlined, FileImageOutlined, SoundOutlined, EyeOutlined } from '@ant-design/icons';
import { api } from '../../api/client';
import { useAuthStore } from '../../store/auth';

const OPTION_CODES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

interface OptionDraft { option_code: string; content: string }
interface AssetItem { id?: number; asset_type: 'IMAGE' | 'AUDIO'; url: string; file_name?: string; file_size?: number }

export default function QuestionEditPage() {
  const { id } = useParams<{ id?: string }>();
  const nav = useNavigate();
  const [form] = Form.useForm();
  const hasPerm = useAuthStore((s) => s.hasPerm);
  const [exams, setExams] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [kps, setKps] = useState<any[]>([]);
  const [options, setOptions] = useState<OptionDraft[]>(
    [{ option_code: 'A', content: '' }, { option_code: 'B', content: '' }],
  );
  const [correct, setCorrect] = useState<string[]>([]);
  const [questionType, setQuestionType] = useState<string>('SINGLE_CHOICE');
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [uploadingAsset, setUploadingAsset] = useState<'IMAGE' | 'AUDIO' | null>(null);

  useEffect(() => {
    api.get('/admin/exams').then((r) => setExams(r.data.items || []));
    api.get('/admin/subjects').then((r) => setSubjects(r.data.items || []));
    api.get('/admin/chapters').then((r) => setChapters(r.data.items || []));
    api.get('/admin/knowledge-points').then((r) => setKps(r.data.items || []));
  }, []);

  useEffect(() => {
    if (!id) return;
    api.get(`/admin/questions/${id}`).then((r) => {
      const d = r.data;
      setQuestionType(d.question_type);
      if (d.version) {
        form.setFieldsValue({
          question_type: d.question_type,
          exam_id: d.exam_id,
          subject_id: d.subject_id,
          chapter_id: d.chapter_id,
          difficulty: d.difficulty,
          tags: d.tags,
          stem: d.version.stem,
          analysis: d.version.analysis,
          score: d.version.score,
          source_name: d.version.source_name,
          source_year: d.version.source_year,
          source_question_no: d.version.source_question_no,
          license_type: d.version.license_type,
          external_ref: d.version.external_ref,
          source_type: d.version.source_type || 'PLATFORM_ORIGINAL',
          real_exam_year: d.version.real_exam_year,
        });
        setOptions(d.version.options || []);
        setCorrect(d.version.correct_options || []);
        setAssets(d.version.assets || []);
      }
    });
  }, [id]);

  const onTypeChange = (v: string) => {
    setQuestionType(v);
    setCorrect([]);
  };

  const addOption = () => {
    if (options.length >= 8) { message.warning('最多 8 个选项'); return; }
    const next = OPTION_CODES[options.length];
    setOptions([...options, { option_code: next, content: '' }]);
  };
  const removeOption = (idx: number) => {
    if (options.length <= 2) { message.warning('至少 2 个选项'); return; }
    const removed = options[idx].option_code;
    setOptions(options.filter((_, i) => i !== idx));
    setCorrect(correct.filter((c) => c !== removed));
  };
  const updateOption = (idx: number, content: string) => {
    setOptions(options.map((o, i) => i === idx ? { ...o, content } : o));
  };

  const toggleCorrect = (code: string) => {
    if (questionType === 'SINGLE_CHOICE') {
      setCorrect([code]);
    } else {
      if (correct.includes(code)) setCorrect(correct.filter((c) => c !== code));
      else setCorrect([...correct, code]);
    }
  };

  // ---- asset upload helpers ----
  const uploadAsset = async (file: File, kind: 'IMAGE' | 'AUDIO') => {
    setUploadingAsset(kind);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const url = kind === 'IMAGE' ? '/admin/uploads/images' : '/admin/uploads/audios';
      const resp = await api.post(url, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAssets((prev) => [...prev, {
        asset_type: kind,
        url: resp.data.url,
        file_name: resp.data.file_name,
        file_size: resp.data.file_size,
      }]);
      message.success(`${kind === 'IMAGE' ? '图片' : '音频'} 上传成功`);
    } catch (e: any) {
      const detail = e?.response?.data?.detail || e?.response?.data?.message || e?.message || '上传失败';
      message.error(detail);
    } finally {
      setUploadingAsset(null);
    }
  };

  const removeAsset = (idx: number) => {
    setAssets(assets.filter((_, i) => i !== idx));
  };

  // upload props for IMAGE uploader
  const imgUploadProps = {
    name: 'file',
    accept: 'image/*',
    showUploadList: false,
    beforeUpload: (file: File) => {
      uploadAsset(file, 'IMAGE');
      return false;
    },
  };
  const audioUploadProps = {
    name: 'file',
    accept: 'audio/*,video/mp4',
    showUploadList: false,
    beforeUpload: (file: File) => {
      uploadAsset(file, 'AUDIO');
      return false;
    },
  };

  const validate = (vals: any) => {
    if (options.some((o) => !o.content.trim())) return '每个选项都必须填写内容';
    const filled = options.filter((o) => o.content.trim());
    if (questionType === 'SINGLE_CHOICE' && correct.length !== 1) return '单选题必须有且仅有 1 个正确答案';
    if (questionType === 'MULTIPLE_CHOICE' && correct.length < 2) return '多选题至少需要 2 个正确答案';
    if (!correct.every((c) => filled.some((o) => o.option_code === c))) return '正确答案必须在已填写的选项内';
    if (filled.length > 8) return '选项最多 8 个';
    return null;
  };

  const onSubmit = async (vals: any) => {
    const err = validate(vals);
    if (err) { message.error(err); return; }
    const payload = {
      ...vals,
      options: options.filter((o) => o.content.trim()),
      correct_options: correct,
      assets: assets.map((a) => ({ asset_type: a.asset_type, url: a.url, file_name: a.file_name, file_size: a.file_size })),
    };
    if (id) await api.put(`/admin/questions/${id}`, payload);
    else await api.post('/admin/questions', payload);
    message.success(id ? '已保存为新版本' : '已创建草稿');
    nav('/questions');
  };

  return (
    <Card title={id ? `编辑题目 #${id}` : '新增题目'} extra={<a onClick={() => nav('/questions')}>返回列表</a>}>
      <Form form={form} layout="vertical" onFinish={onSubmit}
        initialValues={{ question_type: 'SINGLE_CHOICE', difficulty: 3, score: 2, source_type: 'PLATFORM_ORIGINAL' }}>
        <Space size="large" wrap>
          <Form.Item name="question_type" label="题型" rules={[{ required: true }]}>
            <Select onChange={onTypeChange} options={[
              { label: '单选题', value: 'SINGLE_CHOICE' },
              { label: '多选题', value: 'MULTIPLE_CHOICE' },
            ]} style={{ width: 140 }} />
          </Form.Item>
          <Form.Item name="exam_id" label="所属考试" rules={[{ required: true }]}>
            <Select options={exams.map((e) => ({ label: e.name, value: e.id }))} style={{ width: 200 }} />
          </Form.Item>
          <Form.Item name="subject_id" label="科目" rules={[{ required: true }]}>
            <Select options={subjects.map((s) => ({ label: s.name, value: s.id }))} style={{ width: 160 }} />
          </Form.Item>
          <Form.Item name="chapter_id" label="章节">
            <Select allowClear options={chapters.map((c) => ({ label: c.name, value: c.id }))} style={{ width: 160 }} />
          </Form.Item>
          <Form.Item name="knowledge_point_ids" label="知识点">
            <Select mode="multiple" allowClear options={kps.map((k) => ({ label: k.name, value: k.id }))} style={{ width: 240 }} />
          </Form.Item>
          <Form.Item name="difficulty" label="难度">
            <InputNumber min={1} max={5} />
          </Form.Item>
          <Form.Item name="score" label="分值">
            <InputNumber min={0.1} step={0.5} />
          </Form.Item>
        </Space>

        <Form.Item name="stem" label="题干" rules={[{ required: true }]}>
          <Input.TextArea rows={3} placeholder="允许受控 HTML" />
        </Form.Item>

        {/* ---- media assets section ---- */}
        <Divider orientation="left" plain>
          <Space>
            <span>媒体资源</span>
            <Tooltip title="图片（如配图、阅读材料原图）/音频（如听力题音轨）会跟题目一起保存；上传后会出现在导出的 Excel 和 C 端题目中。">
              <EyeOutlined style={{ color: '#999' }} />
            </Tooltip>
          </Space>
        </Divider>
        <div style={{ background: '#fafafa', padding: 12, borderRadius: 6, marginBottom: 16 }}>
          {/* Images */}
          <div style={{ marginBottom: 16 }}>
            <Space style={{ marginBottom: 8 }}>
              <FileImageOutlined />
              <b>图片</b>
              <Tag>{assets.filter((a) => a.asset_type === 'IMAGE').length}</Tag>
            </Space>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {assets.filter((a) => a.asset_type === 'IMAGE').map((a, idx) => {
                const realIdx = assets.indexOf(a);
                return (
                  <Card
                    key={`${a.url}-${idx}`}
                    size="small"
                    style={{ width: 180 }}
                    bodyStyle={{ padding: 8 }}
                    cover={
                      <Image
                        src={a.url}
                        alt={a.file_name || 'image'}
                        style={{ objectFit: 'cover', height: 120, width: '100%' }}
                        fallback="data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCAyNCAyNCc+PHJlY3Qgd2lkdGg9JzI0JyBoZWlnaHQ9JzI0JyBmaWxsPScjZmZmJy8+PC9zdmc+"
                      />
                    }
                  >
                    <div style={{ fontSize: 12, color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.file_name || a.url.split('/').pop()}
                    </div>
                    <Popconfirm title="删除该图片？" onConfirm={() => removeAsset(realIdx)}>
                      <Button danger size="small" icon={<DeleteOutlined />} style={{ marginTop: 4 }}>
                        删除
                      </Button>
                    </Popconfirm>
                  </Card>
                );
              })}
              <Upload.Dragger {...imgUploadProps} disabled={!hasPerm('question.edit') || uploadingAsset !== null} style={{ width: 180, height: 180, padding: 8 }}>
                {uploadingAsset === 'IMAGE' ? (
                  <span>上传中…</span>
                ) : (
                  <>
                    <p className="ant-upload-drag-icon" style={{ marginBottom: 4 }}><InboxOutlined /></p>
                    <p className="ant-upload-text" style={{ fontSize: 12 }}>点击或拖拽上传图片</p>
                    <p className="ant-upload-hint" style={{ fontSize: 11 }}>jpg/png/gif/webp，≤8MB</p>
                  </>
                )}
              </Upload.Dragger>
            </div>
          </div>

          {/* Audios */}
          <div>
            <Space style={{ marginBottom: 8 }}>
              <SoundOutlined />
              <b>音频</b>
              <Tag>{assets.filter((a) => a.asset_type === 'AUDIO').length}</Tag>
            </Space>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {assets.filter((a) => a.asset_type === 'AUDIO').map((a) => {
                const realIdx = assets.indexOf(a);
                return (
                  <Space key={`${a.url}-${realIdx}`} style={{ width: '100%' }}>
                    <Tag color="purple">AUDIO</Tag>
                    <audio src={a.url} controls style={{ height: 32, flex: 1, maxWidth: 480 }} />
                    <span style={{ fontSize: 12, color: '#999', minWidth: 120 }}>
                      {a.file_name || a.url.split('/').pop()}
                    </span>
                    <Popconfirm title="删除该音频？" onConfirm={() => removeAsset(realIdx)}>
                      <Button danger size="small" icon={<DeleteOutlined />}>删除</Button>
                    </Popconfirm>
                  </Space>
                );
              })}
              <Upload {...audioUploadProps} disabled={!hasPerm('question.edit') || uploadingAsset !== null}>
                <Button icon={<SoundOutlined />} loading={uploadingAsset === 'AUDIO'}>
                  上传音频 (mp3/m4a/wav/ogg，≤30MB)
                </Button>
              </Upload>
            </div>
          </div>

          {assets.length === 0 && (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无媒体资源" style={{ marginTop: 8 }} />
          )}
        </div>

        <Divider orientation="left" plain>选项</Divider>
        {options.map((o, idx) => (
          <Space key={o.option_code} style={{ marginBottom: 8, display: 'flex' }}>
            <span style={{ width: 24 }}>{o.option_code}.</span>
            <Input
              style={{ width: 480 }}
              value={o.content}
              onChange={(e) => updateOption(idx, e.target.value)}
              placeholder={`选项 ${o.option_code}`}
            />
            <Button
              type={correct.includes(o.option_code) ? 'primary' : 'default'}
              onClick={() => toggleCorrect(o.option_code)}
            >
              {correct.includes(o.option_code) ? '✓ 答案' : '设为答案'}
            </Button>
            <Button danger onClick={() => removeOption(idx)} disabled={options.length <= 2}>删除</Button>
          </Space>
        ))}
        <Button onClick={addOption} disabled={options.length >= 8}>+ 添加选项</Button>

        <Divider orientation="left" plain>答案与解析</Divider>
        <Form.Item label="当前答案">
          <span>{correct.length ? correct.join(' / ') : <em style={{ color: '#999' }}>未选择</em>}</span>
        </Form.Item>
        <Form.Item name="analysis" label="解析" rules={[{ required: true }]}>
          <Input.TextArea rows={3} />
        </Form.Item>

        <Divider orientation="left" plain>来源</Divider>
        <Space size="large" wrap>
          <Form.Item name="source_type" label="来源类型" rules={[{ required: true }]}>
            <Select
              style={{ width: 160 }}
              onChange={(v) => {
                if (v !== 'REAL_EXAM') {
                  form.setFieldValue('real_exam_year', undefined);
                }
              }}
              options={[
                { label: '平台原创', value: 'PLATFORM_ORIGINAL' },
                { label: '真题', value: 'REAL_EXAM' },
                { label: '模拟题', value: 'MOCK' },
                { label: '资料汇编', value: 'COMPILATION' },
              ]}
            />
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prev, cur) => prev?.source_type !== cur?.source_type}
          >
            {({ getFieldValue }) =>
              getFieldValue('source_type') === 'REAL_EXAM' ? (
                <Form.Item
                  name="real_exam_year"
                  label="真题年份"
                  rules={[{ required: true, message: '真题必须填年份' }]}
                >
                  <InputNumber min={1900} max={2100} placeholder="如 2020" style={{ width: 140 }} />
                </Form.Item>
              ) : null
            }
          </Form.Item>
          <Form.Item name="source_name" label="来源名称" rules={[{ required: true }]}>
            <Input placeholder="如 CET4-2023-06 / 平台原创" style={{ width: 220 }} />
          </Form.Item>
          <Form.Item name="source_year" label="年份">
            <InputNumber min={1900} max={2100} style={{ width: 120 }} />
          </Form.Item>
          <Form.Item name="source_question_no" label="原题号">
            <Input style={{ width: 140 }} />
          </Form.Item>
          <Form.Item name="license_type" label="授权类型" rules={[{ required: true }]}>
            <Input placeholder="platform-original / cited-cc / licensed" style={{ width: 220 }} />
          </Form.Item>
          <Form.Item name="external_ref" label="外部引用">
            <Input style={{ width: 220 }} />
          </Form.Item>
          <Form.Item name="tags" label="标签">
            <Input placeholder="逗号分隔" style={{ width: 220 }} />
          </Form.Item>
        </Space>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" disabled={!hasPerm(id ? 'question.edit' : 'question.create')}>
              保存草稿
            </Button>
            <Button onClick={() => nav('/questions')}>取消</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
}