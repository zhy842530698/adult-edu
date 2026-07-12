import React, { useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';

const MODES = [
  { value: 'SEQUENTIAL', label: '顺序练习' },
  { value: 'RANDOM', label: '随机练习' },
  { value: 'CHAPTER', label: '章节练习' },
  { value: 'KNOWLEDGE', label: '知识点专项' },
  { value: 'WRONG', label: '错题练习' },
  { value: 'FAVORITE', label: '收藏练习' },
  { value: 'MOCK', label: '模拟考试' },
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
    <View className="container">
      <View className="card">
        <Text className="title">练习模式</Text>
        <View style={{ marginTop: '16rpx' }}>
          {MODES.map((m) => (
            <View key={m.value} onClick={() => setMode(m.value)} className="option"
              style={mode === m.value ? 'border-color:#1677ff;background:#e6f4ff;' : ''}>
              <Text>{m.label}</Text>
              {mode === m.value && <Text style={{ color: '#1677ff' }}>✓</Text>}
            </View>
          ))}
        </View>
      </View>

      <View className="card">
        <Text className="title">题量</Text>
        <View className="row" style={{ marginTop: '16rpx' }}>
          {[5, 10, 20, 30, 50].map((n) => (
            <View key={n} onClick={() => setCount(n)} className="tag"
              style={count === n ? 'background:#1677ff;color:#fff;' : ''}>{n} 题</View>
          ))}
        </View>
      </View>

      <View className="card">
        <Text className="title">解析显示</Text>
        <View className="row" style={{ marginTop: '16rpx' }}>
          <View className="tag" onClick={() => setImmediate(true)}
            style={immediate ? 'background:#1677ff;color:#fff;' : ''}>即时显示</View>
          <View className="tag" onClick={() => setImmediate(false)}
            style={!immediate ? 'background:#1677ff;color:#fff;' : ''}>交卷后显示</View>
        </View>
      </View>

      <View className="btn-primary" onClick={onStart}>开始练习</View>
    </View>
  );
}