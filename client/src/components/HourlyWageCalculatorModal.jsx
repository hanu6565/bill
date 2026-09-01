import React, { useState, useEffect } from 'react';
import Modal from './Modal.jsx';
import api from '../services/api.js';
import { Calculator, CheckCircle, Clock, Sparkles } from 'lucide-react';

const PRESETS = [
  {
    id: '9.5h_6d',
    label: '9.5시간 6일 (주 57시간 / 월 26일 근무)',
    dailyHours: 9.5,
    weeklyDays: 6,
    baseMonthlyHours: 209,
    weeklyOvertimeHours: 5,
    weeklyHolidayHours: 9.5,
    weeklyNightHours: 0,
    fixedHoursStr: '10:00~21:30'
  },
  {
    id: '9.5h_5.5d',
    label: '9.5시간 5.5일 (주 52.25시간)',
    dailyHours: 9.5,
    weeklyDays: 5.5,
    baseMonthlyHours: 209,
    weeklyOvertimeHours: 5,
    weeklyHolidayHours: 4.75,
    weeklyNightHours: 0,
    fixedHoursStr: '10:00~21:30'
  },
  {
    id: '9.5h_5d',
    label: '9.5시간 5일 (주 47.5시간)',
    dailyHours: 9.5,
    weeklyDays: 5,
    baseMonthlyHours: 209,
    weeklyOvertimeHours: 5,
    weeklyHolidayHours: 0,
    weeklyNightHours: 0,
    fixedHoursStr: '10:00~21:30'
  },
  {
    id: '9h_6d_night',
    label: '9시간 6일 + 야간3h (주 54시간 / 월 26일)',
    dailyHours: 9,
    weeklyDays: 6,
    baseMonthlyHours: 209,
    weeklyOvertimeHours: 5,
    weeklyHolidayHours: 9,
    weeklyNightHours: 3,
    fixedHoursStr: '13:00~23:00'
  },
  {
    id: '9h_6d',
    label: '9시간 6일 (주 54시간 / 월 26일)',
    dailyHours: 9,
    weeklyDays: 6,
    baseMonthlyHours: 209,
    weeklyOvertimeHours: 5,
    weeklyHolidayHours: 9,
    weeklyNightHours: 0,
    fixedHoursStr: '10:00~20:00'
  },
  {
    id: '4.5h_6d_pm',
    label: '4.5시간 6일 (오후파트 / 야간6h / 월 141시간)',
    dailyHours: 4.5,
    weeklyDays: 6,
    baseMonthlyHours: 141,
    weeklyOvertimeHours: 0,
    weeklyHolidayHours: 0,
    weeklyNightHours: 6,
    fixedHoursStr: '17:30~22:30'
  },
  {
    id: '4.5h_6d_am',
    label: '4.5시간 6일 (오전파트 / 월 141시간)',
    dailyHours: 4.5,
    weeklyDays: 6,
    baseMonthlyHours: 141,
    weeklyOvertimeHours: 0,
    weeklyHolidayHours: 0,
    weeklyNightHours: 0,
    fixedHoursStr: '10:00~15:00'
  },
  {
    id: '5h_4d',
    label: '5시간 4일 (단시간 알바 / 주 20시간)',
    dailyHours: 5,
    weeklyDays: 4,
    baseMonthlyHours: 104.3,
    weeklyOvertimeHours: 0,
    weeklyHolidayHours: 0,
    weeklyNightHours: 0,
    fixedHoursStr: '11:00~16:30'
  }
];

