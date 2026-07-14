import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { api } from '../../api/client';
import { showError } from '../../utils/format';
import Illustration from '../../components/Illustration';

/**
 * 每日一练 —— 数据来源 /practice-sessions/daily-task
 * - has_task=true：显示题数 + 继续练习按钮
 * - has_task=false：显示空态（今日暂无每日一练）
 * - 请求中：loading 状态
 */

export default function DailyPage() {
  const [today] = useState(new Date());
  const [dailyTask, setDailyTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.get<any>('/practice-sessions/daily-task')
      .then((r) => {
        setDailyTask(r);
      })
      .catch((e) => {
        setError(e?.message || '加载失败');
        setDailyTask({ has_task: false });
      })
      .finally(() => setLoading(false));
  }, []);

  const goStart = async () => {
    if (!dailyTask?.has_task) {
      Taro.showToast({ title: '今日暂无每日一练', icon: 'none' });
      return;
    }
    try {
      // 后端 DAILY 模式会自己从今日配置读 exam_id / subject_id / count，
      // 这里仍显式带上，方便将来用户主动选考试/科目时也能工作。
      const body: any = { mode: 'DAILY', count: dailyTask.count || 10 };
      if (dailyTask.exam_id)    body.exam_id = dailyTask.exam_id;
      if (dailyTask.subject_id) body.subject_id = dailyTask.subject_id;
      const s = await api.post<any>('/practice-sessions', body);
      Taro.navigateTo({ url: `/pages/practice/session?id=${s.id}` });
    } catch (e) { showError(e, '创建失败'); }
  };

  const weekDay = `星期${'日一二三四五六'[today.getDay()]}`;
  const dateLabel = `${today.getMonth() + 1}月${today.getDate()}日`;

  // Loading state
  if (loading) {
    return (
      <View style={{ background: 'var(--bg-page)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: 'var(--ink-mid)', fontSize: '28rpx' }}>加载中…</Text>
      </View>
    );
  }

  const hasTask = !!dailyTask?.has_task;

  return (
    <ScrollView scrollY style={{ background: 'var(--bg-page)', minHeight: '100vh' }}>
      <View style={{ padding: '40rpx 32rpx 24rpx' }}>
        <View className="row-between">
          <Text style={{ fontSize: '40rpx', fontWeight: 700, color: 'var(--ink-deep)' }}>每日一练</Text>
          <Text style={{ color: 'var(--brand)', fontSize: '26rpx', fontWeight: 500 }}>📅 {dateLabel}</Text>
        </View>
      </View>

      {/* 大插画 + slogan —— 加上今日科目 */}
      <View style={{
        margin: '0 32rpx 24rpx',
        background: 'linear-gradient(135deg, #EFF6FF 0%, #F0F9FF 100%)',
        borderRadius: '24rpx',
        padding: '40rpx 32rpx',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <Text style={{ color: 'var(--brand)', fontSize: '28rpx', fontWeight: 600 }}>
          {weekDay}
        </Text>
        <View style={{ marginTop: 24 }}>
          <Illustration kind="calendar" size={240} />
        </View>
        <Text style={{ marginTop: 16, fontSize: '36rpx', fontWeight: 700, color: 'var(--ink-deep)' }}>
          每日进步一点点
        </Text>
        {hasTask && dailyTask?.subject_name && (
          <View style={{
            marginTop: 16, background: 'rgba(37,99,235,0.08)',
            padding: '8rpx 24rpx', borderRadius: '999rpx',
          }}>
            <Text style={{ fontSize: '24rpx', color: 'var(--brand)', fontWeight: 600 }}>
              今日科目：{dailyTask.subject_name}
              {dailyTask?.exam_name ? ` · ${dailyTask.exam_name}` : ''}
            </Text>
          </View>
        )}
        <Text style={{ marginTop: 12, fontSize: '24rpx', color: 'var(--ink-mid)' }}>
          坚持练习，稳定进步
        </Text>
      </View>

      {/* 数据三列 —— has_task=true 时显示，否则隐藏整张卡 */}
      {hasTask ? (
        <View style={{
          margin: '0 32rpx 24rpx',
          background: '#fff',
          borderRadius: '24rpx',
          padding: '32rpx 0',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
        }}>
          {[
            { v: dailyTask?.count ?? '—', l: '今日题目' },
            { v: dailyTask?.completed_count ?? '—', l: '已完成' },
            { v: dailyTask?.accuracy != null ? `${dailyTask.accuracy}%` : '—', l: '正确率' },
          ].map((s, i) => (
            <View key={i} style={{ flex: 1, textAlign: 'center' }}>
              <Text style={{ fontSize: '48rpx', fontWeight: 700, color: 'var(--brand)' }}>{s.v}</Text>
              <Text style={{ display: 'block', fontSize: '24rpx', color: 'var(--ink-mid)', marginTop: 8 }}>{s.l}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={{
          margin: '0 32rpx 24rpx',
          background: '#fff',
          borderRadius: '24rpx',
          padding: '80rpx 32rpx',
          textAlign: 'center',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <Text style={{ fontSize: '28rpx', color: 'var(--ink-deep)', fontWeight: 600 }}>
            今日暂无每日一练
          </Text>
          <Text style={{ display: 'block', marginTop: 12, fontSize: '24rpx', color: 'var(--ink-mid)' }}>
            {error ? `（${error}）` : '请等待运营发布今日练习题组'}
          </Text>
        </View>
      )}

      {/* 主按钮：has_task=true 可点；否则禁用 */}
      <View
        className={hasTask ? 'btn-primary' : 'btn-primary'}
        style={{
          margin: '0 32rpx 16rpx',
          opacity: hasTask ? 1 : 0.4,
        }}
        onClick={goStart}
      >
        {hasTask ? '开始练习' : '暂无可练习题组'}
      </View>
      <View className="btn-text" style={{ margin: '0 32rpx 80rpx' }}
        onClick={() => Taro.navigateTo({ url: '/pages/wrong/index' })}>
        查看错题本 ›
      </View>
    </ScrollView>
  );
}
