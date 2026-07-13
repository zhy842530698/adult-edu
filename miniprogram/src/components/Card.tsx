import React from 'react';
import { View } from '@tarojs/components';

interface Props {
  children: React.ReactNode;
  className?: string;
  flat?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

/**
 * 统一卡片容器 —— 包了一层 .card，避免每个页面重复写 className
 * <Card onClick={() => …}> 内容 </Card>
 */
export default function Card({ children, className = '', flat, onClick, style }: Props) {
  const cls = `${flat ? 'card-flat' : 'card'} ${className}`;
  if (onClick) {
    return <View className={cls} onClick={onClick} style={style}>{children}</View>;
  }
  return <View className={cls} style={style}>{children}</View>;
}