export default function HourlyWageCalculatorModal({ isOpen, onClose, onApplyToEmployee, initialData = {} }) {
  const [calcMode, setCalcMode] = useState('REVERSE'); // 'REVERSE' (월급 기준 시급 역산) | 'FORWARD' (시급 기준 월급 산출)
  const [selectedPresetId, setSelectedPresetId] = useState('9.5h_6d');
  
  const [formData, setFormData] = useState({
    targetSalary: initialData.contract_salary || 3600000,
    hourlyWage: initialData.hourly_wage || 10320,
    baseMonthlyHours: 209,
    weeklyOvertimeHours: 5,
    weeklyHolidayHours: 9.5,
    weeklyNightHours: 0,
    positionAllowance: 0,
    carAllowance: initialData.has_car ? 200000 : 0,
    attendanceBonus: 0,
    bonus: 0,
    substituteAllowance: 0,
    hireDate: initialData.hire_date || new Date().toISOString().split('T')[0]
  });

  const [calcResult, setCalcResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // Apply preset
  const handlePresetSelect = (presetId) => {
    setSelectedPresetId(presetId);
    if (presetId === 'custom') return;
    const p = PRESETS.find(item => item.id === presetId);
    if (p) {
      setFormData(prev => ({
        ...prev,
        baseMonthlyHours: p.baseMonthlyHours,
        weeklyOvertimeHours: p.weeklyOvertimeHours,
        weeklyHolidayHours: p.weeklyHolidayHours,
        weeklyNightHours: p.weeklyNightHours
      }));
    }
  };

  // Run calculation
  useEffect(() => {
    if (!isOpen) return;
    runCalculation();
  }, [formData, calcMode, isOpen]);

  const runCalculation = async () => {
    setLoading(true);
    try {
      const payload = {
        targetSalary: Number(formData.targetSalary) || 0,
        hourlyWage: Number(formData.hourlyWage) || 10320,
        baseMonthlyHours: Number(formData.baseMonthlyHours) || 209,
        weeklyOvertimeHours: Number(formData.weeklyOvertimeHours) || 0,
        weeklyHolidayHours: Number(formData.weeklyHolidayHours) || 0,
        weeklyNightHours: Number(formData.weeklyNightHours) || 0,
        positionAllowance: Number(formData.positionAllowance) || 0,
        carAllowance: Number(formData.carAllowance) || 0,
        attendanceBonus: Number(formData.attendanceBonus) || 0,
        bonus: Number(formData.bonus) || 0,
        substituteAllowance: Number(formData.substituteAllowance) || 0,
        hireDate: formData.hireDate,
        isReverseCalculation: calcMode === 'REVERSE'
      };

      const res = await api.calculateHourlyBreakdown(payload);
      if (res.success) {
        setCalcResult(res);
      }
    } catch (err) {
      console.error('Hourly breakdown error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!calcResult) return;
    const selectedPreset = PRESETS.find(p => p.id === selectedPresetId);
    if (onApplyToEmployee) {
      onApplyToEmployee({
        contract_salary: calcMode === 'REVERSE' ? formData.targetSalary : calcResult.totalGrossPay,
        hourly_wage: calcResult.hourlyWage,
        fixed_work_hours: selectedPreset ? selectedPreset.fixedHoursStr : '10:00~22:00',
        has_car: formData.carAllowance > 0 ? 1 : 0,
        non_taxable_car: formData.carAllowance > 0 ? 1 : 0
      });
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="📊 시급계산기 & 포괄임금 수당 분할 시뮬레이터 (엑셀 산식 100% 일치)"
      maxWidth="850px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            💡 주당 환산계수 <strong>365/84 (4.345주/월)</strong> 및 최저임금법 적법성 실시간 검증
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              닫기
            </button>
            <button type="button" className="btn btn-primary" onClick={handleApply}>
              <CheckCircle size={16} /> 직원 급여 정보에 적용
            </button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Mode Selector */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <button
            type="button"
            className={`btn ${calcMode === 'REVERSE' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setCalcMode('REVERSE')}
            style={{ padding: '10px' }}
          >
            ⚡ 월 책정급여 기준 포괄 통상시급 역산
          </button>
          <button
            type="button"
            className={`btn ${calcMode === 'FORWARD' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setCalcMode('FORWARD')}
            style={{ padding: '10px' }}
          >
            💵 시급 기준 총 지급액 산출
          </button>
        </div>

        {/* Preset Selector */}
        <div className="card" style={{ padding: '14px', background: 'var(--bg-surface-elevated)' }}>
          <label className="form-label" style={{ fontWeight: '700', color: '#60a5fa', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={16} /> 근무 패턴 프리셋 선택 (엑셀 시급계산기 표준 패턴)
          </label>
          <select 
            className="form-select"
            value={selectedPresetId}
            onChange={(e) => handlePresetSelect(e.target.value)}
          >
            {PRESETS.map(p => (
              <option key={p.id} value={p.id}>
                {p.label} [소정 {p.baseMonthlyHours}h, 연장 {p.weeklyOvertimeHours}h, 휴일 {p.weeklyHolidayHours}h, 야간 {p.weeklyNightHours}h]
              </option>
            ))}
            <option value="custom">✏️ 직접 입력 (커스텀 설정)</option>
          </select>
        </div>

        {/* Inputs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          {calcMode === 'REVERSE' ? (
            <div className="form-group">
              <label className="form-label">약정 월급 (책정급여) *</label>
              <input 
                type="number"
                step="10000"
                className="form-input"
                value={formData.targetSalary}
                onChange={(e) => setFormData({ ...formData, targetSalary: parseInt(e.target.value) || 0 })}
                placeholder="3600000"
              />
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">약정 시급 (원) *</label>
              <input 
                type="number"
                min="10320"
                step="10"
                className="form-input"
                value={formData.hourlyWage}
                onChange={(e) => setFormData({ ...formData, hourlyWage: parseInt(e.target.value) || 10320 })}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">소정근로시간 (기본)</label>
            <input 
              type="number"
              className="form-input"
              value={formData.baseMonthlyHours}
              onChange={(e) => setFormData({ ...formData, baseMonthlyHours: parseFloat(e.target.value) || 209 })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">주당 연장근로시간</label>
            <input 
              type="number"
              step="0.5"
              className="form-input"
              value={formData.weeklyOvertimeHours}
              onChange={(e) => setFormData({ ...formData, weeklyOvertimeHours: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">주당 휴일근로시간</label>
            <input 
              type="number"
              step="0.5"
              className="form-input"
              value={formData.weeklyHolidayHours}
              onChange={(e) => setFormData({ ...formData, weeklyHolidayHours: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">주당 야간근로시간</label>
            <input 
              type="number"
              step="0.5"
              className="form-input"
              value={formData.weeklyNightHours}
              onChange={(e) => setFormData({ ...formData, weeklyNightHours: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">운전보조금 (비과세 20만)</label>
            <input 
              type="number"
              step="10000"
              className="form-input"
              value={formData.carAllowance}
              onChange={(e) => setFormData({ ...formData, carAllowance: parseInt(e.target.value) || 0 })}
            />
          </div>
        </div>

        {/* Results Card */}
        {calcResult && (
          <div style={{ background: 'rgba(30, 41, 59, 0.9)', border: '1px solid rgba(59, 130, 246, 0.4)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calculator size={20} color="#60a5fa" />
                <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#fff', margin: 0 }}>
                  산출 결과 (엑셀 공식 일치)
                </h4>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>통상시급:</span>
                <span className="badge badge-primary" style={{ fontSize: '14px', fontWeight: '800' }}>
                  {calcResult.hourlyWage?.toLocaleString()}원 / 시간
                </span>
              </div>
            </div>

            {/* Breakdown Table */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '14px' }}>
              <div style={{ background: 'var(--bg-surface)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>기본급여 ({calcResult.baseMonthlyHours}h)</div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: '#fff', marginTop: '2px' }}>
                  {calcResult.breakdown?.basicPay?.toLocaleString()}원
                </div>
              </div>

              <div style={{ background: 'var(--bg-surface)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>연장근로수당 (월 {calcResult.monthlyOvertimeHours}h)</div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: '#60a5fa', marginTop: '2px' }}>
                  {calcResult.breakdown?.overtimeAllowance?.toLocaleString()}원
                </div>
              </div>

              <div style={{ background: 'var(--bg-surface)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>휴일근로수당 (월 {calcResult.monthlyHolidayHours}h)</div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: '#34d399', marginTop: '2px' }}>
                  {calcResult.breakdown?.holidayAllowance?.toLocaleString()}원
                </div>
              </div>

              <div style={{ background: 'var(--bg-surface)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>야간근로수당 (월 {calcResult.monthlyNightHours}h)</div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: '#f59e0b', marginTop: '2px' }}>
                  {calcResult.breakdown?.nightAllowance?.toLocaleString()}원
                </div>
              </div>

              <div style={{ background: 'var(--bg-surface)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>연차수당 (월할 {calcResult.monthlyAnnualLeaveHours}h)</div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: '#a78bfa', marginTop: '2px' }}>
                  {calcResult.breakdown?.annualLeaveAllowance?.toLocaleString()}원
                </div>
              </div>

              {calcResult.breakdown?.carAllowance > 0 && (
                <div style={{ background: 'var(--bg-surface)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>자가운전보조금 (비과세)</div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#10b981', marginTop: '2px' }}>
                    {calcResult.breakdown?.carAllowance?.toLocaleString()}원
                  </div>
                </div>
              )}
            </div>

            {/* Total Highlight */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(59, 130, 246, 0.15)', padding: '12px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
              <div>
                <span style={{ fontSize: '13px', color: '#93c5fd', fontWeight: '600' }}>총 지급액 합계 (과세 + 비과세)</span>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>* 10원 단위 절사 처리 완료</div>
              </div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: '#60a5fa' }}>
                {calcResult.totalGrossPay?.toLocaleString()}원
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
