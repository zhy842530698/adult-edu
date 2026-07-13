import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { api } from '../../api/client';
import { showError } from '../../utils/format';
import Icon from '../../components/Icon';

export default function ProgressPage() {
  const [summary, setSummary] = useState<any>(null);
  const [targets, setTargets] = useState<any[]>([]);

  const load = async () => {
    try {
      const [a, b] = await Promise.all([
        api.get<any>('/progress/summary'),
        api.get<any>('/user/exam-targets'),
      ]);
      setSummary(a);
      setTargets(b.items || []);
    } catch (e) { showError(e); }
  };
  useEffect(() => { load(); }, []);

  return (
    <View style={{ background: 'var(--bg-page)', minHeight: '100vh' }}>
      <View style={{ padding: '40rpx 32rpx 16rpx' }}>
        <Text style={{ fontSize: '40rpx', fontWeight: 700, color: 'var(--ink-deep)' }}>学习总览</Text>
      </View>

      <ScrollView scrollY style={{ padding: '0 32rpx 120rpx' }}>
        <View className="card">
          <Text style={{ fontSize: '28rpx', fontWeight: 600, color: 'var(--ink-deep)' }}>总体进度</Text>
          <View style={{ marginTop: 24, display: 'flex' }}>
            {[
              { v: summary?.total_sessions || 0, l: '总会话', icon: 'practice' as const, color: 'var(--brand)' },
              { v: summary?.last7_answer_count || 0, l: '7天答题', icon: 'notes' as const, color: 'var(--orange)' },
              { v: summary?.streak_days || 0, l: '连续天数', icon: 'medal' as const, color: 'var(--green)' },
            ].map((s, i) => (
              <View key={i} style={{ flex: 1, textAlign: 'center' }}>
                <View style={{
                  width: '80rpx', height: '80rpx',
                  borderRadius: '999rpx',
                  background: `${s.color}1A`,
                  margin: '0 auto 12rpx',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name={s.icon} size={42} color={s.color} />
                </View>
                <Text style={{ fontSize: '36rpx', fontWeight: 700, color: 'var(--ink-deep)' }}>{s.v}</Text>
                <Text style={{ display: 'block', fontSize: '22rpx', color: 'var(--ink-mid)', marginTop: 6 }}>{s.l}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className="card">
          <Text style={{ fontSize: '28rpx', fontWeight: 600, color: 'var(--ink-deep)' }}>我的目标</Text>
          {targets.length === 0 && (
            <Text style={{ display: 'block', marginTop: 16, color: 'var(--ink-mid)' }}>未设置目标</Text>
          )}
          {targets.map((t) => (
            <View key={t.id} className="row-between" style={{ marginTop: 16, paddingTop: 16, borderTop: '1rpx solid var(--line)' }}>
              <View>
                <Text style={{ fontSize: '28rpx', fontWeight: 500, color: 'var(--ink-deep)' }}>
                  {t.exam_name}
                  {t.is_primary && <Text className="tag tag-doing" style={{ marginLeft: 12 }}>主目标</Text>}
                </Text>
                {t.target_exam_date && (
                  <Text style={{ display: 'block', fontSize: '22rpx', color: 'var(--ink-mid)', marginTop: 6 }}>
                    目标日期：{t.target_exam_date}
                  </Text>
                )}
              </View>
              <Text style={{ fontSize: '24rpx', color: 'var(--ink-mid)' }}>每日 {t.daily_question_goal} 题</Text>
            </View>
          ))}
          <View className="btn-ghost" style={{ marginTop: 24 }}
            onClick={() => Taro.navigateTo({ url: '/pages/onboarding/index' })}>
            修改目标
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
