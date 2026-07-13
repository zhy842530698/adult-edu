import React from 'react';
import { View } from '@tarojs/components';

interface Props {
  percent: number;          // 0..100
  color?: string;           // 默认主色蓝
  bgColor?: string;         // 默认浅灰
  height?: number;          // rpx，默认 12
  style?: React.CSSProperties;
}

/**
 * 进度条 —— 原型 §10 进度条/统计
 */
export default function ProgressBar({
  percent,
  color = 'linear-gradient(90deg, #2563EB 0%, #1D4ED8 100%)',
  bgColor = '#F3F4F6',
  height = 12,
  style,
}: Props) {
  const p = Math.max(0, Math.min(100, percent));
  return (
    <View
      style={{
        width: '100%',
        height: `${height}rpx`,
        background: bgColor,
        borderRadius: '999rpx',
        overflow: 'hidden',
        ...style,
      }}
    >
      <View
        style={{
          width: `${p}%`,
          height: '100%',
          background: color,
          borderRadius: '999rpx',
        }}
      />
    </View>
  );
}
