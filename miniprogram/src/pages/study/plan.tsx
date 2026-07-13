import React, { useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';

/**
 * 学习计划页 —— 全 mock。后端补 study-plan 接口后再接。
 */

const PHASES = [
  { range: '2024.01 ~ 03', title: '基础阶段', desc: '高数线代概率基础知识点', done: true },
  { range: '2024.04 ~ 06', title: '强化阶段', desc: '刷题巩固，提升正确率',     done: false },
  { range: '2024.07 ~ 09', title: '真题阶段', desc: '历年真题 + 模拟考',         done: false },
  { range: '2024.10 ~ 12', title: '冲刺阶段', desc: '查缺补漏，考前冲刺',        done: false },
];

const SUBJECTS = [
  { name: '高等数学', progress: 78, color: '#2563EB' },
  { name: '线性代数', progress: 62, color: '#F8A800' },
  { name: '概率论',   progress: 45, color: '#10B881' },
  { name: '英语',    progress: 88, color: '#EF4444' },
];

export default function StudyPlanPage() {
  const [tab, setTab] = useState<'phase' | 'subject'>('phase');

  return (
    <View style={{ background: 'var(--bg-page)', minHeight: '100vh', padding: '40rpx 32rpx 80rpx' }}>
      <View style={{ marginBottom: 24 }}>
        <View className="row-between">
          <Text style={{ fontSize: '36rpx', fontWeight: 700, color: 'var(--ink-deep)' }}>考研数学计划</Text>
          <Text
            style={{ color: 'var(--brand)', fontSize: '26rpx', fontWeight: 500 }}
            onClick={() => Taro.showToast({ title: '编辑计划 TODO 接后端', icon: 'none' })}
          >编辑</Text>
        </View>
        <Text style={{ display: 'block', marginTop: 8, fontSize: '24rpx', color: 'var(--ink-mid)' }}>
          2024.01.01 ~ 2024.12.31 · 共 365 天
        </Text>
      </View>

      {/* 当前阶段 */}
      <View style={{
        background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
        borderRadius: '24rpx',
        padding: '32rpx',
        color: '#fff',
        marginBottom: 24,
        boxShadow: '0 8rpx 24rpx rgba(37,99,235,0.25)',
      }}>
        <Text style={{ fontSize: '28rpx', fontWeight: 600, opacity: 0.9 }}>当前阶段</Text>
        <Text style={{ display: 'block', fontSize: '40rpx', fontWeight: 700, marginTop: 8 }}>强化阶段</Text>
        <View className="row-between" style={{ marginTop: 16 }}>
          <Text style={{ fontSize: '24rpx', opacity: 0.85 }}>已完成 78% · 距考研还有 195 天</Text>
        </View>
      </View>

      {/* 切换 */}
      <View style={{ display: 'flex', background: 'var(--bg-soft)', borderRadius: '999rpx', padding: 8, marginBottom: 24 }}>
        {[
          { v: 'phase',   l: '分阶段' },
          { v: 'subject', l: '分学科' },
        ].map((t) => (
          <View
            key={t.v}
            onClick={() => setTab(t.v as any)}
            style={{
              flex: 1,
              textAlign: 'center',
              padding: '12rpx 0',
              borderRadius: '999rpx',
              background: tab === t.v ? '#fff' : 'transparent',
              color: tab === t.v ? 'var(--brand)' : 'var(--ink-mid)',
              fontSize: '26rpx',
              fontWeight: 600,
              boxShadow: tab === t.v ? 'var(--shadow-sm)' : 'none',
            }}
          >{t.l}</View>
        ))}
      </View>

      {tab === 'phase' ? (
        PHASES.map((p, i) => (
          <View
            key={i}
            style={{
              background: '#fff',
              borderRadius: '24rpx',
              padding: '28rpx 32rpx',
              marginBottom: 16,
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <View className="row-between">
              <View>
                <Text style={{ fontSize: '28rpx', fontWeight: 600, color: 'var(--ink-deep)', display: 'block' }}>
                  {p.title}
                </Text>
                <Text style={{ display: 'block', fontSize: '22rpx', color: 'var(--ink-mid)', marginTop: 6 }}>
                  {p.range} · {p.desc}
                </Text>
              </View>
              <View
                className={p.done ? 'tag tag-mastered' : 'tag tag-doing'}
              >
                {p.done ? '已完成' : '进行中'}
              </View>
            </View>
          </View>
        ))
      ) : (
        SUBJECTS.map((s, i) => (
          <View
            key={i}
            style={{
              background: '#fff',
              borderRadius: '24rpx',
              padding: '28rpx 32rpx',
              marginBottom: 16,
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <View className="row-between" style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: '28rpx', fontWeight: 600, color: 'var(--ink-deep)' }}>{s.name}</Text>
              <Text style={{ fontSize: '24rpx', color: 'var(--ink-mid)' }}>
                <Text style={{ color: s.color, fontWeight: 700, fontSize: '32rpx' }}>{s.progress}</Text>%
              </Text>
            </View>
            <View style={{
              width: '100%', height: '12rpx', background: 'var(--bg-soft)',
              borderRadius: '999rpx', overflow: 'hidden',
            }}>
              <View style={{ width: `${s.progress}%`, height: '100%', background: s.color, borderRadius: '999rpx' }} />
            </View>
          </View>
        ))
      )}
    </View>
  );
}
