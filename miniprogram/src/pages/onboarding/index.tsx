import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { api } from '../../api/client';
import { loadTargets, setDailyTarget, setPrimaryExam } from '../../store/auth';
import { showError } from '../../utils/format';
import Illustration from '../../components/Illustration';

const COLORS = ['#2563EB', '#F8A800', '#10B881', '#EF4444', '#A78BFA', '#06B6D4'];

export default function OnboardingPage() {
  const [exams, setExams] = useState<any[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [daily, setDaily] = useState(20);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<any>('/exam-catalog')
      .then((r) => setExams((r.items || []).flatMap((c: any) => c.exams || [])))
      .catch((e) => showError(e, '考试列表加载失败'))
      .finally(() => setLoading(false));
  }, []);

  const onSubmit = async () => {
    if (!picked) { Taro.showToast({ title: '请选择主目标考试', icon: 'none' }); return; }
    setSubmitting(true);
    try {
      await setPrimaryExam(picked);
      await setDailyTarget(daily);
      await loadTargets();
      Taro.showToast({ title: '目标设置成功', icon: 'success' });
      setTimeout(() => Taro.switchTab({ url: '/pages/home/index' }), 500);
    } catch (e) {
      showError(e, '保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ background: 'var(--bg-page)', minHeight: '100vh' }}>
      <View style={{ padding: '60rpx 32rpx 32rpx', textAlign: 'center' }}>
        <View style={{ display: 'flex', justifyContent: 'center' }}>
          <Illustration kind="target" size={200} />
        </View>
        <Text style={{ marginTop: 24, display: 'block', fontSize: '40rpx', fontWeight: 700, color: 'var(--ink-deep)' }}>
          选择你的目标
        </Text>
        <Text style={{ marginTop: 8, display: 'block', fontSize: '24rpx', color: 'var(--ink-mid)' }}>
          选择后可在「我的」修改；每日题量仅用于提醒
        </Text>
      </View>

      <View style={{ margin: '0 32rpx 24rpx' }}>
        <Text style={{ fontSize: '28rpx', fontWeight: 600, color: 'var(--ink-deep)', marginBottom: 16, display: 'block' }}>
          考试类型
        </Text>
        <ScrollView scrollY style={{ maxHeight: '520rpx' }}>
          {loading && <Text className="muted">正在加载考试列表…</Text>}
          {!loading && exams.length === 0 && (
            <Text className="muted">暂无考试数据，请先在运营后台创建考试或执行种子数据初始化。</Text>
          )}
          {exams.map((e, i) => {
            const color = COLORS[i % COLORS.length];
            const sel = picked === e.id;
            return (
              <View
                key={e.id}
                onClick={() => setPicked(e.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '28rpx 32rpx',
                  marginBottom: 16,
                  background: '#fff',
                  border: sel ? `2rpx solid var(--brand)` : '2rpx solid var(--line)',
                  borderRadius: '20rpx',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <View style={{
                  width: '64rpx', height: '64rpx',
                  borderRadius: '16rpx',
                  background: `${color}1A`,
                  color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700, fontSize: '32rpx',
                  marginRight: 20,
                }}>
                  {e.name.slice(0, 1)}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: '30rpx', fontWeight: 600, color: 'var(--ink-deep)' }}>{e.name}</Text>
                  {e.subjects && e.subjects.length > 0 && (
                    <Text style={{ display: 'block', fontSize: '22rpx', color: 'var(--ink-mid)', marginTop: 6 }}>
                      {e.subjects.map((s: any) => s.name).join(' / ')}
                    </Text>
                  )}
                </View>
                <View style={{
                  width: '40rpx', height: '40rpx', borderRadius: '999rpx',
                  border: `2rpx solid ${sel ? 'var(--brand)' : 'var(--line)'}`,
                  background: sel ? 'var(--brand)' : '#fff',
                  color: '#fff', textAlign: 'center', lineHeight: '36rpx',
                  fontSize: '24rpx',
                }}>
                  {sel ? '✓' : ''}
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>

      <View style={{
        margin: '0 32rpx 32rpx',
        background: '#fff',
        borderRadius: '24rpx',
        padding: '32rpx',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <Text style={{ fontSize: '28rpx', fontWeight: 600, color: 'var(--ink-deep)', display: 'block' }}>每日目标题量</Text>
        <View className="row" style={{ marginTop: 20, flexWrap: 'wrap', gap: '16rpx' }}>
          {[10, 20, 30, 50].map((n) => (
            <View
              key={n}
              onClick={() => setDaily(n)}
              style={{
                background: daily === n ? 'var(--brand)' : 'var(--brand-soft)',
                color: daily === n ? '#fff' : 'var(--brand)',
                padding: '12rpx 28rpx',
                borderRadius: '999rpx',
                fontSize: '26rpx',
                fontWeight: 600,
                marginRight: 12, marginBottom: 12,
              }}
            >
              {n} 题
            </View>
          ))}
        </View>
      </View>

      <View className="btn-primary" style={{ margin: '0 32rpx 40rpx', opacity: submitting ? 0.6 : 1 }} onClick={onSubmit}>
        {submitting ? '保存中…' : '保存并开始'}
      </View>
    </View>
  );
}
