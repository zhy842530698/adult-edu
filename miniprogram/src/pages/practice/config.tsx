import React, { useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';

const MODES = [
  { value: 'SEQUENTIAL', label: '顺序练习', desc: '按题号顺序作答' },
  { value: 'RANDOM',     label: '随机练习', desc: '题目顺序随机打乱' },
  { value: 'CHAPTER',    label: '章节练习', desc: '选定某个章节专门刷' },
  { value: 'KNOWLEDGE',  label: '知识点专项', desc: '按知识点聚合' },
  { value: 'WRONG',      label: '错题练习', desc: '错题本专项练习' },
  { value: 'FAVORITE',   label: '收藏练习', desc: '收藏题目专项' },
  { value: 'MOCK',       label: '模拟考试', desc: '真实考试场景模拟' },
];

export default function PracticeConfigPage() {
  const [mode, setMode] = useState('SEQUENTIAL');
  const [count, setCount] = useState(10);
  const [immediate, setImmediate] = useState(true);

  const onStart = () => {
    Taro.setStorageSync('practice-config', { mode, count, immediate });
    Taro.navigateBack();
  };

  return (
    <View style={{ background: 'var(--bg-page)', minHeight: '100vh', padding: '32rpx' }}>
      <View style={{
        background: '#fff',
        borderRadius: '24rpx',
        padding: '32rpx',
        marginBottom: '24rpx',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <Text style={{ fontSize: '28rpx', fontWeight: 600, color: 'var(--ink-deep)' }}>练习模式</Text>
        <View style={{ marginTop: 16 }}>
          {MODES.map((m) => {
            const sel = mode === m.value;
            return (
              <View
                key={m.value}
                onClick={() => setMode(m.value)}
                className={sel ? 'option selected' : 'option'}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <View>
                  <Text style={{ fontSize: '28rpx', fontWeight: 600, color: 'var(--ink-deep)', display: 'block' }}>
                    {m.label}
                  </Text>
                  <Text style={{ fontSize: '22rpx', color: 'var(--ink-mid)', marginTop: 6, display: 'block' }}>
                    {m.desc}
                  </Text>
                </View>
                {sel && <Text style={{ color: 'var(--brand)', fontSize: '36rpx' }}>✓</Text>}
              </View>
            );
          })}
        </View>
      </View>

      <View style={{
        background: '#fff',
        borderRadius: '24rpx',
        padding: '32rpx',
        marginBottom: '24rpx',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <Text style={{ fontSize: '28rpx', fontWeight: 600, color: 'var(--ink-deep)' }}>题量</Text>
        <View style={{ display: 'flex', flexWrap: 'wrap', marginTop: 16 }}>
          {[5, 10, 20, 30, 50].map((n) => (
            <View
              key={n}
              onClick={() => setCount(n)}
              style={{
                background: count === n ? 'var(--brand)' : 'var(--brand-soft)',
                color: count === n ? '#fff' : 'var(--brand)',
                padding: '12rpx 28rpx',
                borderRadius: '999rpx',
                fontSize: '26rpx',
                fontWeight: 600,
                marginRight: 12, marginBottom: 12,
              }}
            >{n} 题</View>
          ))}
        </View>
      </View>

      <View style={{
        background: '#fff',
        borderRadius: '24rpx',
        padding: '32rpx',
        marginBottom: '24rpx',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <Text style={{ fontSize: '28rpx', fontWeight: 600, color: 'var(--ink-deep)' }}>解析显示</Text>
        <View style={{ display: 'flex', marginTop: 16 }}>
          {[
            { v: true,  l: '即时显示' },
            { v: false, l: '交卷后显示' },
          ].map((opt) => (
            <View
              key={String(opt.v)}
              onClick={() => setImmediate(opt.v)}
              style={{
                flex: 1,
                textAlign: 'center',
                padding: '20rpx',
                borderRadius: '16rpx',
                background: immediate === opt.v ? 'var(--brand)' : 'var(--brand-soft)',
                color: immediate === opt.v ? '#fff' : 'var(--brand)',
                fontSize: '26rpx',
                fontWeight: 600,
                marginRight: 12,
              }}
            >{opt.l}</View>
          ))}
        </View>
      </View>

      <View className="btn-primary" style={{ marginTop: 16 }} onClick={onStart}>开始练习</View>
    </View>
  );
}
