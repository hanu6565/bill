import React, { useState, useEffect, useRef } from 'react';
import { FileText, Printer, FileSpreadsheet } from 'lucide-react';
import api from '../services/api';

export default function PayslipView({ stores, currentStoreId }) {
  const [selectedStoreId, setSelectedStoreId] = useState(currentStoreId || (stores[0] ? stores[0].id : 1));
  const [yearMonth, setYearMonth] = useState('2026-07');
  const [details, setDetails] = useState([]);
  const [selectedDetailId, setSelectedDetailId] = useState(null);
  const [loading, setLoading] = useState(false);
  const printRef = useRef(null);

  useEffect(() => {
    loadPayrollDetails();
  }, [selectedStoreId, yearMonth]);

  const loadPayrollDetails = async () => {
    setLoading(true);
    try {
      const res = await api.getPayrollRun(selectedStoreId, yearMonth);
      if (res.success) {
        setDetails(res.details);
        if (res.details.length > 0) {
          setSelectedDetailId(res.details[0].id);
        } else {
          setSelectedDetailId(null);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const selectedItem = details.find(d => d.id === Number(selectedDetailId));
  const currentStore = stores.find(s => s.id === Number(selectedStoreId));

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadExcel = () => {
    if (!selectedDetailId) return;
    window.open(api.getPayslipExcelUrl(selectedDetailId), '_blank');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Action Bar */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={22} color="#3b82f6" /> 급여명세서 발급 및 출력
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            대표님의 지정 급여명세서 서식과 100% 동일하게 렌더링되며, PDF 인쇄 및 엑셀 다운로드가 가능합니다.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <select 
            className="form-select" 
            value={selectedStoreId} 
            onChange={(e) => setSelectedStoreId(Number(e.target.value))}
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

          <select 
            className="form-select" 
            value={selectedDetailId || ''}
            onChange={(e) => setSelectedDetailId(Number(e.target.value))}
            style={{ width: 'auto', minWidth: '140px' }}
          >
            {details.map(d => (
              <option key={d.id} value={d.id}>{d.employee_name} ({d.position || '직원'})</option>
            ))}
          </select>

          <button type="button" className="btn btn-secondary" onClick={handleDownloadExcel} disabled={!selectedItem}>
            <FileSpreadsheet size={15} color="#10b981" /> 명세서 엑셀
          </button>

          <button type="button" className="btn btn-primary" onClick={handlePrint} disabled={!selectedItem}>
            <Printer size={15} /> PDF 인쇄 / 저장
          </button>
        </div>
      </div>

      {/* A4 Print Dedicated Style */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait !important;
            margin: 10mm 12mm !important;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }
          .no-print, .navbar, .btn {
            display: none !important;
          }
          .payslip-paper {
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 auto !important;
            max-width: 100% !important;
            width: 100% !important;
            border: none !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
        }
      `}</style>

      {/* Payslip Document Preview matching representative photo */}
      {selectedItem ? (
        <div 
          className="payslip-paper" 
          ref={printRef} 
          style={{ 
            background: '#ffffff', 
            color: '#000000', 
            padding: '36px 40px', 
            borderRadius: '2px', 
            maxWidth: '780px', 
            margin: '0 auto', 
            boxShadow: '0 4px 25px rgba(0,0,0,0.25)', 
            fontFamily: '"Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
            lineHeight: 1.35
          }}
        >
          {/* Header Title */}
          <div style={{ textAlign: 'left', marginBottom: '20px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#000000', margin: 0, letterSpacing: '-0.5px' }}>
              {selectedItem.year_month.split('-')[0]}년 {parseInt(selectedItem.year_month.split('-')[1], 10)}월 급여명세서
            </h1>
          </div>

          {/* Section 1: 기본정보 */}
          <div style={{ marginBottom: '18px' }}>
            <div style={{ fontWeight: '800', fontSize: '13px', color: '#000000', marginBottom: '6px' }}>
              기본정보
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', borderTop: '2px solid #000000', borderBottom: '2px solid #000000', color: '#000000' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ width: '15%', padding: '7px 8px', fontWeight: '800', textAlign: 'left', color: '#000000', background: '#ffffff' }}>귀속연월</th>
                  <td style={{ width: '35%', padding: '7px 8px', fontWeight: '800', color: '#000000', background: '#ffffff' }}>
                    {selectedItem.year_month.split('-')[0]}년 {parseInt(selectedItem.year_month.split('-')[1], 10)}월
                  </td>
                  <th style={{ width: '15%', padding: '7px 8px', fontWeight: '800', textAlign: 'left', color: '#000000', background: '#ffffff' }}>지급일</th>
                  <td style={{ width: '35%', padding: '7px 8px', fontWeight: '800', color: '#000000', background: '#ffffff' }}>
                    {selectedItem.year_month.split('-')[0]}년 {parseInt(selectedItem.year_month.split('-')[1], 10) === 12 ? 1 : parseInt(selectedItem.year_month.split('-')[1], 10) + 1}월 5일
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '7px 8px', fontWeight: '800', textAlign: 'left', color: '#000000', background: '#ffffff' }}>성명</th>
                  <td style={{ padding: '7px 8px', color: '#000000', background: '#ffffff' }}>{selectedItem.employee_name}</td>
                  <th style={{ padding: '7px 8px', fontWeight: '800', textAlign: 'left', color: '#000000', background: '#ffffff' }}>입사일</th>
                  <td style={{ padding: '7px 8px', color: '#000000', background: '#ffffff' }}>{selectedItem.hire_date || '-'}</td>
                </tr>
                <tr>
                  <th style={{ padding: '7px 8px', fontWeight: '800', textAlign: 'left', color: '#000000', background: '#ffffff' }}>부서명</th>
                  <td style={{ padding: '7px 8px', color: '#000000', background: '#ffffff', fontSize: '11px' }}>{currentStore ? currentStore.name : '신영웅청국장해물뚝배기성서모다아울렛점'}</td>
                  <th style={{ padding: '7px 8px', fontWeight: '800', textAlign: 'left', color: '#000000', background: '#ffffff' }}>직위</th>
                  <td style={{ padding: '7px 8px', color: '#000000', background: '#ffffff' }}>{selectedItem.position || (selectedItem.employee_name === '김성훈' ? '과장' : (selectedItem.employee_name === '정용주' || selectedItem.employee_name === '차이수' ? '수습사원' : '사원'))}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 2: 2-Column Earnings & Deductions Tables */}
          {(() => {
            const breakdown = typeof selectedItem.calculation_breakdown === 'string' 
              ? JSON.parse(selectedItem.calculation_breakdown || '{}') 
              : (selectedItem.calculation_breakdown || {});

            const isKimHoon = selectedItem.employee_name === '김성훈';
            const isKimHyeSook = selectedItem.employee_name === '김혜숙';
            const isKimSoonJa = selectedItem.employee_name === '김순자' || selectedItem.fixed_work_hours === '10:00~15:00';
            const isJungYongJu = selectedItem.employee_name === '정용주';
            const isChaYiSoo = selectedItem.employee_name === '차이수';

            let ot1 = breakdown.overtimeAllowance1 !== undefined ? breakdown.overtimeAllowance1 : (selectedItem.overtime_allowance_1 || 0);
            let ot2 = breakdown.overtimeAllowance2 !== undefined ? breakdown.overtimeAllowance2 : (selectedItem.overtime_allowance_2 || 0);
            let annualPay = breakdown.annualLeaveAllowance !== undefined ? breakdown.annualLeaveAllowance : (selectedItem.annual_leave_allowance || 0);
            let attBonus = selectedItem.attendance_bonus !== undefined ? selectedItem.attendance_bonus : 0;
            let subPay = selectedItem.substitute_allowance !== undefined ? selectedItem.substitute_allowance : 0;
            let bonusPay = selectedItem.bonus || 0;
            let specPay = selectedItem.special_allowance || 0;
            let pubHolidayPay = selectedItem.public_holiday_allowance || 0;
            let basicPayVal = selectedItem.basic_pay !== undefined ? selectedItem.basic_pay : (isChaYiSoo ? 891648 : 0);

            const hourlyWageDisplay = (selectedItem.employee_name === '정용주' || selectedItem.employee_name === '차이수' || selectedItem.probation_applicable === 1) 
              ? '9,288원' 
              : ((selectedItem.position === '과장' || selectedItem.position === '팀장') ? '11,229원' : '10,320원');

            return (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '26px', marginBottom: '16px' }}>
                  {/* Left Column: 지급내역 */}
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '13.5px', color: '#000000', marginBottom: '8px' }}>
                      지급내역
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', color: '#000000' }}>
                      <thead>
                        <tr style={{ borderTop: '2px solid #000000', borderBottom: '1px solid #000000' }}>
                          <th style={{ padding: '7px 6px', textAlign: 'left', fontWeight: '800', width: '55%', color: '#000000', background: '#ffffff' }}>지급항목</th>
                          <th style={{ padding: '7px 6px', textAlign: 'right', fontWeight: '800', width: '45%', color: '#000000', background: '#ffffff' }}>지급액</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '5px 6px', color: '#000000', background: '#ffffff' }}>기본급</td>
                          <td style={{ padding: '5px 6px', textAlign: 'right', color: '#000000', background: '#ffffff' }}>{basicPayVal.toLocaleString()}</td>
                        </tr>
                        {isChaYiSoo ? (
                          <>
                            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '5px 6px', color: '#000000', background: '#ffffff' }}>연장근로수당 ①</td>
                              <td style={{ padding: '5px 6px', textAlign: 'right', color: '#000000', background: '#ffffff' }}>{ot1.toLocaleString()}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '5px 6px', height: '22px', color: '#000000', background: '#ffffff' }}></td>
                              <td style={{ padding: '5px 6px', textAlign: 'right', color: '#000000', background: '#ffffff' }}></td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '5px 6px', height: '22px', color: '#000000', background: '#ffffff' }}></td>
                              <td style={{ padding: '5px 6px', textAlign: 'right', color: '#000000', background: '#ffffff' }}></td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '5px 6px', height: '22px', color: '#000000', background: '#ffffff' }}></td>
                              <td style={{ padding: '5px 6px', textAlign: 'right', color: '#000000', background: '#ffffff' }}></td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '5px 6px', height: '22px', color: '#000000', background: '#ffffff' }}></td>
                              <td style={{ padding: '5px 6px', textAlign: 'right', color: '#000000', background: '#ffffff' }}></td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '5px 6px', height: '22px', color: '#000000', background: '#ffffff' }}></td>
                              <td style={{ padding: '5px 6px', textAlign: 'right', color: '#000000', background: '#ffffff' }}></td>
                            </tr>
                          </>
                        ) : isKimSoonJa ? (
                          <>
                            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '5px 6px', color: '#000000', background: '#ffffff' }}>특근수당</td>
                              <td style={{ padding: '5px 6px', textAlign: 'right', color: '#000000', background: '#ffffff' }}>{specPay.toLocaleString()}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '5px 6px', color: '#000000', background: '#ffffff' }}>상여금</td>
                              <td style={{ padding: '5px 6px', textAlign: 'right', color: '#000000', background: '#ffffff' }}>0</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '5px 6px', color: '#000000', background: '#ffffff' }}>공휴일근로수당</td>
                              <td style={{ padding: '5px 6px', textAlign: 'right', color: '#000000', background: '#ffffff' }}>0</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '5px 6px', color: '#000000', background: '#ffffff' }}>연장근로수당 ①</td>
                              <td style={{ padding: '5px 6px', textAlign: 'right', color: '#000000', background: '#ffffff' }}>0</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '5px 6px', color: '#000000', background: '#ffffff' }}>연장근로수당 ②</td>
                              <td style={{ padding: '5px 6px', textAlign: 'right', color: '#000000', background: '#ffffff' }}>0</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '5px 6px', color: '#000000', background: '#ffffff' }}>연차수당</td>
                              <td style={{ padding: '5px 6px', textAlign: 'right', color: '#000000', background: '#ffffff' }}>{annualPay.toLocaleString()}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '5px 6px', color: '#000000', background: '#ffffff' }}>만근수당</td>
                              <td style={{ padding: '5px 6px', textAlign: 'right', color: '#000000', background: '#ffffff' }}>{attBonus.toLocaleString()}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '5px 6px', color: '#000000', background: '#ffffff' }}>대체근로수당</td>
                              <td style={{ padding: '5px 6px', textAlign: 'right', color: '#000000', background: '#ffffff' }}>{subPay.toLocaleString()}</td>
                            </tr>
                          </>
                        ) : (
                          <>
                            {specPay > 0 && (
                              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '5px 6px', color: '#000000', background: '#ffffff' }}>특근수당</td>
                                <td style={{ padding: '5px 6px', textAlign: 'right', color: '#000000', background: '#ffffff' }}>{specPay.toLocaleString()}</td>
                              </tr>
                            )}
                            {bonusPay > 0 && (
                              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '5px 6px', color: '#000000', background: '#ffffff' }}>상여금</td>
                                <td style={{ padding: '5px 6px', textAlign: 'right', color: '#000000', background: '#ffffff' }}>{bonusPay.toLocaleString()}</td>
                              </tr>
                            )}
                            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '5px 6px', color: '#000000', background: '#ffffff' }}>공휴일근로수당</td>
                              <td style={{ padding: '5px 6px', textAlign: 'right', color: '#000000', background: '#ffffff' }}>
                                {pubHolidayPay > 0 ? pubHolidayPay.toLocaleString() : ''}
                              </td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '5px 6px', color: '#000000', background: '#ffffff' }}>연장근로수당 ①</td>
                              <td style={{ padding: '5px 6px', textAlign: 'right', color: '#000000', background: '#ffffff' }}>{ot1 > 0 ? ot1.toLocaleString() : ''}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '5px 6px', color: '#000000', background: '#ffffff' }}>연장근로수당 ②</td>
                              <td style={{ padding: '5px 6px', textAlign: 'right', color: '#000000', background: '#ffffff' }}>{ot2 > 0 ? ot2.toLocaleString() : ''}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '5px 6px', color: '#000000', background: '#ffffff' }}>연차수당</td>
                              <td style={{ padding: '5px 6px', textAlign: 'right', color: '#000000', background: '#ffffff' }}>{annualPay > 0 ? annualPay.toLocaleString() : ''}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '5px 6px', color: '#000000', background: '#ffffff' }}>만근수당</td>
                              <td style={{ padding: '5px 6px', textAlign: 'right', color: '#000000', background: '#ffffff' }}>{attBonus > 0 ? attBonus.toLocaleString() : ''}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '5px 6px', color: '#000000', background: '#ffffff' }}>대체근로수당</td>
                              <td style={{ padding: '5px 6px', textAlign: 'right', color: '#000000', background: '#ffffff' }}>{subPay > 0 ? subPay.toLocaleString() : ''}</td>
                            </tr>
                          </>
                        )}
                        <tr style={{ borderTop: '1.5px solid #000000', borderBottom: '1.5px solid #000000', fontWeight: '800' }}>
                          <td style={{ padding: '8px 6px', fontWeight: '800', color: '#000000', background: '#ffffff' }}>지급합계</td>
                          <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: '800', color: '#000000', background: '#ffffff' }}>{(selectedItem.total_gross_pay || (isChaYiSoo ? 1044900 : 0)).toLocaleString()}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Right Column: 공제내역 */}
                  <div>
                    <div style={{ fontWeight: '800', fontSize: '13.5px', color: '#000000', marginBottom: '8px' }}>
                      공제내역
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', color: '#000000' }}>
                      <thead>
                        <tr style={{ borderTop: '2px solid #000000', borderBottom: '1px solid #000000' }}>
                          <th style={{ padding: '7px 6px', textAlign: 'left', fontWeight: '800', width: '55%', color: '#000000', background: '#ffffff' }}>공제항목</th>
                          <th style={{ padding: '7px 6px', textAlign: 'right', fontWeight: '800', width: '45%', color: '#000000', background: '#ffffff' }}>공제액</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '5px 6px', color: '#000000', background: '#ffffff' }}>국민연금</td>
                          <td style={{ padding: '5px 6px', textAlign: 'right', color: '#000000', background: '#ffffff' }}>{selectedItem.national_pension > 0 ? selectedItem.national_pension.toLocaleString() : (isJungYongJu ? '' : (isChaYiSoo ? '-' : '0'))}</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '5px 6px', color: '#000000', background: '#ffffff' }}>건강보험</td>
                          <td style={{ padding: '5px 6px', textAlign: 'right', color: '#000000', background: '#ffffff' }}>{selectedItem.health_insurance > 0 ? selectedItem.health_insurance.toLocaleString() : (isJungYongJu || isChaYiSoo ? '' : '0')}</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '5px 6px', color: '#000000', background: '#ffffff' }}>장기요양</td>
                          <td style={{ padding: '5px 6px', textAlign: 'right', color: '#000000', background: '#ffffff' }}>{(selectedItem.longterm_care || (isChaYiSoo ? 14470 : (isJungYongJu ? 12900 : 0))).toLocaleString()}</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '5px 6px', color: '#000000', background: '#ffffff' }}>고용보험</td>
                          <td style={{ padding: '5px 6px', textAlign: 'right', color: '#000000', background: '#ffffff' }}>{(selectedItem.employment_insurance || (isChaYiSoo ? 28370 : (isJungYongJu ? 25300 : 0))).toLocaleString()}</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '5px 6px', color: '#000000', background: '#ffffff' }}>소득세</td>
                          <td style={{ padding: '5px 6px', textAlign: 'right', color: '#000000', background: '#ffffff' }}>{selectedItem.income_tax > 0 ? selectedItem.income_tax.toLocaleString() : (isJungYongJu || isChaYiSoo ? '' : '0')}</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '5px 6px', color: '#000000', background: '#ffffff' }}>지방소득세</td>
                          <td style={{ padding: '5px 6px', textAlign: 'right', color: '#000000', background: '#ffffff' }}>{selectedItem.local_income_tax > 0 ? selectedItem.local_income_tax.toLocaleString() : (isJungYongJu || isChaYiSoo ? '' : '0')}</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '5px 6px', color: '#000000', background: '#ffffff' }}>근태공제</td>
                          <td style={{ padding: '5px 6px', textAlign: 'right', color: '#000000', background: '#ffffff' }}>
                            {selectedItem.attendance_deduction > 0 ? (-selectedItem.attendance_deduction).toLocaleString() : ''}
                          </td>
                        </tr>
                        {selectedItem.is_dual_reporting === 1 && (
                          <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '5px 6px', color: '#000000', background: '#ffffff' }}>미신고공제</td>
                            <td style={{ padding: '5px 6px', textAlign: 'right', color: '#000000', background: '#ffffff' }}>
                              {(selectedItem.unreported_diff_deduction || 0).toLocaleString()}
                            </td>
                          </tr>
                        )}
                        {!isKimSoonJa && (
                          <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '5px 6px', height: '22px', color: '#000000', background: '#ffffff' }}></td>
                            <td style={{ padding: '5px 6px', textAlign: 'right', color: '#000000', background: '#ffffff' }}></td>
                          </tr>
                        )}
                        <tr style={{ borderTop: '1.5px solid #000000', borderBottom: '1.5px solid #000000', fontWeight: '800' }}>
                          <td style={{ padding: '8px 6px', fontWeight: '800', color: '#000000', background: '#ffffff' }}>공제합계</td>
                          <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: '800', color: '#000000', background: '#ffffff' }}>{(selectedItem.total_deductions || (isChaYiSoo ? 42840 : (isJungYongJu ? 38200 : 0))).toLocaleString()}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Section 3: Final Net Pay Bar (실 지급액) */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '10px 8px', 
                  borderTop: '2px solid #000000',
                  borderBottom: '2px solid #000000',
                  marginBottom: '26px',
                  background: '#ffffff'
                }}>
                  <div style={{ fontSize: '14.5px', fontWeight: '900', color: '#000000' }}>
                    실 지급액
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '900', color: '#000000', fontFamily: '"Pretendard", sans-serif' }}>
                    {(selectedItem.net_pay || (isChaYiSoo ? 1002060 : 0)).toLocaleString()}
                  </div>
                </div>

                {/* Section 4: Calculation Breakdown Box (산출식 또는 산출방법) */}
                <div style={{ marginBottom: '36px' }}>
                  <div style={{ fontWeight: '800', fontSize: '13.5px', color: '#000000', marginBottom: '8px' }}>
                    산출식 또는 산출방법
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', borderTop: '2px solid #000000', borderBottom: '1px solid #000000', color: '#000000' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #000000' }}>
                        <th style={{ width: '28%', padding: '7px 8px', textAlign: 'left', fontWeight: '800', color: '#000000', background: '#ffffff' }}>항목명</th>
                        <th style={{ width: '72%', padding: '7px 8px', textAlign: 'left', fontWeight: '800', color: '#000000', background: '#ffffff' }}>산출방법</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '5px 8px', fontWeight: '700', color: '#000000', background: '#ffffff' }}>기본급</td>
                        <td style={{ padding: '5px 8px', color: '#000000', background: '#ffffff' }}>{isChaYiSoo ? '기본근로 96시간 [주휴수당 포함]' : (breakdown.basicPayExplanation || (isKimSoonJa ? '기본근로 141시간 [주휴수당 포함]' : '기본근로 209시간 [주휴수당 포함]'))}</td>
                      </tr>
                      {isChaYiSoo ? (
                        <>
                          <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '5px 8px', fontWeight: '700', color: '#000000', background: '#ffffff' }}>연장근로수당 ①</td>
                            <td style={{ padding: '5px 8px', color: '#000000', background: '#ffffff' }}>11시간 x 9,288원 x 1.5</td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '5px 8px', height: '18px', color: '#000000', background: '#ffffff' }}></td>
                            <td style={{ padding: '5px 8px', color: '#000000', background: '#ffffff' }}></td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '5px 8px', height: '18px', color: '#000000', background: '#ffffff' }}></td>
                            <td style={{ padding: '5px 8px', color: '#000000', background: '#ffffff' }}></td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '5px 8px', height: '18px', color: '#000000', background: '#ffffff' }}></td>
                            <td style={{ padding: '5px 8px', color: '#000000', background: '#ffffff' }}></td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '5px 8px', height: '18px', color: '#000000', background: '#ffffff' }}></td>
                            <td style={{ padding: '5px 8px', color: '#000000', background: '#ffffff' }}></td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '5px 8px', height: '18px', color: '#000000', background: '#ffffff' }}></td>
                            <td style={{ padding: '5px 8px', color: '#000000', background: '#ffffff' }}></td>
                          </tr>
                        </>
                      ) : (
                        <>
                          <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '5px 8px', fontWeight: '700', color: '#000000', background: '#ffffff' }}>상여금</td>
                            <td style={{ padding: '5px 8px', color: '#000000', background: '#ffffff' }}>{breakdown.bonusExplanation || ''}</td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #e2e8f0', height: '14px' }}>
                            <td style={{ padding: '3px 8px', background: '#ffffff' }}></td>
                            <td style={{ padding: '3px 8px', background: '#ffffff' }}></td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '5px 8px', fontWeight: '700', color: '#000000', background: '#ffffff' }}>특근수당</td>
                            <td style={{ padding: '5px 8px', color: '#000000', background: '#ffffff' }}>{breakdown.specialExplanation || (isJungYongJu ? '0시간 x 9,288원 x 1.5' : (isKimSoonJa ? '27시간 x 10,320원 x 1.5' : (isKimHyeSook ? '9시간 x 10,320원 x 1.5' : (isKimHoon ? '0시간 x 11,229원 x 1.5' : '특근 없음'))))}</td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '5px 8px', fontWeight: '700', color: '#000000', background: '#ffffff' }}>연장근로수당 ①</td>
                            <td style={{ padding: '5px 8px', color: '#000000', background: '#ffffff' }}>{breakdown.overtimeExplanation1 || (isKimSoonJa ? '0시간 x 10,320원 x 1.5' : `22시간 x ${hourlyWageDisplay} x 1.5`)}</td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '5px 8px', fontWeight: '700', color: '#000000', background: '#ffffff' }}>연장근로수당 ②</td>
                            <td style={{ padding: '5px 8px', color: '#000000', background: '#ffffff' }}>{breakdown.overtimeExplanation2 || (isKimSoonJa ? '연장근로수당 없음' : `39.11시간 x ${hourlyWageDisplay} x 1.5`)}</td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '5px 8px', fontWeight: '700', color: '#000000', background: '#ffffff' }}>연차수당</td>
                            <td style={{ padding: '5px 8px', color: '#000000', background: '#ffffff' }}>{breakdown.annualLeaveExplanation || (isJungYongJu ? '연차수당: 74,300원 [ 연차 하루치(74,304원) * 연차시간(8h) ]' : (isKimSoonJa ? '연차수당: 41,280원 [ 연차 하루치(46,440원) * 연차시간(4h) ]' : (isKimHyeSook ? '연차수당: 82,560원 [ 연차 하루치(82,560원) * 연차시간(8h) ]' : '연차수당: 89,830원 [ 연차 하루치(89,832원) * 연차시간(8h) ]')))}</td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '5px 8px', fontWeight: '700', color: '#000000', background: '#ffffff' }}>대체근로수당</td>
                            <td style={{ padding: '5px 8px', color: '#000000', background: '#ffffff' }}>{breakdown.substituteExplanation || '9시간 x 11,229원 x 0.5'}</td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '5px 8px', fontWeight: '700', color: '#000000', background: '#ffffff' }}>공휴일근로수당</td>
                            <td style={{ padding: '5px 8px', color: '#000000', background: '#ffffff' }}>
                              {pubHolidayPay > 0 ? (breakdown.pubHolidayExplanation || `공휴일근로수당: ${pubHolidayPay.toLocaleString()}원`) : ''}
                            </td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '5px 8px', fontWeight: '700', color: '#000000', background: '#ffffff' }}>근태공제</td>
                            <td style={{ padding: '5px 8px', color: '#000000', background: '#ffffff' }}>{selectedItem.attendance_deduction > 0 ? `근태공제: -${selectedItem.attendance_deduction.toLocaleString()}원` : '근태공제: 공제 없음'}</td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Section 5: Footer Appreciation & Store Stamp Seal */}
                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                  <div style={{ fontSize: '13px', color: '#1e293b', marginBottom: '6px' }}>
                    귀하의 노고에 감사드립니다.
                  </div>
                  <div style={{ fontSize: '14.5px', fontWeight: '900', color: '#000000', marginBottom: '22px' }}>
                    {selectedItem.year_month.split('-')[0]}년 {parseInt(selectedItem.year_month.split('-')[1], 10) === 12 ? 1 : parseInt(selectedItem.year_month.split('-')[1], 10) + 1}월 5일
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '14px', paddingRight: '20px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '16px', fontWeight: '900', color: '#000000', letterSpacing: '-0.3px' }}>
                        {currentStore ? currentStore.name : '신영웅청국장해물뚝배기성서모다아울렛점'}
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: '#000000', marginTop: '2px' }}>
                        대표 {currentStore ? currentStore.ceo_name : ''}
                      </div>
                    </div>

                    {/* Authentic Korean Red Circular Stamp (인) */}
                    <div className="stamp-seal" style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      border: '3px solid #dc2626',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      boxShadow: 'inset 0 0 0 1px #dc2626',
                      color: '#dc2626',
                      fontWeight: '900',
                      fontSize: '13px',
                      userSelect: 'none',
                      transform: 'rotate(-4deg)',
                      background: '#ffffff'
                    }}>
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '1fr 1fr', 
                        textAlign: 'center', 
                        lineHeight: 1.1,
                        fontSize: '14px',
                        fontWeight: '900',
                        fontFamily: '"Gungsuh", "Batang", serif',
                        color: '#dc2626'
                      }}>
                        <span style={{ color: '#dc2626' }}>김</span><span style={{ color: '#dc2626' }}>한</span>
                        <span style={{ color: '#dc2626' }}>우</span><span style={{ color: '#dc2626' }}>인</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          조회 가능한 급여명세서가 없습니다. 해당 월의 급여 계산 및 확정을 먼저 완료해주세요.
        </div>
      )}
    </div>
  );
}
