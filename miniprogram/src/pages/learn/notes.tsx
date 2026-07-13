import React from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import Icon from '../../components/Icon';
import Illustration from '../../components/Illustration';

/**
 * 我的笔记（mock 空态）—— 后端补笔记接口后可接
 */

export default function NotesPage() {
  return (
    <View style={{
      background: 'var(--bg-page)', minHeight: '100vh',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '160rpx 32rpx',
    }}>
      <Illustration kind="notes" size={200} />
      <Text style={{ marginTop: 32, fontSize: '32rpx', fontWeight: 600, color: 'var(--ink-deep)' }}>
        暂无笔记
      </Text>
      <Text style={{ marginTop: 12, fontSize: '24rpx', color: 'var(--ink-mid)', textAlign: 'center' }}>
        做完题目随手记录要点{'\n'}比题目本身更值钱
      </Text>
      <View
        className="btn-primary"
        style={{ marginTop: 40, width: '320rpx' }}
        onClick={() => Taro.showToast({ title: '笔记功能 TODO 接后端', icon: 'none' })}
      >
        <Icon name="plus" size={28} color="#fff" />
        <Text style={{ marginLeft: 8, fontSize: '28rpx' }}>新建笔记</Text>
      </View>
    </View>
  );
}
