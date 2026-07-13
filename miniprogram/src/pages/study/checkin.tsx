import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import { View as TView } from '@tarojs/components';

/**
 * 打卡日历（月视图）—— mock 全成。后端补 check-in 接口后可接。
 * 渲染：<年 月> 标题、星期表头、日期格子（已打卡为蓝色实心气泡）
 */

const CHECKED_DAYS = new Set<number>([2, 3, 5, 7, 8, 9, 12, 15, 16, 20, 22, 25, 27, 28]);

export default function CheckinPage() {
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-based
  const [streak, setStreak] = useState(23);

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
          <Text style={{ display: 'block', marginTop: 4, fontSize: '64rpx', fontWeight: 700 }}>{streak} 天</Text>
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
            const checked = CHECKED_DAYS.has(d);
            const isToday = year === today.getFullYear() && month === today.getMonth() && d === today.getDate();
            return (
              <View
                key={d}
                onClick={() => setStreak(streak + (checked ? 0 : 1))}
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
          点击未打卡日期可补打卡（mock）
        </Text>
      </View>
    </ScrollView>
  );
}
