import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { api, getToken } from '../../api/client';
import { optionStateClass, showError } from '../../utils/format';
import Icon from '../../components/Icon';

interface QuestionBlock {
  question_version_id: number;
  question_id: number;
  question_type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE';
  stem: string;
  options: { option_code: string; content: string }[];
  score: number;
  selected_options?: string[];
  correct_options?: string[];
  analysis?: string;
  is_correct?: boolean;
}

export default function SessionPage() {
  const id = Number(Taro.getCurrentInstance()?.router?.params?.id);
  const [sess, setSess] = useState<any>(null);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const [showCard, setShowCard] = useState(false);

  // 自动保存：toggle 后防抖 500ms 再调接口；切题/交卷前 flush；用 dirtyRef + seq 避免重复保存和过期响应
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveSeqRef = useRef(0);
  const pendingRef = useRef<string[]>([]);
  const currentQvRef = useRef<number | null>(null);
  const dirtyRef = useRef(false);

  // 每题停留时长：进入题目时打点（questionStartAt），flush 时算秒数发给后端计入 UserAnswer.time_spent_seconds。
  const questionStartAtRef = useRef<number>(Date.now());
  const computeElapsed = () => Math.max(0, Math.round((Date.now() - questionStartAtRef.current) / 1000));
  const resetTimer = (qv: number | null) => { questionStartAtRef.current = Date.now(); currentQvRef.current = qv; };

  const flushSave = async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (!dirtyRef.current) return;
    const qv = currentQvRef.current;
    const opts = pendingRef.current;
    if (qv == null || !opts.length) {
      dirtyRef.current = false;
      return;
    }
    dirtyRef.current = false; // 先清标记，避免与 setSess 触发的 useEffect 重入
    const elapsed = computeElapsed();
    const mySeq = ++saveSeqRef.current;
    try {
      await api.put<any>(
        `/practice-sessions/${id}/answers/${qv}`,
        { selected_options: opts, time_spent_seconds: elapsed },
        { idempotencyKey: `sess-${id}-q-${qv}-${mySeq}-${Date.now()}` },
      );
      // 静默刷新会话，让答题卡更新已答状态
      if (mySeq === saveSeqRef.current) {
        const fresh = await api.get<any>(`/practice-sessions/${id}`);
        if (mySeq === saveSeqRef.current) setSess(fresh);
      }
      // 写完后重置计时（对同一题反复改选项不会重复累加）
      questionStartAtRef.current = Date.now();
    } catch (e) {
      dirtyRef.current = true; // 失败回滚 dirty，下次再试
      showError(e, '保存失败');
    }
  };

  useEffect(() => {
    if (!getToken()) { Taro.redirectTo({ url: '/pages/login/index' }); return; }
    if (!id) { Taro.showToast({ title: '缺少会话ID', icon: 'none' }); return; }
    api.get<any>(`/practice-sessions/${id}`).then(setSess);
  }, [id]);

  const q: QuestionBlock | undefined = sess?.items?.[idx];
  const total = sess?.items?.length || 0;

  useEffect(() => {
    // 同步选中状态。注：不调 flushSave —— 切题/交卷的 flush 由 goNext/goPrev/submitAll 显式做，
    // 自动保存后的 setSess 也只刷新数据，不再触发 save，避免循环。
    setSelected(q?.selected_options || []);
    resetTimer(q?.question_version_id ?? null);
    pendingRef.current = q?.selected_options || [];
    // 只有交了卷（SUBMITTED）才显示对错。其它模式（SEQUENTIAL/RANDOM/DAILY…）
    // 一律等用户交完卷再 reveal，避免点完选项就飘绿/红。
    setRevealed(sess?.status === 'SUBMITTED');
  }, [idx, sess]);

  // 页面卸载时尽力 flush（例如被系统回收前）
  useEffect(() => () => { flushSave(); /* eslint-disable-line */ }, []);

  const toggle = (code: string) => {
    if (!q || revealed) return;
    const next = q.question_type === 'SINGLE_CHOICE'
      ? [code]
      : selected.includes(code) ? selected.filter((c) => c !== code) : [...selected, code];
    setSelected(next);
    pendingRef.current = next;
    // 这里不重写 currentQvRef —— 切题/交卷才需要重置 timer，见 resetTimer
    dirtyRef.current = true;
    // 防抖 500ms 再调保存接口（多选时连点也只发一次）
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(flushSave, 500);
  };

  const goPrev = async () => {
    await flushSave();
    setIdx(Math.max(0, idx - 1));
  };
  const goNext = async () => {
    await flushSave();
    setIdx(Math.min(total - 1, idx + 1));
  };

  const submitAll = async () => {
    await flushSave();
    try {
      await api.post(`/practice-sessions/${id}/submit`, {},
        { idempotencyKey: `submit-${id}-${Date.now()}` });
      Taro.redirectTo({ url: `/pages/practice/result?id=${id}` });
    } catch (e) { showError(e, '交卷失败'); }
  };

  const toggleFav = async () => {
    if (!q) return;
    try {
      if (favorite) await api.delete(`/questions/${q.question_id}/favorite`);
      else await api.put(`/questions/${q.question_id}/favorite`, {});
      setFavorite(!favorite);
    } catch (e) { showError(e, '收藏失败'); }
  };

  const onFeedback = () => {
    if (!q) return;
    Taro.navigateTo({ url: `/pages/feedback/index?qid=${q.question_id}&qvid=${q.question_version_id}&sess=${id}` });
  };

  if (!sess || !q) {
    return <View className="container"><Text>加载中…</Text></View>;
  }

  const answeredCount = sess.items.filter((x: any) => (x.selected_options || []).length > 0).length;
  const correctSet = new Set((q.correct_options || []).map((c) => c));

  return (
    <View className="container" style={{ padding: '24rpx' }}>
      {/* 顶部导航条 */}
      <View
        style={{
          background: '#fff',
          borderRadius: '24rpx',
          padding: '24rpx 32rpx',
          marginBottom: '24rpx',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <View className="row-between">
          <Text className="muted">{idx + 1} / {total}</Text>
          <View style={{
            fontSize: '22rpx',
            color: 'var(--brand)',
            background: 'var(--brand-soft)',
            padding: '4rpx 16rpx',
            borderRadius: '999rpx',
          }}>{sess.mode}</View>
          <View style={{ display: 'flex', alignItems: 'center' }}>
            <View className="btn-icon" onClick={toggleFav}>
              <Text style={{ fontSize: '32rpx', color: favorite ? '#F59E0B' : 'var(--ink-mid)' }}>
                {favorite ? '★' : '☆'}
              </Text>
            </View>
            <View
              className="btn-icon"
              onClick={() => Taro.navigateTo({ url: `/pages/wrong/analysis?qvid=${q.question_version_id}&sess=${id}` })}
            >
              <Text style={{ fontSize: '28rpx', color: 'var(--ink-mid)' }}>⊕</Text>
            </View>
          </View>
        </View>

        <View style={{ marginTop: 16, display: 'flex', alignItems: 'center' }}>
          <View className="tag tag-doing">{q.question_type === 'SINGLE_CHOICE' ? '单选题' : '多选题'}</View>
          <View className="tag tag-gray">{q.score} 分</View>
        </View>
        <Text style={{ display: 'block', marginTop: 16, fontSize: '30rpx', color: 'var(--ink-deep)', lineHeight: 1.6 }}>
          {q.stem}
        </Text>
      </View>

      {/* 选项区 */}
      <View>
        {q.options.map((o) => {
          const isPicked = selected.includes(o.option_code);
          const isAnswer = correctSet.has(o.option_code);
          let state: 'selected' | 'correct' | 'wrong' | 'idle' = isPicked ? 'selected' : 'idle';
          if (revealed) {
            if (isAnswer) state = 'correct';
            else if (isPicked && !isAnswer) state = 'wrong';
          }
          return (
            <View
              key={o.option_code}
              className={optionStateClass(state)}
              onClick={() => toggle(o.option_code)}
              style={{ display: 'flex', alignItems: 'flex-start' }}
            >
              <Text style={{ fontWeight: 700, color: isPicked ? 'var(--brand)' : 'var(--ink-mid)', marginRight: 12 }}>
                {o.option_code}.
              </Text>
              <Text style={{ flex: 1, color: 'var(--ink-deep)' }}>{o.content}</Text>
            </View>
          );
        })}
      </View>

      {/* 反馈卡（交卷后才显示，含正确答案和解析）*/}
      {revealed && (() => {
        const correct = q.is_correct === true;
        const wrong = q.is_correct === false;
        const ok = correct || wrong;
        if (!ok) return null;
        return (
        <View
          style={{
            marginTop: 24,
            background: correct ? 'var(--green-soft)' : 'var(--red-soft)',
            borderRadius: '24rpx',
            padding: '24rpx 32rpx',
            border: correct ? '2rpx solid var(--green)' : '2rpx solid var(--red)',
          }}
        >
          <View style={{ display: 'flex', alignItems: 'center' }}>
            <View
              style={{
                width: '40rpx',
                height: '40rpx',
                borderRadius: '999rpx',
                background: correct ? 'var(--green)' : 'var(--red)',
                color: '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                marginRight: 12,
              }}
            >
              {correct ? '✓' : '✕'}
            </View>
            <Text
              style={{
                fontSize: '28rpx',
                fontWeight: 600,
                color: correct ? 'var(--green)' : 'var(--red)',
              }}
            >
              {correct ? '回答正确' : '回答错误'}
            </Text>
          </View>
          <Text style={{ marginTop: 12, fontSize: '24rpx', color: 'var(--ink-mid)' }}>
            正确答案：{Array.from(correctSet).sort().join(', ')}
          </Text>
          {q.analysis && (
            <Text style={{ display: 'block', marginTop: 12, fontSize: '24rpx', color: 'var(--ink-mid)', lineHeight: 1.6 }}>
              解析：{q.analysis}
            </Text>
          )}
        </View>
        );
      })()}

      {/* 三键导航：上一题 / ≡ / 右槽按状态切换
            - 非最后一题 → 下一题
            - 最后一题 + 未交卷 → 交卷
            - 最后一题 + 已交卷（查看解析）→ 返回主页 */}
      <View className="row-between" style={{ marginTop: 32 }}>
        <View className="btn-ghost" onClick={goPrev} style={{ flex: 1, marginRight: 12 }}>上一题</View>
        <View className="btn-ghost" onClick={() => setShowCard(!showCard)} style={{ padding: '22rpx 32rpx' }}>
          <Text style={{ fontSize: '32rpx', color: 'var(--brand)' }}>≡</Text>
        </View>
        {idx < total - 1 ? (
          <View className="btn-primary" onClick={goNext} style={{ flex: 1, marginLeft: 12 }}>下一题</View>
        ) : revealed ? (
          <View
            className="btn-primary"
            onClick={() => Taro.switchTab({ url: '/pages/home/index' })}
            style={{ flex: 1, marginLeft: 12 }}
          >
            返回主页
          </View>
        ) : (
          <View className="btn-primary" onClick={submitAll} style={{ flex: 1, marginLeft: 12 }}>交卷</View>
        )}
      </View>

      <Text onClick={onFeedback} style={{ textAlign: 'center', marginTop: 24, color: 'var(--ink-mid)', fontSize: '24rpx' }}>
        题目有误？点这里反馈
      </Text>

      {showCard && (
        <View
          style={{
            background: '#fff',
            padding: '24rpx',
            borderRadius: '24rpx',
            marginTop: 24,
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <Text className="muted">答题卡（{answeredCount}/{total}）</Text>
          <View className="answer-grid" style={{ marginTop: 16 }}>
            {sess.items.map((qq: any, i: number) => {
              const ans = (qq.selected_options || []).length > 0;
              const wrong = qq.is_correct === false;
              let cls = 'answer-cell';
              if (i === idx) cls += ' current';
              else if (wrong) cls += ' wrong';
              else if (ans) cls += ' done';
              return (
                <View key={qq.question_version_id} onClick={() => setIdx(i)} className={cls}>
                  {i + 1}
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}
