import React, { useCallback, useEffect, useState } from 'react';
import {
  Card, Upload, Button, Table, Tag, Space, message, Alert, Typography, Modal, Tooltip,
} from 'antd';
import { InboxOutlined, DownloadOutlined, ReloadOutlined, EyeOutlined } from '@ant-design/icons';
import { api } from '../api/client';
import { useAuthStore } from '../store/auth';

const { Dragger } = Upload;

// Job lifecycle:
//   PENDING → PARSING → READY → CONFIRMED  (the "confirm" button only
//   shows up while status is READY; CONFIRMED means rows have been written
//   as DRAFT questions).
const STATUS_COLOR: Record<string, string> = {
  PENDING: 'default',
  PARSING: 'processing',
  READY: 'processing',
  CONFIRMED: 'success',
  FAILED: 'error',
};

export default function ImportPage() {
  const hasPerm = useAuthStore((s) => s.hasPerm);
  const [job, setJob] = useState<any>(null);              // currently selected job detail
  const [history, setHistory] = useState<any[]>([]);      // recent jobs (for the table)
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize] = useState(20);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchJob = useCallback(async (id: number) => {
    const r = await api.get(`/admin/import-jobs/${id}`);
    setJob(r.data);
  }, []);

  const fetchHistory = useCallback(async (page: number) => {
    setLoadingHistory(true);
    try {
      const r = await api.get('/admin/import-jobs', {
        params: { page, page_size: historyPageSize },
      });
      setHistory(r.data.items || []);
      setHistoryTotal(r.data.total || 0);
    } finally {
      setLoadingHistory(false);
    }
  }, [historyPageSize]);

  useEffect(() => {
    fetchHistory(historyPage);
  }, [fetchHistory, historyPage]);

  const uploadProps = {
    name: 'file',
    accept: '.xlsx,.xls',
    showUploadList: false,
    beforeUpload: async (file: File) => {
      setUploading(true);
      try {
        const form = new FormData();
        form.append('file', file);
        const r = await api.post('/admin/import-jobs', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        message.success(`已创建导入任务 #${r.data.id}`);
        await fetchJob(r.data.id);
        // Always refresh page 1 so the new task shows at the top.
        setHistoryPage(1);
        fetchHistory(1);
      } catch (e: any) {
        const detail = e?.response?.data?.message || e?.message || '上传失败';
        message.error(detail);
      } finally {
        setUploading(false);
      }
      return false;  // we already uploaded via axios; prevent AntD's own POST
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
        await fetchJob(job.id);
        fetchHistory(historyPage);
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
      <Card
        title="Excel 批量导入"
        extra={
          <Space>
            <Button
              size="small"
              icon={<DownloadOutlined />}
              loading={downloading}
              onClick={downloadTemplate}
            >
              下载模板
            </Button>
            <Button
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => fetchHistory(historyPage)}
            >
              刷新历史
            </Button>
          </Space>
        }
      >
        <Dragger {...uploadProps} disabled={!hasPerm('question.import')} style={{ padding: 16 }}>
          <p className="ant-upload-drag-icon"><InboxOutlined /></p>
          <p className="ant-upload-text">点击或将 Excel 文件拖拽到这里上传</p>
          <p className="ant-upload-hint">
            仅支持 .xlsx / .xls。导入任务会先逐行校验，确认后才落库。
          </p>
        </Dragger>

        {job && (
          <Card
            style={{ marginTop: 16 }}
            type="inner"
            title={`任务 #${job.id} - ${job.filename}`}
            extra={
              <Tag color={STATUS_COLOR[job.status] || 'default'}>{job.status}</Tag>
            }
          >
            <Space size="large" wrap>
              <span>总行数：<b>{job.total_rows}</b></span>
              <span>成功：<b style={{ color: '#52c41a' }}>{job.ok_rows}</b></span>
              <span>警告：<b style={{ color: '#faad14' }}>{job.warn_rows}</b></span>
              <span>失败：<b style={{ color: '#f5222d' }}>{job.error_rows}</b></span>
              <span>已确认题数：<b>{job.confirmed_question_count || 0}</b></span>
            </Space>
            {job.status === 'READY' && (
              <div style={{ marginTop: 12 }}>
                <Alert
                  type="info"
                  showIcon
                  message="校验完成，确认后才会真正写入草稿表。可下载错误报告修正后重新上传。"
                />
                <Button
                  type="primary"
                  style={{ marginTop: 12 }}
                  disabled={!hasPerm('question.import') || job.ok_rows === 0}
                  onClick={onConfirm}
                >
                  确认导入 {job.ok_rows} 道
                </Button>
              </div>
            )}
            {job.status === 'CONFIRMED' && (
              <Alert
                style={{ marginTop: 12 }}
                type="success"
                showIcon
                message={`导入完成，共生成 ${job.confirmed_question_count} 道草稿（待审核）`}
              />
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

      <Card
        style={{ marginTop: 16 }}
        title={`历史导入任务（${historyTotal}）`}
      >
        <Table
          rowKey="id"
          size="small"
          loading={loadingHistory}
          dataSource={history}
          pagination={{
            current: historyPage,
            pageSize: historyPageSize,
            total: historyTotal,
            onChange: (p) => setHistoryPage(p),
            showSizeChanger: false,
          }}
          locale={{ emptyText: '暂无导入任务' }}
          columns={[
            { title: 'ID', dataIndex: 'id', width: 60 },
            { title: '文件名', dataIndex: 'filename', ellipsis: true },
            {
              title: '状态', dataIndex: 'status', width: 110,
              render: (v) => <Tag color={STATUS_COLOR[v] || 'default'}>{v}</Tag>,
            },
            { title: '总行', dataIndex: 'total_rows', width: 70 },
            {
              title: '成功', dataIndex: 'ok_rows', width: 70,
              render: (v) => <span style={{ color: '#52c41a' }}>{v}</span>,
            },
            { title: '失败', dataIndex: 'error_rows', width: 70,
              render: (v) => <span style={{ color: '#f5222d' }}>{v}</span> },
            {
              title: '已生成草稿', dataIndex: 'confirmed_question_count', width: 110,
              render: (v) => v || 0,
            },
            {
              title: '上传时间', dataIndex: 'created_at', width: 170,
              render: (v) => v ? v.replace('T', ' ').slice(0, 19) : '-',
            },
            {
              title: '操作', width: 80, fixed: 'right' as const,
              render: (_: any, r: any) => (
                <Tooltip title="查看详情">
                  <Button
                    size="small"
                    type="link"
                    icon={<EyeOutlined />}
                    onClick={() => fetchJob(r.id)}
                  >
                    查看
                  </Button>
                </Tooltip>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
