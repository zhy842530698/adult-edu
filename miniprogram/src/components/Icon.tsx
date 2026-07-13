import React from 'react';
import { Text, View } from '@tarojs/components';

/**
 * 全局统一 icon —— 用 emoji 字符代替，避免依赖 iconfont 在 WeChat 下的兼容问题。
 * 外部页面严禁绕过本组件直接用 @taroify/icons —— 后续要换图标库只改这里。
 *
 * 名称白名单（与 plan §2.2 保持一致）：
 *   home / catalog / practice / wrong / favorite / mock / search
 *   user / profile / card / analysis / star / arrow / check
 *   cloud / gift / calendar / target / medal / chart / notes / settings
 */
export type IconName =
  | 'home' | 'catalog' | 'practice' | 'wrong' | 'favorite' | 'mock'
  | 'search' | 'user' | 'card' | 'analysis' | 'star' | 'starO'
  | 'arrow' | 'arrowLeft' | 'check' | 'cross' | 'plus' | 'minus'
  | 'cloud' | 'gift' | 'calendar' | 'target' | 'medal' | 'chart' | 'notes' | 'settings' | 'trophy';

const EMOJI: Record<IconName, string> = {
  home:      '🏠',
  catalog:   '📚',
  practice:  '✏️',
  wrong:     '❌',
  favorite:  '⭐',
  mock:      '📝',
  search:    '🔍',
  user:      '👤',
  card:      '📋',
  analysis:  '📖',
  star:      '★',
  starO:     '☆',
  arrow:     '›',
  arrowLeft: '‹',
  check:     '✓',
  cross:     '✕',
  plus:      '+',
  minus:     '−',
  cloud:     '☁️',
  gift:      '🎁',
  calendar:  '📅',
  target:    '🎯',
  medal:     '🏅',
  chart:     '📈',
  notes:     '📒',
  settings:  '⚙️',
  trophy:    '🏆',
};

interface IconProps {
  name: IconName;
  size?: number;        // 像素（被 rpx 替换）
  color?: string;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * Icon —— 在 page 里只能通过这个组件使用 icon。
 * <Icon name="home" /> 或 <Icon name="star" size={20} />
 */
export default function Icon({ name, size = 32, color, style, className }: IconProps) {
  return (
    <Text
      className={className}
      style={{
        fontSize: `${size}rpx`,
        color: color || 'inherit',
        lineHeight: 1,
        display: 'inline-block',
        ...style,
      }}
    >
      {EMOJI[name] || '•'}
    </Text>
  );
}
