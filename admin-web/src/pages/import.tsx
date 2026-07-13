import React, { useState } from 'react';
import {
  Card, Upload, Button, Table, Tag, Space, message, Alert, Typography, Modal,
} from 'antd';
import { InboxOutlined, DownloadOutlined } from '@ant-design/icons';
// src/pages/import.tsx
import { api } from "../api/client";
import { useAuthStore } from "../store/auth";

const { Dragger } = Upload;

export default function ImportPage() {
  const hasPerm = useAuthStore((s) => s.hasPerm);
  const [job, setJob] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const refresh = async (id: number) => {
    const r = await api.get(`/admin/import-jobs/${id}`);
    setJob(r.data);
  };

  const uploadProps = {
    name: 'file',
    accept: '.xlsx,.xls',
    showUploadList: false,
    beforeUpload: async (file: File) => {
      setUploading(true);
      try {
        const form = new FormData();
        form.append('file', file);
        const r = await api.post('/admin/import-jobs', form, { headers: { 'Content-Type': 'multipart/form-data' } });
        message.success(`已创建导入任务 #${r.data.id}`);
        await refresh(r.data.id);
      } catch (e: any) {
        message.error(e?.message || '上传失败');
      } finally {
        setUploading(false);
      }
      return false;
    },
  };

  const onConfirm = async () => {
    if (!job) return;
    Modal.confirm({
      title: '确认导入',
      content: `本次将写入 ${job.ok_rows} 道草稿（${job.error_rows} 行错误将被忽略）。继续？`,
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        const r = await api.post(`/admin/import-jobs/${job.id}/confirm`);
        message.success(`已写入 ${r.data.confirmed_question_count} 道草稿`);
        await refresh(job.id);
      },
    });
  };

  const downloadTemplate = async () => {
    setDownloading(true);
    try {
      const resp = await api.get('/admin/import-jobs/template/download', { responseType: 'blob' });
      const url = URL.createObjectURL(resp.data as Blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'excel_import_template.xlsx';
      a.click(); URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div>
      <Card title="Excel 批量导入">
        <Space style={{ marginBottom: 12 }}>
          <Button icon={<DownloadOutlined />} loading={downloading} onClick={downloadTemplate}>
            下载模板
          </Button>
        </Space>
        <Dragger {...uploadProps} disabled={!hasPerm('question.import')} style={{ padding: 16 }}>
          <p className="ant-upload-drag-icon"><InboxOutlined /></p>
          <p className="ant-upload-text">点击或将 Excel 文件拖拽到这里上传</p>
          <p className="ant-upload-hint">仅支持 .xlsx / .xls。导入任务会先逐行校验，确认后才落库。</p>
        </Dragger>

        {job && (
          <Card style={{ marginTop: 16 }} type="inner" title={`任务 #${job.id} - ${job.filename}`}>
            <Space size="large" wrap>
              <span>状态：<Tag color={job.status === 'CONFIRMED' ? 'success' : 'processing'}>{job.status}</Tag></span>
              <span>总行数：<b>{job.total_rows}</b></span>
              <span>成功：<b style={{ color: '#52c41a' }}>{job.ok_rows}</b></span>
              <span>警告：<b style={{ color: '#faad14' }}>{job.warn_rows}</b></span>
              <span>失败：<b style={{ color: '#f5222d' }}>{job.error_rows}</b></span>
              <span>已确认题数：<b>{job.confirmed_question_count || 0}</b></span>
            </Space>
            {job.status === 'PARSED' && (
              <div style={{ marginTop: 12 }}>
                <Alert type="info" message="校验完成，确认后才会真正写入草稿表。可下载错误报告修正后重新上传。" />
                <Button type="primary" style={{ marginTop: 12 }} disabled={!hasPerm('question.import')} onClick={onConfirm}>
                  确认导入 {job.ok_rows} 道
                </Button>
              </div>
            )}
            {job.status === 'CONFIRMED' && (
              <Alert style={{ marginTop: 12 }} type="success" message={`导入完成，共生成 ${job.confirmed_question_count} 道草稿（待审核）`} />
            )}
            <Typography.Title level={5} style={{ marginTop: 16 }}>逐行结果</Typography.Title>
            <Table
              rowKey="row_no"
              size="small"
              dataSource={job.rows || []}
              pagination={{ pageSize: 10 }}
              columns={[
                { title: '行', dataIndex: 'row_no', width: 60 },
                {
                  title: '状态', dataIndex: 'status', width: 100,
                  render: (v) => <Tag color={v === 'OK' ? 'success' : 'error'}>{v}</Tag>,
                },
                {
                  title: '错误/警告', dataIndex: 'errors',
                  render: (v: string[]) => (v && v.length ? v.join('；') : '-'),
                },
              ]}
            />
          </Card>
        )}
      </Card>
    </div>
  );
}