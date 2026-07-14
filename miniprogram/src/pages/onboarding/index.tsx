import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { api } from '../../api/client';
import { loadTargets } from '../../store/auth';
import { showError } from '../../utils/format';
import Illustration from '../../components/Illustration';
import Icon from '../../components/Icon';

type Purpose = 'EXAM_PREP' | 'SKILL_UP' | 'KEEP_FRESH';
type DailyGoal = 'FAST' | 'STEADY' | 'MAINTAIN';
type PaceOption = 10 | 20 | 30 | 45;

interface ExamOpt { id: number; name: string; }
interface PlanItem { type: string; title: string; desc: string; amount: number; unit: string; }

const PURPOSE_LABEL: Record<Purpose, string> = {
  EXAM_PREP: '备战考试',
  SKILL_UP:   '提升技能',
  KEEP_FRESH: '保持手感',
};
const DAILY_GOAL_LABEL: Record<DailyGoal, string> = {
  FAST:     '很快提升',
  STEADY:   '稳步提升',
  MAINTAIN: '保持手感',
};

const STEPS_TOTAL = 5;

/**
 * 5 步 onboarding 向导 —— 对应原型 ask_new_user.png
 *   1. 目标  2. 考试  3. 每日目标  4. 学习节奏  5. 汇总
 */
export default function OnboardingPage() {
  const [step, setStep] = useState(1);

  // 1) purpose
  const [purpose, setPurpose] = useState<Purpose | null>(null);
  // 2) exam
  const [exams, setExams] = useState<ExamOpt[]>([]);
  const [examsLoading, setExamsLoading] = useState(false);
  const [examId, setExamId] = useState<number | null>(null);
  // 3) daily goal
  const [dailyGoal, setDailyGoal] = useState<DailyGoal | null>(null);
  // 4) pace
  const [pace, setPace] = useState<PaceOption | null>(null);
  // 5) plan
  const [submitting, setSubmitting] = useState(false);
  const [plan, setPlan] = useState<PlanItem[]>([]);
  const [primaryTarget, setPrimaryTarget] = useState<any>(null);

  // Step 2: load exam catalog
  useEffect(() => {
    if (step !== 2) return;
    setExamsLoading(true);
    api.get<any>('/exam-catalog')
      .then((r) => setExams((r.items || []).flatMap((c: any) => c.exams || [])))
      .catch((e) => showError(e, '考试列表加载失败'))
      .finally(() => setExamsLoading(false));
  }, [step]);

  const canNext = useMemo(() => {
    if (step === 1) return purpose !== null;
    if (step === 2) return examId !== null;
    if (step === 3) return dailyGoal !== null;
    if (step === 4) return pace !== null;
    return true;
  }, [step, purpose, examId, dailyGoal, pace]);

  const goNext = () => setStep((s) => Math.min(STEPS_TOTAL, s + 1));
  const goPrev = () => setStep((s) => Math.max(1, s - 1));

  const onStart = async () => {
    if (!purpose || !examId || !dailyGoal || !pace) return;
    setSubmitting(true);
    try {
      const r = await api.post<any>('/user/onboarding', {
        purpose, exam_id: examId, daily_goal: dailyGoal, study_pace_minutes: pace,
      });
      setPlan(r.recommended_plan || []);
      setPrimaryTarget(r.primary_target || null);
      await loadTargets();
      Taro.showToast({ title: '目标设置成功', icon: 'success' });
      setTimeout(() => Taro.switchTab({ url: '/pages/home/index' }), 400);
    } catch (e) {
      showError(e, '保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  const onReselect = () => {
    setStep(1);
    setPlan([]);
    setPrimaryTarget(null);
  };

  // 进度条
  const progress = useMemo(() => `${step}/${STEPS_TOTAL}`, [step]);

  return (
    <View style={{ background: 'var(--bg-page)', minHeight: '100vh' }}>
      {/* 进度条 */}
      <View style={{ padding: '24rpx 32rpx 0' }}>
        <View className="row-between" style={{ marginBottom: 8 }}>
          <Text style={{ color: 'var(--brand)', fontSize: '28rpx', fontWeight: 600 }}>{progress}</Text>
        </View>
        <View style={{ width: '100%', height: '8rpx', background: 'var(--bg-soft)', borderRadius: '999rpx', overflow: 'hidden' }}>
          <View style={{
            width: `${(step / STEPS_TOTAL) * 100}%`,
            height: '100%',
            background: 'var(--brand)',
            transition: 'width 0.2s',
          }} />
        </View>
      </View>

      <ScrollView scrollY style={{ padding: '32rpx 32rpx 200rpx' }}>
        {step === 1 && (
          <Step1Purpose value={purpose} onChange={setPurpose} />
        )}
        {step === 2 && (
          <Step2Exam exams={exams} loading={examsLoading} value={examId} onChange={setExamId} />
        )}
        {step === 3 && (
          <Step3DailyGoal value={dailyGoal} onChange={setDailyGoal} />
        )}
        {step === 4 && (
          <Step4Pace value={pace} onChange={setPace} />
        )}
        {step === 5 && (
          <Step5Summary
            purpose={purpose!} examName={exams.find((e) => e.id === examId)?.name}
            dailyGoal={dailyGoal!} pace={pace!}
            plan={plan} primaryTarget={primaryTarget} submitting={submitting}
            onStart={onStart} onReselect={onReselect}
          />
        )}
      </ScrollView>

      {/* 底部按钮（Step 5 自己渲染）*/}
      {step < 5 && (
        <View style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          padding: '24rpx 32rpx 40rpx', background: '#fff',
          boxShadow: '0 -2rpx 16rpx rgba(0,0,0,0.06)',
        }}>
          <View className="row" style={{ gap: '20rpx' }}>
            {step > 1 && (
              <View
                className="btn-ghost"
                style={{ flex: 1 }}
                onClick={goPrev}
              >上一步</View>
            )}
            <View
              className="btn-primary"
              style={{ flex: 2, opacity: canNext ? 1 : 0.4 }}
              onClick={canNext ? goNext : undefined}
            >下一步</View>
          </View>
        </View>
      )}
    </View>
  );
}

