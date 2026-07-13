import React, { useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import Illustration from '../../components/Illustration';
import Icon from '../../components/Icon';
import ProgressBar from '../../components/ProgressBar';

/**
 * 练习 Tab 聚合页 —— 原型 §"学习计划"截图
 * - 顶部 考研数学计划 卡（mock）
 * - 今日任务 checklist（mock）
 * - 本周进度 2 列
 * - 4 个二级入口：每日一练 / 错题本 / 我的笔记 / 打卡日历
 */

const TODOS = [
  { text: '高等数学 1.3 函数的极限', done: true },
  { text: '线性代数 2.1 矩阵的运算',  done: true },
  { text: '概率论 1.1 随机事件',      done: false },
  { text: '每日一练 10 题',            done: false },
];

const ENTRIES = [
  { key: 'daily',  label: '每日一练', desc: '每天 10 题，坚持进步', icon: 'calendar' as const, color: '#2563EB', bg: 'var(--brand-soft)' },
  { key: 'wrong',  label: '错题本',   desc: '回顾错题，避免再错',   icon: 'wrong'    as const, color: '#EF4444', bg: '#FEF2F2' },
  { key: 'notes',  label: '我的笔记', desc: '随手记录重点',         icon: 'notes'    as const, color: '#F8A800', bg: 'var(--orange-soft)' },
  { key: 'checkin',label: '打卡日历', desc: '每天打卡，看得见的坚持', icon: 'trophy'  as const, color: '#10B881', bg: 'var(--green-soft)' },
];

const PATHS: Record<string, string> = {
  daily:   '/pages/study/daily',
  wrong:   '/pages/wrong/index',
  notes:   '/pages/learn/notes',
  checkin: '/pages/study/checkin',
};

export default function PracticeIndexPage() {
  const [todos] = useState(TODOS);

  useDidShow(() => { /* 拉取真实数据时再实现 */ });

  const finished = todos.filter((t) => t.done).length;

  return (
    <ScrollView scrollY style={{ background: 'var(--bg-page)', minHeight: '100vh' }}>
      <View style={{ padding: '40rpx 32rpx 16rpx' }}>
        <Text style={{ fontSize: '32rpx', color: 'var(--ink-mid)' }}>学习计划</Text>
      </View>

      {/* 计划卡 */}
      <View style={{
        margin: '0 32rpx 24rpx',
        background: '#fff',
        borderRadius: '24rpx',
        padding: '32rpx',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <View className="row-between">
          <View>
            <Text style={{ fontSize: '34rpx', fontWeight: 700, color: 'var(--ink-deep)' }}>考研数学计划</Text>
            <Text style={{ display: 'block', marginTop: 8, fontSize: '24rpx', color: 'var(--ink-mid)' }}>
              2024.01.01 ~ 2024.12.31
            </Text>
          </View>
          <Text style={{ color: 'var(--brand)', fontSize: '26rpx', fontWeight: 500 }}>编辑计划</Text>
        </View>
      </View>

      {/* 今日任务 */}
      <View style={{
        margin: '0 32rpx 24rpx',
        background: '#fff',
        borderRadius: '24rpx',
        padding: '32rpx',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <View className="row-between" style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: '28rpx', fontWeight: 600, color: 'var(--ink-deep)' }}>今日任务</Text>
          <Text style={{ fontSize: '24rpx', color: 'var(--ink-mid)' }}>已完成 {finished}/{todos.length}</Text>
        </View>
        {todos.map((t, i) => (
          <View key={i} className="row" style={{ marginBottom: 16 }}>
            <View style={{
              width: '36rpx', height: '36rpx', borderRadius: '999rpx',
              border: t.done ? '2rpx solid var(--brand)' : '2rpx solid var(--line)',
              background: t.done ? 'var(--brand)' : '#fff',
              color: '#fff', textAlign: 'center', lineHeight: '32rpx',
              fontSize: '22rpx', marginRight: 16,
              flexShrink: 0,
            }}>
              {t.done ? '✓' : ''}
            </View>
            <Text style={{
              fontSize: '28rpx',
              color: t.done ? 'var(--ink-mid)' : 'var(--ink-deep)',
              textDecoration: t.done ? 'line-through' : 'none',
            }}>{t.text}</Text>
          </View>
        ))}
      </View>

      {/* 本周进度 */}
      <View style={{
        margin: '0 32rpx 24rpx',
        background: '#fff',
        borderRadius: '24rpx',
        padding: '32rpx',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <Text style={{ fontSize: '28rpx', fontWeight: 600, color: 'var(--ink-deep)', marginBottom: 20, display: 'block' }}>
          本周进度
        </Text>
        <View className="row-between" style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: '24rpx', color: 'var(--ink-mid)' }}>学习时长</Text>
          <Text style={{ fontSize: '22rpx', color: 'var(--ink-mid)' }}>
            <Text style={{ color: 'var(--ink-deep)', fontWeight: 700, fontSize: '28rpx' }}>6.5</Text> / 10 小时
          </Text>
        </View>
        <ProgressBar percent={65} />
        <View style={{ height: 24 }} />
        <View className="row-between" style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: '24rpx', color: 'var(--ink-mid)' }}>做题量</Text>
          <Text style={{ fontSize: '22rpx', color: 'var(--ink-mid)' }}>
            <Text style={{ color: 'var(--ink-deep)', fontWeight: 700, fontSize: '28rpx' }}>320</Text> / 500 题
          </Text>
        </View>
        <ProgressBar percent={64} color="linear-gradient(90deg, var(--orange) 0%, #FB923C 100%)" />
      </View>

      {/* 4 个二级入口 */}
      <View style={{
        margin: '0 32rpx 80rpx',
        background: '#fff',
        borderRadius: '24rpx',
        padding: '0 32rpx',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
      }}>
        {ENTRIES.map((e, i) => (
          <View
            key={e.key}
            onClick={() => Taro.navigateTo({ url: PATHS[e.key] })}
            className="row"
            style={{
              padding: '32rpx 0',
              borderBottom: i < ENTRIES.length - 1 ? '1rpx solid var(--line)' : 'none',
            }}
          >
            <View style={{
              width: '72rpx', height: '72rpx',
              borderRadius: '20rpx',
              background: e.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginRight: 24,
            }}>
              <Icon name={e.icon} size={40} color={e.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: '28rpx', fontWeight: 600, color: 'var(--ink-deep)' }}>{e.label}</Text>
              <Text style={{ display: 'block', fontSize: '22rpx', color: 'var(--ink-mid)', marginTop: 6 }}>{e.desc}</Text>
            </View>
            <Text style={{ fontSize: '40rpx', color: 'var(--ink-soft)' }}>›</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
