import React, { useState, useEffect } from 'react';
import { 
  Calculator, CheckCircle2, AlertTriangle, AlertCircle, Clock, 
  Lock, Unlock, ArrowRight, Eye, RefreshCw, FileText, TableProperties, TrendingUp 
} from 'lucide-react';
import api from '../services/api';
import Modal from '../components/Modal';

export default function PayrollCalculation({ stores, currentStoreId, setCurrentStoreId, setActiveTab }) {
  const [selectedStoreId, setSelectedStoreId] = useState(currentStoreId || (stores[0] ? stores[0].id : 1));
  const [yearMonth, setYearMonth] = useState('2026-09');
  const [runData, setRunData] = useState(null);
  const [details, setDetails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);

  // Side-by-side comparison modal state
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  // Re-open modal state
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState('');

  useEffect(() => {
    if (currentStoreId && currentStoreId !== selectedStoreId) {
      setSelectedStoreId(currentStoreId);
    }
  }, [currentStoreId]);

  useEffect(() => {
    loadPayroll();
  }, [selectedStoreId, yearMonth]);

  const loadPayroll = async () => {
    setLoading(true);
    try {
      const res = await api.getPayrollRun(selectedStoreId, yearMonth);
      if (res.success) {
        setRunData(res.run);
        setDetails(res.details);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = async (force = false) => {
    setCalculating(true);
    try {
      const res = await api.calculatePayroll(selectedStoreId, yearMonth, force);
      if (res.success) {
        setRunData(res.run);
        setDetails(res.details);
        alert(res.message || '급여 계산 및 자동 검수가 완료되었습니다.');
      }
    } catch (err) {
      if (err.message && err.message.includes('이미 [확정]')) {
        if (window.confirm('해당 월 급여는 이미 [확정]되었습니다. 재오픈 후 다시 계산하시겠습니까?')) {
          setIsReopenModalOpen(true);
        }
      } else {
        alert(err.message || '급여 계산 실패');
      }
    } finally {
      setCalculating(false);
    }
  };

  const handleToggleInspect = async (detailId, currentStatus) => {
    try {
      await api.checkEmployee(detailId, !currentStatus);
      setDetails(prev => prev.map(d => d.id === detailId ? { ...d, inspected: !currentStatus ? 1 : 0 } : d));
    } catch (err) {
      alert(err.message || '검수 상태 변경 실패');
    }
  };

  const handleCheckAll = async (status) => {
    if (!runData) return;
    try {
      await api.checkAllEmployees(runData.id, status);
      setDetails(prev => prev.map(d => ({ ...d, inspected: status ? 1 : 0 })));
    } catch (err) {
      alert(err.message || '일괄 검수 변경 실패');
    }
  };

  const handleConfirmPayroll = async () => {
    if (!runData) return;
    const allChecked = details.length > 0 && details.every(d => d.inspected === 1);
    if (!allChecked) {
      alert('모든 직원의 검수 확인 체크를 완료해야 급여를 확정할 수 있습니다.');
      return;
    }

    if (!window.confirm(`[${yearMonth}] 급여를 최종 확정하시겠습니까?\n확정 후에는 수정이 잠기며 급여명세서 및 임금대장이 정식 발급됩니다.`)) {
      return;
    }

    try {
      const res = await api.confirmPayroll(runData.id);
      if (res.success) {
        setRunData(res.run);
        alert(res.message || '급여가 최종 확정되었습니다.');
      }
    } catch (err) {
      alert(err.message || '급여 확정 실패');
    }
  };

  const handleExecuteReopen = async () => {
    if (!reopenReason.trim()) {
      alert('재오픈 사유를 반드시 입력해주세요.');
      return;
    }
    try {
      const res = await api.reopenPayroll(runData.id, reopenReason);
      if (res.success) {
        setRunData(res.run);
        setIsReopenModalOpen(false);
        setReopenReason('');
        alert(res.message || '급여가 재오픈되었습니다. 다시 검수 및 수정을 진행할 수 있습니다.');
        loadPayroll();
      }
    } catch (err) {
      alert(err.message || '재오픈 실패');
    }
  };

  const openComparisonModal = (item) => {
    let breakdown = item.calculation_breakdown;
    if (typeof breakdown === 'string') {
      try {
        breakdown = JSON.parse(breakdown);
      } catch (e) {
        breakdown = {};
      }
    }
    setSelectedDetail({
      ...item,
      calculation_breakdown: breakdown || {}
    });
    setIsCompareModalOpen(true);
  };

  const isConfirmed = runData && runData.status === 'CONFIRMED';
  const inspectedCount = details.filter(d => d.inspected === 1).length;
  const allInspected = details.length > 0 && inspectedCount === details.length;
  const totalWarningCount = details.reduce((acc, d) => acc + (d.inspection_warnings ? d.inspection_warnings.length : 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calculator size={22} color="#3b82f6" /> 월별 급여 자동 계산 & 필수 검수
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            근태 데이터를 기반으로 통상임금, 수당, 4대보험, 소득세를 산출하고 6대 검증 규칙으로 검수한 뒤 최종 확정합니다.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <select 
            className="form-select" 
            value={selectedStoreId} 
            onChange={(e) => {
              const sid = Number(e.target.value);
              setSelectedStoreId(sid);
              setCurrentStoreId(sid);
            }}
            style={{ width: 'auto', minWidth: '160px' }}
          >
            {stores.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          <input 
            type="month"
            className="form-input"
            value={yearMonth}
            onChange={(e) => setYearMonth(e.target.value)}
            style={{ width: 'auto' }}
          />

          {!isConfirmed ? (
            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={() => handleCalculate(false)}
              disabled={calculating}
            >
              <RefreshCw size={15} className={calculating ? 'spin' : ''} />
              {calculating ? '급여 계산 및 검증 중...' : '급여 계산 실행'}
            </button>
          ) : (
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => setIsReopenModalOpen(true)}
            >
              <Unlock size={15} color="#fbbf24" /> 확정 급여 재오픈 (수정)
            </button>
          )}
        </div>
      </div>

      {/* Run Status Banner */}
      {runData ? (
        <div className="card" style={{ 
          background: isConfirmed 
            ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(19, 27, 46, 0.95))' 
            : 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(19, 27, 46, 0.95))',
          border: isConfirmed ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(245, 158, 11, 0.4)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#fff' }}>
                  {yearMonth} 급여 관리 상태:
                </h3>
                {isConfirmed ? (
                  <span className="badge badge-success" style={{ fontSize: '13px', padding: '4px 10px' }}>
                    <CheckCircle2 size={14} /> 급여 최종 확정 완료 (잠금 상태)
                  </span>
                ) : (
                  <span className="badge badge-warning" style={{ fontSize: '13px', padding: '4px 10px' }}>
                    <Clock size={14} /> 검수 대기 중 ({inspectedCount}/{details.length}명 확인 완료)
                  </span>
                )}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {isConfirmed 
                  ? `확정 일시: ${runData.confirmed_at} (확정자: ${runData.confirmed_by || '대표자'})`
                  : '자동 검증 경고 및 지난달 비교 내역을 확인한 뒤 전체 직원을 검수 체크하면 최종 확정이 가능합니다.'}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>지급총액</div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#60a5fa' }} className="num-font">
                  {(runData.total_gross_pay || 0).toLocaleString()}원
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>공제총액</div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#f87171' }} className="num-font">
                  {(runData.total_deductions || 0).toLocaleString()}원
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>실지급액 합계</div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: '#34d399' }} className="num-font">
                  {(runData.total_net_pay || 0).toLocaleString()}원
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <AlertCircle size={36} color="#60a5fa" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '17px', color: '#fff', marginBottom: '6px' }}>
            {yearMonth} 급여 계산 내역이 없습니다.
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            우측 상단의 <strong>[급여 계산 실행]</strong> 버튼을 누르면 이번 달 근태 데이터를 기반으로 급여가 자동 계산됩니다.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => handleCalculate(false)}>
            급여 계산 실행하기
          </button>
        </div>
      )}

      {/* Inspection Actions & 6-Rule Verification Box */}
      {details.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: '700' }}>
              검수 진행률: <strong style={{ color: allInspected ? '#34d399' : '#fbbf24' }}>{inspectedCount}</strong> / {details.length}명
            </span>
            {totalWarningCount > 0 && (
              <span className="badge badge-danger" style={{ fontSize: '12px' }}>
                <AlertTriangle size={13} /> {totalWarningCount}건의 검증 경고 감지
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {!isConfirmed && (
              <>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleCheckAll(true)}>
                  전체 검수 완료 체크
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleCheckAll(false)}>
                  전체 검수 체크 해제
                </button>
                <button 
                  type="button" 
                  className="btn btn-success btn-sm" 
                  onClick={handleConfirmPayroll}
                  disabled={!allInspected}
                  title={!allInspected ? '모든 직원을 검수 체크해야 확정할 수 있습니다' : '급여 최종 확정'}
                >
                  <Lock size={14} /> 급여 최종 확정 (잠금)
                </button>
              </>
            )}

            {isConfirmed && (
              <>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setActiveTab('wageLedger')}>
                  <TableProperties size={14} /> 임금대장 발급
                </button>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setActiveTab('payslips')}>
                  <FileText size={14} /> 급여명세서 발급
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Inspection Details Table */}
      {details.length > 0 && (
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div className="table-container" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>검수</th>
                  <th>직원 성명 / 직위</th>
                  <th>고용 / 급여</th>
                  <th>기본급</th>
                  <th>수당 합계</th>
                  <th>지급총액</th>
                  <th>4대보험</th>
                  <th>소득세/지방세</th>
                  <th>공제총액</th>
                  <th>실지급액 (차인)</th>
                  <th>자동 검증 경고 & 전월 비교</th>
                  <th>상세</th>
                </tr>
              </thead>
              <tbody>
                {details.map(item => {
                  const warnings = item.inspection_warnings || [];
                  const comp = item.comparison_data || {};
                  const allowancesSum = (item.total_gross_pay || 0) - (item.basic_pay || 0);
                  const fourInsSum = (item.national_pension || 0) + (item.health_insurance || 0) + (item.longterm_care || 0) + (item.employment_insurance || 0);
                  const taxSum = (item.income_tax || 0) + (item.local_income_tax || 0);

                  return (
                    <tr 
                      key={item.id}
                      style={{
                        background: item.inspected ? 'rgba(16, 185, 129, 0.03)' : (warnings.length > 0 ? 'rgba(239, 68, 68, 0.05)' : 'transparent'),
                        borderLeft: warnings.length > 0 ? '3px solid #ef4444' : (item.inspected ? '3px solid #10b981' : '3px solid transparent')
                      }}
                    >
                      <td style={{ textAlign: 'center' }}>
                        <input 
                          type="checkbox" 
                          checked={item.inspected === 1}
                          onChange={() => handleToggleInspect(item.id, item.inspected === 1)}
                          disabled={isConfirmed}
                          style={{ width: '16px', height: '16px', cursor: isConfirmed ? 'not-allowed' : 'pointer' }}
                        />
                      </td>
                      <td>
                        <div style={{ fontWeight: '700', color: '#fff' }}>{item.employee_name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.position || '직원'}</div>
                        {item.calculation_breakdown && item.calculation_breakdown.summary && item.calculation_breakdown.summary.workingDaysCount > 0 ? (
                          <span className="badge badge-primary" style={{ fontSize: '10px', marginTop: '3px', padding: '1px 6px' }}>
                            근태 {item.calculation_breakdown.summary.workingDaysCount}일 ({item.calculation_breakdown.summary.totalNetHours}시간)
                          </span>
                        ) : (
                          <span className="badge badge-neutral" style={{ fontSize: '10px', marginTop: '3px', padding: '1px 6px' }}>
                            근태 미입력
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '3px' }}>
                          <span className={`badge ${item.wage_type === 'HOURLY' ? 'badge-primary' : 'badge-purple'}`} style={{ fontSize: '10px' }}>
                            {item.wage_type === 'HOURLY' ? '시급제' : '월급제'}
                          </span>
                          {item.is_dual_reporting === 1 && (
                            <span className="badge badge-warning" style={{ fontSize: '10px' }}>이중신고</span>
                          )}
                        </div>
                      </td>
                      <td className="num-font" style={{ fontWeight: '600' }}>
                        {(item.basic_pay || 0).toLocaleString()}원
                      </td>
                      <td className="num-font" style={{ color: '#60a5fa' }}>
                        {allowancesSum.toLocaleString()}원
                      </td>
                      <td className="num-font" style={{ fontWeight: '700', color: '#fff' }}>
                        {(item.total_gross_pay || 0).toLocaleString()}원
                      </td>
                      <td className="num-font" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {fourInsSum.toLocaleString()}원
                      </td>
                      <td className="num-font" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {taxSum.toLocaleString()}원
                      </td>
                      <td className="num-font" style={{ color: '#f87171' }}>
                        {(item.total_deductions || 0).toLocaleString()}원
                      </td>
                      <td className="num-font" style={{ fontWeight: '800', color: '#34d399', fontSize: '14px' }}>
                        {(item.net_pay || 0).toLocaleString()}원
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {warnings.length > 0 ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f87171', fontSize: '11.5px', fontWeight: '700' }}>
                              <AlertCircle size={13} />
                              <span>{warnings[0]} {warnings.length > 1 ? `외 ${warnings.length - 1}건` : ''}</span>
                            </div>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#34d399' }}>✓ 정상 검증 통과</span>
                          )}

                          {comp.hasPrevMonth && (
                            <div style={{ fontSize: '11px', color: comp.isSignificantChange ? '#f59e0b' : 'var(--text-muted)' }}>
                              전월 대비: {comp.diffPercent > 0 ? `+${comp.diffPercent}%` : `${comp.diffPercent}%`}
                              {comp.isSignificantChange && ' (±30% 변동)'}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <button 
                          type="button" 
                          className="btn btn-secondary btn-sm"
                          onClick={() => openComparisonModal(item)}
                          title="산출식 및 전월 비교 상세"
                        >
                          <Eye size={13} /> 상세
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Side-by-Side Comparison & Natural Language Formula Modal */}
      <Modal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        size="large"
        title={`급여 산출식 및 전월 비교: ${selectedDetail ? selectedDetail.employee_name : ''}`}
        footer={
          <button type="button" className="btn btn-secondary" onClick={() => setIsCompareModalOpen(false)}>
            닫기
          </button>
        }
      >
        {selectedDetail && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Top comparison stats */}
            {selectedDetail.comparison_data && selectedDetail.comparison_data.hasPrevMonth && (
              <div style={{ 
                background: selectedDetail.comparison_data.isSignificantChange ? 'var(--warning-bg)' : 'var(--bg-surface-elevated)', 
                border: selectedDetail.comparison_data.isSignificantChange ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-subtle)',
                padding: '14px', 
                borderRadius: 'var(--radius-md)' 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '700', color: selectedDetail.comparison_data.isSignificantChange ? '#fbbf24' : '#fff' }}>
                    📊 전월 대비 지급총액 변동 분석
                  </span>
                  <span className={`badge ${selectedDetail.comparison_data.isSignificantChange ? 'badge-warning' : 'badge-neutral'}`}>
                    전월 대비 {selectedDetail.comparison_data.diffPercent > 0 ? `+${selectedDetail.comparison_data.diffPercent}%` : `${selectedDetail.comparison_data.diffPercent}%`}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '20px', marginTop: '8px', fontSize: '13px' }}>
                  <div>지난달 지급총액: <strong>{(selectedDetail.comparison_data.prevGrossPay || 0).toLocaleString()}원</strong></div>
                  <div>이번달 지급총액: <strong>{(selectedDetail.total_gross_pay || 0).toLocaleString()}원</strong></div>
                  <div>차액: <strong>{(selectedDetail.comparison_data.diffGrossPay || 0).toLocaleString()}원</strong></div>
                </div>
              </div>
            )}

            {/* Validation Warnings List */}
            {selectedDetail.inspection_warnings && selectedDetail.inspection_warnings.length > 0 && (
              <div style={{ background: 'var(--danger-bg)', border: '1px solid rgba(239, 68, 68, 0.4)', padding: '14px', borderRadius: 'var(--radius-md)' }}>
                <h4 style={{ color: '#f87171', fontSize: '13px', fontWeight: '700', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={15} /> 검증 경고 항목
                </h4>
                <ul style={{ paddingLeft: '20px', color: '#fca5a5', fontSize: '12px' }}>
                  {selectedDetail.inspection_warnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Natural Sentence Formulas Breakdown */}
            <div style={{ background: 'var(--bg-surface-elevated)', padding: '18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#60a5fa', marginBottom: '12px' }}>
                📝 항목별 법정 산출식 및 산출 방법
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12.5px', color: '#cbd5e1' }}>
                <div style={{ padding: '8px 12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)' }}>
                  <strong>기본급:</strong> {selectedDetail.calculation_breakdown?.basicPayExplanation || `${(selectedDetail.basic_pay || 0).toLocaleString()}원`}
                </div>

                <div style={{ padding: '8px 12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)' }}>
                  <strong>연장근로수당:</strong> {selectedDetail.calculation_breakdown?.overtimeExplanation || '-'}
                </div>

                <div style={{ padding: '8px 12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)' }}>
                  <strong>야간근로수당:</strong> {selectedDetail.calculation_breakdown?.nightExplanation || '-'}
                </div>

                <div style={{ padding: '8px 12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)' }}>
                  <strong>주말휴일수당:</strong> {selectedDetail.calculation_breakdown?.holidayExplanation || '-'}
                </div>

                <div style={{ padding: '8px 12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)' }}>
                  <strong>법정공휴일수당:</strong> {selectedDetail.calculation_breakdown?.pubHolidayExplanation || '-'}
                </div>

                {selectedDetail.wage_type === 'HOURLY' && (
                  <div style={{ padding: '8px 12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)' }}>
                    <strong>주휴수당:</strong> {selectedDetail.calculation_breakdown?.weeklyHolidayExplanation || '-'}
                  </div>
                )}

                {selectedDetail.annual_leave_allowance > 0 && (
                  <div style={{ padding: '8px 12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)' }}>
                    <strong>연차수당:</strong> {selectedDetail.calculation_breakdown?.annualLeaveExplanation || '-'}
                  </div>
                )}
              </div>
            </div>

            {/* Dual Reporting Breakdown if active */}
            {selectedDetail.is_dual_reporting === 1 && (
              selectedDetail.payslip_display_mode === 'SPLIT_PAY' ? (
                <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#60a5fa', marginBottom: '8px' }}>
                    ⚡ 이중신고 구조: 2개 계좌 분리 지급 방식
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                    <div style={{ background: 'var(--bg-surface)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>사업자통장 지급분 (신고기준 세후):</span><br />
                      <strong style={{ fontSize: '16px', color: '#60a5fa' }}>{(selectedDetail.biz_account_pay || 0).toLocaleString()}원</strong>
                    </div>
                    <div style={{ background: 'var(--bg-surface)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>개인통장 지급분 (미신고차액 세후):</span><br />
                      <strong style={{ fontSize: '16px', color: '#34d399' }}>{(selectedDetail.personal_account_pay || 0).toLocaleString()}원</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '14px 16px', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <h4 style={{ fontSize: '13.5px', fontWeight: '700', color: '#34d399' }}>
                        ⚡ 이중신고 구조: 단일 계좌 지급 ('미신고공제' 한 줄 처리 방식)
                      </h4>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        통장 분리 없이 전액 단일 계좌로 지급되며, 미신고차액에 대한 원천공제는 공제내역에 단일 항목으로 처리됩니다.
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>미신고차액 공제액 (10%):</span><br />
                      <strong style={{ fontSize: '15px', color: '#f87171' }}>-{(selectedDetail.unreported_diff_deduction || 0).toLocaleString()}원</strong>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </Modal>

      {/* Re-Open Modal */}
      <Modal
        isOpen={isReopenModalOpen}
        onClose={() => setIsReopenModalOpen(false)}
        title="확정 급여 재오픈 (수정)"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setIsReopenModalOpen(false)}>취소</button>
            <button type="button" className="btn btn-warning" onClick={handleExecuteReopen}>
              <Unlock size={14} /> 급여 재오픈 실행
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            확정된 급여를 재오픈하면 근태나 수당을 수정한 뒤 다시 검수 및 확정을 진행할 수 있습니다. 
            재오픈 사유는 감사 로그(Audit Log)에 기록됩니다.
          </p>

          <div className="form-group">
            <label className="form-label">재오픈 사유 입력 (필수) *</label>
            <textarea 
              className="form-textarea" 
              rows="3" 
              value={reopenReason} 
              onChange={(e) => setReopenReason(e.target.value)} 
              placeholder="예: 김철수 점장 8월 25일 야간 대체근무 근태 누락분 반영" 
              required 
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