// ---------- 各步骤组件 ----------

function StepTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <View style={{ marginBottom: 32 }}>
      <Text style={{ fontSize: '48rpx', fontWeight: 700, color: 'var(--ink-deep)' }}>{title}</Text>
      {sub && (
        <Text style={{ display: 'block', marginTop: 12, fontSize: '26rpx', color: 'var(--ink-mid)' }}>
          {sub}
        </Text>
      )}
    </View>
  );
}

function OptionRow({ label, desc, active, onClick }: { label: string; desc?: string; active: boolean; onClick: () => void }) {
  return (
    <View
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center',
        padding: '32rpx',
        marginBottom: 16,
        background: '#fff',
        border: active ? '2rpx solid var(--brand)' : '2rpx solid var(--line)',
        borderRadius: '20rpx',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: '32rpx', fontWeight: 600, color: 'var(--ink-deep)' }}>{label}</Text>
        {desc && (
          <Text style={{ display: 'block', marginTop: 6, fontSize: '24rpx', color: 'var(--ink-mid)' }}>
            {desc}
          </Text>
        )}
      </View>
      <View style={{
        width: '40rpx', height: '40rpx', borderRadius: '999rpx',
        border: `2rpx solid ${active ? 'var(--brand)' : 'var(--line)'}`,
        background: active ? 'var(--brand)' : '#fff',
        color: '#fff', textAlign: 'center', lineHeight: '36rpx',
        fontSize: '24rpx',
      }}>{active ? '✓' : ''}</View>
    </View>
  );
}

function Step1Purpose({ value, onChange }: { value: Purpose | null; onChange: (v: Purpose) => void }) {
  return (
    <View>
      <StepTitle title="你的目标是什么？" sub="我们会根据你的目标，推荐合适的学习内容" />
      <OptionRow label="备战考试" desc="考试临近，需要集中突破" active={value === 'EXAM_PREP'} onClick={() => onChange('EXAM_PREP')} />
      <OptionRow label="提升技能" desc="长期积累，稳步打牢基础" active={value === 'SKILL_UP'}   onClick={() => onChange('SKILL_UP')} />
      <OptionRow label="保持手感" desc="已经掌握，每天做几道防遗忘" active={value === 'KEEP_FRESH'} onClick={() => onChange('KEEP_FRESH')} />
    </View>
  );
}

function Step2Exam({ exams, loading, value, onChange }: { exams: ExamOpt[]; loading: boolean; value: number | null; onChange: (v: number) => void }) {
  return (
    <View>
      <StepTitle title="准备哪场考试？" sub="选择后可在「我的」修改主目标" />
      {loading && <Text style={{ color: 'var(--ink-mid)' }}>正在加载考试列表…</Text>}
      {!loading && exams.length === 0 && (
        <View style={{
          background: '#fff', borderRadius: '20rpx', padding: '60rpx 32rpx',
          textAlign: 'center', boxShadow: 'var(--shadow-sm)',
        }}>
          <Text style={{ color: 'var(--ink-mid)' }}>暂无考试数据</Text>
        </View>
      )}
      {exams.map((e) => (
        <OptionRow key={e.id} label={e.name} active={value === e.id} onClick={() => onChange(e.id)} />
      ))}
    </View>
  );
}

function Step3DailyGoal({ value, onChange }: { value: DailyGoal | null; onChange: (v: DailyGoal) => void }) {
  return (
    <View>
      <StepTitle title="想以什么节奏提升？" sub="节奏越快，每日题量越多" />
      <OptionRow label="很快提升" desc="加大题量，密集练习"     active={value === 'FAST'}     onClick={() => onChange('FAST')} />
      <OptionRow label="稳步提升" desc="保持稳定、可持续的节奏" active={value === 'STEADY'}   onClick={() => onChange('STEADY')} />
      <OptionRow label="保持手感" desc="轻量维持即可"           active={value === 'MAINTAIN'} onClick={() => onChange('MAINTAIN')} />
    </View>
  );
}

