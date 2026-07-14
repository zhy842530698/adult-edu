import React, { useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { api } from '../../api/client';
import { getTargets } from '../../store/auth';
import { showError } from '../../utils/format';
import Icon from '../../components/Icon';
import Illustration from '../../components/Illustration';
import ProgressBar from '../../components/ProgressBar';

const PRIMARY_MODES = [
  { key: 'SEQUENTIAL', label: '顺序练习', bg: 'var(--brand-soft)',   color: '#2563EB' },
  { key: 'RANDOM',     label: '随机练习', bg: 'var(--orange-soft)', color: '#F8A800' },
  { key: 'MOCK',       label: '模拟考试', bg: 'var(--green-soft)',  color: '#10B881' },
] as const;

const QUICK = [
  { key: 'SEQUENTIAL', label: '顺序练习', icon: 'practice' as const, bg: '#EFF6FF', color: '#2563EB' },
  { key: 'MOCK',       label: '模拟考试', icon: 'mock'      as const, bg: '#FFF7ED', color: '#F8A800' },
  { key: 'WRONG',      label: '错题本',   icon: 'wrong'     as const, bg: '#FEF2F2', color: '#EF4444' },
  { key: 'FAVORITE',   label: '收藏夹',   icon: 'favorite'  as const, bg: '#FEF9C3', color: '#F59E0B' },
];

export default function HomePage() {
  const [targets, setTargets] = useState<any[]>([]);
  const [dailyTask, setDailyTask] = useState<any>(null);
  const [progress, setProgress] = useState<any>(null);

  const load = async () => {
    try {
      const [t, dt] = await Promise.all([
        api.get<any>('/user/exam-targets'),
        api.get<any>('/practice-sessions/daily-task').catch(() => null),
      ]);
      setTargets(t.items || []);
      setDailyTask(dt);
    } catch (e) { showError(e, '加载失败'); }
    try {
      const r = await api.get<any>('/progress/summary');
      setProgress(r);
    } catch {}
  };

  useDidShow(() => { load(); });
  // 首次挂载时初始化（useDidShow 可能在第一次不触发）
  React.useEffect(() => { setTargets(getTargets() || []); }, []);

  const primary = targets.find((t) => t.is_primary) || targets[0];

  const goSession = async (body: any) => {
    try {
      const s = await api.post<any>('/practice-sessions', body);
      Taro.navigateTo({ url: `/pages/practice/session?id=${s.id}` });
    } catch (e) {
      showError(e, '创建会话失败');
    }
  };

  const goQuick = (key: string) => {
    if (key === 'WRONG')   return Taro.navigateTo({ url: '/pages/wrong/index' });
    if (key === 'FAVORITE') return Taro.navigateTo({ url: '/pages/favorite/index' });
    return goSession({ mode: key, count: key === 'MOCK' ? 20 : 10, exam_id: primary?.exam_id });
  };

  const startDaily = () => {
    if (!dailyTask?.has_task) {
      Taro.showToast({ title: '今日暂无每日一练', icon: 'none' });
      return;
    }
    goSession({
      mode: 'DAILY',
      count: dailyTask.count,
      exam_id: dailyTask.exam_id,
      subject_id: dailyTask.subject_id,
    });
  };

  const totalAnswered = progress?.total_answered ?? 0;
  const streak = progress?.streak_days || 0;

  return (
    <ScrollView scrollY style={{ background: 'var(--bg-page)' }}>
      {/* 顶部品牌区 */}
      <View style={{ padding: '40rpx 32rpx 8rpx' }}>
        <Text style={{ fontSize: '40rpx', fontWeight: 700, color: 'var(--ink-deep)' }}>刷题本</Text>
        <View style={{ marginTop: 8 }}>
          <Text style={{ fontSize: '28rpx', color: 'var(--ink-mid)' }}>
            今日也要努力刷题呀 💪
          </Text>
        </View>
        <Text style={{ fontSize: '24rpx', color: 'var(--ink-soft)', marginTop: 4 }}>
          坚持的每一步，都是进步
        </Text>
      </View>

      {/* 搜索条 */}
      <View
        style={{
          margin: '24rpx 32rpx',
          background: '#fff',
          borderRadius: '999rpx',
          padding: '20rpx 32rpx',
          display: 'flex',
          alignItems: 'center',
          boxShadow: 'var(--shadow-sm)',
        }}
        onClick={() => Taro.navigateTo({ url: '/pages/catalog/index' })}
      >
        <Icon name="search" size={28} color="var(--ink-mid)" />
        <Text style={{ marginLeft: 16, color: 'var(--ink-mid)', fontSize: '26rpx' }}>
          搜索题目、知识点
        </Text>
      </View>

      {/* 每日打卡 渐变卡 */}
      <View style={{ margin: '24rpx 32rpx' }}>
        <View style={{
          background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
          borderRadius: '24rpx',
          padding: '32rpx',
          display: 'flex',
          alignItems: 'center',
          color: '#fff',
          boxShadow: '0 8rpx 24rpx rgba(37,99,235,0.25)',
        }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontSize: '32rpx', fontWeight: 600 }}>每日打卡</Text>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: '24rpx', marginTop: 8 }}>
              {streak > 0 ? `已坚持 ${streak} 天` : '今日打卡，开启连续记录'}
            </Text>
            <View style={{
              marginTop: 16,
              background: '#fff',
              color: 'var(--brand)',
              borderRadius: '999rpx',
              padding: '8rpx 24rpx',
              fontSize: '24rpx',
              fontWeight: 600,
              display: 'inline-block',
            }}>打卡</View>
          </View>
          <Illustration kind="gift" size={160} />
        </View>
      </View>

      {/* 4 列图标宫格 */}
      <View style={{
        margin: '0 32rpx 24rpx',
        background: '#fff',
        borderRadius: '24rpx',
        padding: '24rpx 0',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <View className="grid-icons">
          {QUICK.map((q) => (
            <View key={q.key} className="grid-icon-cell" onClick={() => goQuick(q.key)}>
              <View
                className="grid-icon-box"
                style={{ background: q.bg, color: q.color }}
              >
                <Icon name={q.icon} size={42} color={q.color} />
              </View>
              <Text style={{ marginTop: 12, fontSize: '24rpx', color: 'var(--ink-deep)' }}>
                {q.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* 学习数据 4 列 */}
      <View style={{
        margin: '0 32rpx 24rpx',
        background: '#fff',
        borderRadius: '24rpx',
        padding: '32rpx',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <View className="row-between" style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: '30rpx', fontWeight: 600, color: 'var(--ink-deep)' }}>学习数据</Text>
          <Text style={{ fontSize: '22rpx', color: 'var(--ink-mid)' }}>查看全部 ›</Text>
        </View>
        <View style={{ display: 'flex' }}>
          {[
            // 总题数：题库在该主目标考试下"已发布"的题数（固定值），不是已答去重数
            { v: progress?.pool_size != null ? `${progress.pool_size}` : '—', l: '总题数' },
            { v: progress?.accuracy != null ? `${progress.accuracy}%` : '—',             l: '正确率' },
            { v: progress?.last7_answer_count != null ? `${progress.last7_answer_count}` : '—', l: '7天答题' },
            { v: progress?.study_minutes != null ? `${Math.round(progress.study_minutes / 60)}h` : '—', l: '学习时长' },
          ].map((s, i) => (
            <View key={i} style={{ flex: 1, textAlign: 'center' }}>
              <Text style={{ fontSize: '34rpx', fontWeight: 700, color: 'var(--ink-deep)' }}>{s.v}</Text>
              <Text style={{ fontSize: '22rpx', color: 'var(--ink-mid)', marginTop: 6, display: 'block' }}>{s.l}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 继续练习 */}
      {primary && (() => {
        // 复用后端"未交卷"逻辑：若上次就是 SEQUENTIAL 且未交卷，按钮文案从"开始新的"切到"继续"。
        const ls = progress?.last_session;
        const canResume = !!ls
          && ls.mode === 'SEQUENTIAL'
          && ls.exam_id === primary.exam_id
          && ls.status !== 'SUBMITTED';
        return (
        <View style={{
          margin: '0 32rpx 32rpx',
          background: '#fff',
          borderRadius: '24rpx',
          padding: '28rpx 32rpx',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <View className="row-between">
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={{ fontSize: '24rpx', color: 'var(--ink-mid)' }}>
                {canResume ? '继续上次练习' : '继续练习'}
              </Text>
              <Text style={{ fontSize: '28rpx', fontWeight: 600, color: 'var(--ink-deep)', marginTop: 4, display: 'block' }}>
                {primary?.exam_name || '请先设置目标考试'}
              </Text>
              <Text style={{ fontSize: '22rpx', color: 'var(--ink-soft)', marginTop: 4, display: 'block' }}>
                {!ls
                  ? '开始今日练习'
                  : canResume && ls.last_sequence_no
                    ? `上次做到第 ${ls.last_sequence_no} / ${ls.total_questions || '?'} 题`
                    : ls.chapter_name
                      ? `上次：${ls.chapter_name}`
                      : `上次：${ls.mode} · ${ls.status === 'SUBMITTED' ? '已完成' : '进行中'}`}
              </Text>
            </View>
            <View
              style={{
                background: 'var(--brand-soft)',
                color: 'var(--brand)',
                padding: '12rpx 24rpx',
                borderRadius: '999rpx',
                fontSize: '24rpx',
                fontWeight: 600,
                flexShrink: 0,
              }}
              onClick={() => goSession({ mode: 'SEQUENTIAL', count: 10, exam_id: primary.exam_id })}
            >{canResume ? '继续' : '继续练习'}</View>
          </View>
          <View style={{ marginTop: 20 }}>
            {/* 题库总进度：已刷（去重） / 题库总数 */}
            <ProgressBar percent={progress?.pool_progress_percent ?? 0} />
            <View className="row-between" style={{ marginTop: 8 }}>
              <Text style={{ fontSize: '22rpx', color: 'var(--ink-soft)' }}>
                已刷 {progress?.total_answered ?? 0} / {progress?.pool_size ?? '—'} 题
              </Text>
              <Text style={{ fontSize: '22rpx', color: 'var(--brand)', fontWeight: 600 }}>
                {progress?.pool_progress_percent ?? 0}%
              </Text>
            </View>
          </View>
        </View>
        );
      })()}
          <View style={{ marginTop: 20 }}>
            <ProgressBar percent={progress?.progress_percent ?? 0} />
            <View className="row-between" style={{ marginTop: 8 }}>
              <Text style={{ fontSize: '22rpx', color: 'var(--ink-soft)' }}>
                今日已完成 {progress?.today_count ?? 0} / {primary?.daily_question_goal ?? '—'} 题
              </Text>
              <Text style={{ fontSize: '22rpx', color: 'var(--brand)', fontWeight: 600 }}>
                {progress?.progress_percent ?? 0}%
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* 无目标时给入口 */}
      {!primary && (
        <View
          className="btn-primary"
          style={{ margin: '0 32rpx 32rpx' }}
          onClick={() => Taro.navigateTo({ url: '/pages/onboarding/index' })}
        >
          设置目标考试
        </View>
      )}
    </ScrollView>
  );
}
