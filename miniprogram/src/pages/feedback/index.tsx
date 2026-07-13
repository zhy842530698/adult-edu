import React, { useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { api } from '../../api/client';
import { showError } from '../../utils/format';

const TYPES = [
  { v: 'ANSWER_WRONG', l: '答案疑似错误' },
  { v: 'ANALYSIS_UNCLEAR', l: '解析不清' },
  { v: 'STEM_MISSING', l: '题干缺失' },
  { v: 'OPTION_PROBLEM', l: '选项问题' },
  { v: 'ASSET_BROKEN', l: '图片异常' },
  { v: 'OTHER', l: '其他' },
];

export default function FeedbackPage() {
  const router = Taro.getCurrentInstance()?.router;
  const qid = Number(router?.params?.qid || 0);
  const qvid = Number(router?.params?.qvid || 0);
  const sess = Number(router?.params?.sess || 0);

  const [type, setType] = useState('ANSWER_WRONG');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!content.trim()) { Taro.showToast({ title: '请填写反馈内容', icon: 'none' }); return; }
    if (!qid || !qvid) {
      Taro.showToast({ title: '缺少题目上下文，请从题目页进入', icon: 'none' });
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/question-feedback', {
        question_id: qid,
        question_version_id: qvid,
        session_id: sess || undefined,
        feedback_type: type,
        content,
      });
      Taro.showToast({ title: '已提交，感谢反馈', icon: 'success' });
      setTimeout(() => Taro.navigateBack(), 1000);
    } catch (e) { showError(e, '提交失败'); }
    finally { setSubmitting(false); }
  };

  return (
    <View style={{ background: 'var(--bg-page)', minHeight: '100vh', padding: '32rpx' }}>
      <View style={{
        background: '#fff',
        borderRadius: '24rpx',
        padding: '32rpx',
        marginBottom: '24rpx',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <Text style={{ fontSize: '28rpx', fontWeight: 600, color: 'var(--ink-deep)' }}>反馈类型</Text>
        <View style={{ display: 'flex', flexWrap: 'wrap', marginTop: 20 }}>
          {TYPES.map((t) => (
            <View key={t.v}
              onClick={() => setType(t.v)}
              style={{
                background: type === t.v ? 'var(--brand)' : 'var(--brand-soft)',
                color: type === t.v ? '#fff' : 'var(--brand)',
                padding: '12rpx 28rpx',
                borderRadius: '999rpx',
                fontSize: '24rpx',
                fontWeight: 500,
                marginRight: 12,
                marginBottom: 12,
              }}
            >{t.l}</View>
          ))}
        </View>
      </View>

      <View style={{
        background: '#fff',
        borderRadius: '24rpx',
        padding: '32rpx',
        marginBottom: '24rpx',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <Text style={{ fontSize: '28rpx', fontWeight: 600, color: 'var(--ink-deep)', display: 'block' }}>反馈内容</Text>
        <View style={{
          background: 'var(--bg-soft)',
          borderRadius: '16rpx',
          padding: '24rpx',
          marginTop: '16rpx',
        }}>
          <textarea
            value={content}
            onInput={(e: any) => setContent(e.detail.value)}
            placeholder="请详细描述问题，便于我们改进"
            style={{ width: '100%', minHeight: '240rpx', background: 'transparent', fontSize: '28rpx' }}
            maxLength={500}
          />
        </View>
        <Text className="tip" style={{ display: 'block', textAlign: 'right', marginTop: 12 }}>
          {content.length} / 500
        </Text>
      </View>

      <View className="btn-primary" onClick={onSubmit} style={{ opacity: submitting ? 0.6 : 1 }}>
        {submitting ? '提交中…' : '提交反馈'}
      </View>
    </View>
  );
}
