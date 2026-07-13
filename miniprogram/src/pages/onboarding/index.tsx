import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { api } from '../../api/client';
import { loadTargets, setDailyTarget, setPrimaryExam } from '../../store/auth';
import { showError } from '../../utils/format';

export default function OnboardingPage() {
  const [exams, setExams] = useState<any[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [daily, setDaily] = useState(20);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<any>('/exam-catalog')
      .then((r) => setExams((r.items || []).flatMap((c: any) => c.exams || [])))
      .catch((e) => showError(e, '考试列表加载失败'))
      .finally(() => setLoading(false));
  }, []);

  const onSubmit = async () => {
    if (!picked) { Taro.showToast({ title: '请选择主目标考试', icon: 'none' }); return; }
    setSubmitting(true);
    try {
      await setPrimaryExam(picked);
      await setDailyTarget(daily);
      await loadTargets();
      Taro.showToast({ title: '目标设置成功', icon: 'success' });
      setTimeout(() => Taro.switchTab({ url: '/pages/home/index' }), 500);
    } catch (e) {
      showError(e, '保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="container">
      <Text className="title">选择你的目标</Text>
      <Text className="muted" style={{ display: 'block', marginBottom: '24rpx' }}>
        选择后可在「我的」修改；每日题量仅用于提醒。
      </Text>

      <View className="card">
        <Text className="title" style={{ fontSize: '30rpx' }}>考试</Text>
        <ScrollView scrollY style={{ maxHeight: '560rpx', marginTop: '16rpx' }}>
          {loading && <Text className="muted">正在加载考试列表…</Text>}
          {!loading && exams.length === 0 && <Text className="muted">暂无考试数据，请先在运营后台创建考试或执行种子数据初始化。</Text>}
          {exams.map((e) => (
            <View
              key={e.id}
              onClick={() => setPicked(e.id)}
              className="option"
              style={picked === e.id ? { borderColor: '#1677ff', background: '#e6f4ff' } : {}}
            >
              <View className="row-between">
                <Text style={{ fontWeight: 600 }}>{e.name}</Text>
                {picked === e.id && <Text style={{ color: '#1677ff' }}>✓</Text>}
              </View>
              {e.subjects && e.subjects.length > 0 && (
                <Text className="muted" style={{ display: 'block', marginTop: '8rpx' }}>
                  {e.subjects.map((s: any) => s.name).join(' / ')}
                </Text>
              )}
            </View>
          ))}
        </ScrollView>
      </View>

      <View className="card">
        <Text className="title" style={{ fontSize: '30rpx' }}>每日目标题量</Text>
        <View className="row" style={{ marginTop: '16rpx' }}>
          {[10, 20, 30, 50].map((n) => (
            <View
              key={n}
              onClick={() => setDaily(n)}
              className="tag"
              style={daily === n ? { background: '#1677ff', color: '#fff' } : {}}
            >
              {n} 题
            </View>
          ))}
        </View>
      </View>

      <View className="btn-primary" onClick={onSubmit} style={{ opacity: submitting ? 0.6 : 1 }}>
        {submitting ? '保存中…' : '保存并开始'}
      </View>
    </View>
  );
}
