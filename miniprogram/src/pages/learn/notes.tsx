import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { api } from '../../api/client';
import { showError } from '../../utils/format';
import Illustration from '../../components/Illustration';

/**
 * 我的笔记 —— 数据来源 /notes。
 * 后端补笔记接口后启用；目前显示空态 + 引导文案。
 */

interface Note { id: number; title?: string; preview?: string; updated_at?: string; }

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[] | null>(null);

  useEffect(() => {
    api.get<any>('/notes')
      .then((r) => setNotes(Array.isArray(r?.items) ? r.items : []))
      .catch(() => setNotes(null));
  }, []);

  const onCreate = () => {
    Taro.showToast({ title: '新建笔记功能开发中', icon: 'none' });
  };

  return (
    <ScrollView scrollY style={{ background: 'var(--bg-page)', minHeight: '100vh' }}>
      <View style={{ padding: '40rpx 32rpx 24rpx' }}>
        <Text style={{ fontSize: '40rpx', fontWeight: 700, color: 'var(--ink-deep)' }}>我的笔记</Text>
      </View>

      {notes == null ? (
        <View style={{
          margin: '32rpx', background: '#fff', borderRadius: '24rpx', padding: '80rpx 32rpx',
          textAlign: 'center', boxShadow: 'var(--shadow-sm)',
        }}>
          <View style={{ display: 'flex', justifyContent: 'center' }}>
            <Illustration kind="notes" size={200} />
          </View>
          <Text style={{ display: 'block', marginTop: 24, fontSize: '32rpx', color: 'var(--ink-deep)', fontWeight: 600 }}>
            笔记功能开发中
          </Text>
          <Text style={{ display: 'block', marginTop: 12, fontSize: '24rpx', color: 'var(--ink-mid)' }}>
            上线后可在此记录做题要点
          </Text>
        </View>
      ) : notes.length === 0 ? (
        <View style={{
          margin: '32rpx', background: '#fff', borderRadius: '24rpx', padding: '80rpx 32rpx',
          textAlign: 'center', boxShadow: 'var(--shadow-sm)',
        }}>
          <View style={{ display: 'flex', justifyContent: 'center' }}>
            <Illustration kind="notes" size={200} />
          </View>
          <Text style={{ display: 'block', marginTop: 24, fontSize: '32rpx', color: 'var(--ink-deep)', fontWeight: 600 }}>
            暂无笔记
          </Text>
          <Text style={{ display: 'block', marginTop: 12, fontSize: '24rpx', color: 'var(--ink-mid)' }}>
            做完题目随手记录要点{'\n'}比题目本身更值钱
          </Text>
        </View>
      ) : (
        <View style={{ margin: '0 32rpx 24rpx' }}>
          {notes.map((n) => (
            <View key={n.id} className="card" style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: '28rpx', fontWeight: 600, color: 'var(--ink-deep)' }}>{n.title || '未命名笔记'}</Text>
              {n.preview && (
                <Text style={{ display: 'block', marginTop: 8, fontSize: '24rpx', color: 'var(--ink-mid)' }} numberOfLines={2}>
                  {n.preview}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}

      <View
        className="btn-primary"
        style={{ margin: '24rpx 32rpx 80rpx' }}
        onClick={onCreate}
      >
        <Text style={{ fontSize: '28rpx' }}>+ 新建笔记</Text>
      </View>
    </ScrollView>
  );
}