function Step4Pace({ value, onChange }: { value: PaceOption | null; onChange: (v: PaceOption) => void }) {
  const opts: { v: PaceOption; sub: string }[] = [
    { v: 10, sub: '碎片时间、地铁通勤' },
    { v: 20, sub: '下班后、晚间' },
    { v: 30, sub: '集中学习 30 分钟' },
    { v: 45, sub: '周末深入练习' },
  ];
  return (
    <View>
      <StepTitle title="每天能投入多少时间？" sub="按学习节奏推送每日任务量" />
      {opts.map((o) => (
        <OptionRow
          key={o.v}
          label={`${o.v} 分钟/天`}
          desc={o.sub}
          active={value === o.v}
          onClick={() => onChange(o.v)}
        />
      ))}
    </View>
  );
}

function Step5Summary(props: {
  purpose: Purpose; examName?: string; dailyGoal: DailyGoal; pace: PaceOption;
  plan: PlanItem[]; primaryTarget: any; submitting: boolean;
  onStart: () => void; onReselect: () => void;
}) {
  const { purpose, examName, dailyGoal, pace, plan, primaryTarget, submitting, onStart, onReselect } = props;
  return (
    <View>
      <View style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: '44rpx', fontWeight: 700, color: 'var(--ink-deep)' }}>为你定制的学习计划</Text>
          <Text style={{ display: 'block', marginTop: 8, fontSize: '26rpx', color: 'var(--ink-mid)' }}>
            根据你的选择，我们先为你推荐一个起步方案
          </Text>
        </View>
        <Illustration kind="target" size={140} />
      </View>

      {/* 摘要卡 */}
      <View style={{
        background: '#fff', borderRadius: '24rpx', padding: '8rpx 32rpx',
        boxShadow: 'var(--shadow-sm)', marginBottom: 24,
      }}>
        <SummaryRow icon="🎯" label="目标"   value={PURPOSE_LABEL[purpose]} />
        <SummaryRow icon="📚" label="考试"   value={examName || '—'} />
        <SummaryRow icon="⚡" label="每日目标" value={DAILY_GOAL_LABEL[dailyGoal]} />
        <SummaryRow icon="⏰" label="学习节奏" value={`${pace} 分钟/天`} last />
      </View>

      {/* 推荐方案 */}
      {plan.length > 0 ? (
        <View style={{
          background: 'linear-gradient(135deg, #ECFDF5 0%, #F0FDF4 100%)',
          borderRadius: '24rpx', padding: '28rpx 32rpx', marginBottom: 24,
        }}>
          <View className="row" style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: '24rpx' }}>⭐</Text>
            <Text style={{ marginLeft: 8, fontSize: '30rpx', fontWeight: 700, color: 'var(--green)' }}>
              推荐方案
            </Text>
          </View>
          {plan.map((p, i) => (
            <View key={p.type} className="row" style={{ marginBottom: 12 }}>
              <View style={{
                width: '48rpx', height: '48rpx', borderRadius: '999rpx',
                background: '#fff', color: 'var(--green)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '26rpx', marginRight: 16,
              }}>{i + 1}</View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: '30rpx', fontWeight: 600, color: 'var(--ink-deep)' }}>{p.title}</Text>
                <Text style={{ display: 'block', marginTop: 4, fontSize: '24rpx', color: 'var(--ink-mid)' }}>
                  {p.desc}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Text style={{ color: 'var(--ink-mid)', textAlign: 'center', padding: '40rpx 0' }}>
          提交后将看到为你推荐的方案
        </Text>
      )}

      {/* 按钮 */}
      <View className="btn-primary" style={{ marginTop: 16, opacity: submitting ? 0.6 : 1 }} onClick={onStart}>
        {submitting ? '保存中…' : '开始刷题'}
      </View>
      <View style={{ textAlign: 'center', marginTop: 24 }} onClick={onReselect}>
        <Text style={{ color: 'var(--ink-mid)', fontSize: '26rpx' }}>重新选择</Text>
      </View>
    </View>
  );
}

function SummaryRow({ icon, label, value, last }: { icon: string; label: string; value: string; last?: boolean }) {
  return (
    <View style={{
      display: 'flex', alignItems: 'center',
      padding: '28rpx 0',
      borderBottom: last ? 'none' : '1rpx solid var(--line)',
    }}>
      <View style={{
        width: '56rpx', height: '56rpx', borderRadius: '16rpx',
        background: 'var(--bg-soft)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '32rpx', marginRight: 16,
      }}>{icon}</View>
      <Text style={{ flex: 1, fontSize: '28rpx', color: 'var(--ink-mid)' }}>{label}</Text>
      <Text style={{ fontSize: '28rpx', fontWeight: 600, color: 'var(--ink-deep)' }}>{value}</Text>
    </View>
  );
}
