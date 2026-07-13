import React from 'react';
import { Text, View } from '@tarojs/components';

/**
 * 难度星星 ★★★☆☆ —— 原型 §07
 * <Difficulty level={3} />   level=0..5，0 = 全灰
 */
interface Props {
  level: number;        // 0..5
  size?: number;        // 默认 28 rpx
  style?: React.CSSProperties;
}

export default function Difficulty({ level, size = 28, style }: Props) {
  return (
    <View style={{ display: 'inline-flex', alignItems: 'center', ...style }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Text
          key={i}
          style={{
            fontSize: `${size}rpx`,
            color: i <= level ? '#F8A800' : '#E5E7EB',
            marginRight: 4,
            lineHeight: 1,
          }}
        >
          ★
        </Text>
      ))}
    </View>
  );
}
