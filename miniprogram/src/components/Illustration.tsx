import React from 'react';
import { View, Text } from '@tarojs/components';

export type IllustrationKind = 'gift' | 'cloud' | 'calendar' | 'target' | 'rocket' | 'trophy' | 'notes';

/**
 * 大图占位（不带外部资源，emoji + 渐变底色模拟原型插画）—— §13 其他组件
 * <Illustration kind="gift" />
 */
const EMOJI: Record<IllustrationKind, string> = {
  gift:     '🎁',
  cloud:    '☁️',
  calendar: '📅',
  target:   '🎯',
  rocket:   '🚀',
  trophy:   '🏆',
  notes:    '📒',
};

const BG: Record<IllustrationKind, string> = {
  gift:     'linear-gradient(135deg, #DBEAFE 0%, #EFF6FF 100%)',
  cloud:    'linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 100%)',
  calendar: 'linear-gradient(135deg, #FEF3C7 0%, #FEF9C3 100%)',
  target:   'linear-gradient(135deg, #DCFCE7 0%, #ECFDF5 100%)',
  rocket:   'linear-gradient(135deg, #FEE2E2 0%, #FEF2F2 100%)',
  trophy:   'linear-gradient(135deg, #FEF3C7 0%, #FFFBEB 100%)',
  notes:    'linear-gradient(135deg, #FEF3C7 0%, #FEF9C3 100%)',
};

interface Props {
  kind: IllustrationKind;
  size?: number;      // rpx，宽度 = 高度
  style?: React.CSSProperties;
}

export default function Illustration({ kind, size = 200, style }: Props) {
  return (
    <View
      style={{
        width: `${size}rpx`,
        height: `${size}rpx`,
        background: BG[kind],
        borderRadius: '32rpx',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      <Text style={{ fontSize: `${Math.round(size * 0.5)}rpx`, lineHeight: 1 }}>
        {EMOJI[kind]}
      </Text>
    </View>
  );
}
