import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import { api } from '../../api/client';
import { showError } from '../../utils/format';

/**
 * 打卡日历（月视图）—— 数据来源 /check-ins?year=&month=
 * 打卡为「自动」：某天答满每日目标题量即自动视为已打卡，日历仅作展示。
 */

export default function CheckinPage() {
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-based
  const [streak, setStreak] = useState<number | null>(null);
  const [goal, setGoal] = useState<number>(10);
  const [checkedDays, setCheckedDays] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get<any>('/check-ins', { year, month: month + 1 });
      const days: number[] = Array.isArray(r?.days) ? r.days : [];
      setCheckedDays(new Set(days));
      setStreak(typeof r?.streak === 'number' ? r.streak : null);
      if (typeof r?.goal === 'number' && r.goal > 0) setGoal(r.goal);
    } catch (e) {
      showError(e, '加载打卡数据失败');
      setCheckedDays(new Set());
      setStreak(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [year, month]);

  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const lastDate = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: lastDate }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);

  const goPrev = () => {
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else setMonth(month - 1);
  };
  const goNext = () => {
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else setMonth(month + 1);
  };

  return (
    <ScrollView scrollY style={{ background: 'var(--bg-page)', minHeight: '100vh' }}>
      <View style={{ padding: '40rpx 32rpx 24rpx' }}>
        <Text style={{ fontSize: '40rpx', fontWeight: 700, color: 'var(--ink-deep)' }}>打卡日历</Text>
        <Text style={{ display: 'block', marginTop: 8, fontSize: '24rpx', color: 'var(--ink-mid)' }}>
          坚持每一天，进步看得见
        </Text>
      </View>

      {/* 累计卡 */}
      <View style={{
        margin: '0 32rpx 24rpx',
        background: 'linear-gradient(135deg, #10B881 0%, #059669 100%)',
        borderRadius: '24rpx',
        padding: '32rpx',
        color: '#fff',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        boxShadow: '0 8rpx 24rpx rgba(16,185,129,0.25)',
      }}>
        <View>
          <Text style={{ fontSize: '24rpx', opacity: 0.9, display: 'block' }}>已连续打卡</Text>
          <Text style={{ display: 'block', marginTop: 4, fontSize: '64rpx', fontWeight: 700 }}>
            {streak == null ? '—' : streak} 天
          </Text>
        </View>
        <Text style={{ fontSize: '120rpx' }}>🏆</Text>
      </View>

      {/* 月卡 */}
      <View style={{
        margin: '0 32rpx 24rpx',
        background: '#fff',
        borderRadius: '24rpx',
        padding: '32rpx',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <View className="row-between" style={{ marginBottom: 24 }}>
          <Text onClick={goPrev} style={{ color: 'var(--brand)', fontSize: '36rpx', padding: '0 16rpx' }}>‹</Text>
          <Text style={{ fontSize: '32rpx', fontWeight: 700, color: 'var(--ink-deep)' }}>
            {year} 年 {month + 1} 月
          </Text>
          <Text onClick={goNext} style={{ color: 'var(--brand)', fontSize: '36rpx', padding: '0 16rpx' }}>›</Text>
        </View>

        <View style={{ display: 'flex', marginBottom: 16 }}>
          {['日','一','二','三','四','五','六'].map((w, i) => (
            <View key={i} style={{ flex: 1, textAlign: 'center' }}>
              <Text style={{ fontSize: '22rpx', color: 'var(--ink-mid)' }}>{w}</Text>
            </View>
          ))}
        </View>

        <View style={{ display: 'flex', flexWrap: 'wrap' }}>
          {blanks.map((b) => (
            <View key={`b-${b}`} style={{ width: '14.285%', height: '88rpx' }} />
          ))}
          {days.map((d) => {
            const checked = checkedDays.has(d);
            const isToday = year === today.getFullYear() && month === today.getMonth() && d === today.getDate();
            return (
              <View
                key={d}
                style={{
                  width: '14.285%',
                  height: '88rpx',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 8,
                }}
              >
                <View style={{
                  width: '64rpx', height: '64rpx', borderRadius: '999rpx',
                  background: checked ? 'var(--brand)' : 'var(--bg-soft)',
                  color: checked ? '#fff' : 'var(--ink-mid)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '24rpx', fontWeight: checked ? 600 : 400,
                  border: isToday ? '2rpx solid var(--orange)' : 'none',
                }}>
                  {d}
                </View>
              </View>
            );
          })}
        </View>
      </View>

      <View style={{ margin: '0 32rpx 80rpx' }}>
        <Text style={{ display: 'block', fontSize: '24rpx', color: 'var(--ink-mid)', textAlign: 'center' }}>
          {loading ? '加载中…' : `每日答满 ${goal} 题自动打卡`}
        </Text>
      </View>
    </ScrollView>
  );
}
