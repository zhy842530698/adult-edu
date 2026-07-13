import React from 'react';
import { Text } from '@tarojs/components';

export type TagVariant =
  | 'easy' | 'mid' | 'hard'
  | 'done' | 'doing' | 'mastered'
  | 'new' | 'truth' | 'key' | 'gray' | 'default';

/**
 * 状态徽章 —— 统一来自原型 §07 的色板。
 * 用法：<Tag variant="easy">简单</Tag>
 */
interface Props {
  variant?: TagVariant;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const VARIANT_CLASS: Record<TagVariant, string> = {
  easy:     'tag tag-easy',
  mid:      'tag tag-mid',
  hard:     'tag tag-hard',
  done:     'tag tag-done',
  doing:    'tag tag-doing',
  mastered: 'tag tag-mastered',
  new:      'tag tag-new',
  truth:    'tag tag-truth',
  key:      'tag tag-key',
  gray:     'tag tag-gray',
  default:  'tag',
};

export default function Tag({ variant = 'default', children, className, style }: Props) {
  return (
    <Text className={`${VARIANT_CLASS[variant]} ${className || ''}`} style={style}>
      {children}
    </Text>
  );
}
