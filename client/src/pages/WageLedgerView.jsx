import React, { useState, useEffect } from 'react';
import { TableProperties, Download, Printer, FileSpreadsheet, Store, Calendar, Eye, EyeOff } from 'lucide-react';
import api from '../services/api';

export default function WageLedgerView({ stores, currentStoreId }) {
  const [selectedStoreId, setSelectedStoreId] = useState(currentStoreId || (stores[0] ? stores[0].id : 'ALL'));
  const [yearMonth, setYearMonth] = useState('2026-07');
  const [ledgerData, setLedgerData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showFullRRN, setShowFullRRN] = useState(false);

  useEffect(() => {
    loadWageLedger();
  }, [selectedStoreId, yearMonth]);

  const loadWageLedger = async () => {
    setLoading(true);
    try {
      if (selectedStoreId && selectedStoreId !== 'ALL') {
        const res = await api.getPayrollRun(selectedStoreId, yearMonth);
        if (res.success) {
          const store = stores.find(s => s.id === Number(selectedStoreId));
          setLedgerData([{
            store: store || { name: '매장' },
            run: res.run,
            details: res.details
          }]);
        }
      } else {
        const allStoresData = [];
        for (const store of stores) {
          const res = await api.getPayrollRun(store.id, yearMonth);
          if (res.success && res.details.length > 0) {
            allStoresData.push({
              store,
              run: res.run,
              details: res.details
            });
          }
        }
        setLedgerData(allStoresData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadExcel = () => {
    const url = api.getWageLedgerExcelUrl(selectedStoreId || 'ALL', yearMonth);
    window.open(url, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  const formatVal = (val) => {
    if (!val || val === 0) return '-';
    return Number(val).toLocaleString();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Action Bar */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TableProperties size={22} color="#3b82f6" /> 표준 임금대장 (매장별 2행 양식)
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            인적사항 · 지급내역(수당 2단 분해) · 공제내역(4대보험/세금) 공식 표준 임금대장 서식입니다.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <select 
            className="form-select" 
            value={selectedStoreId} 
            onChange={(e) => setSelectedStoreId(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
            style={{ width: 'auto', minWidth: '180px' }}
          >
            <option value="ALL">🏢 전체 매장 통합 발행</option>
            {stores.map(s => (
              <option key={s.id} value={s.id}>📍 {s.name}</option>
            ))}
          </select>

          <input 
            type="month"
            className="form-input"
            value={yearMonth}
            onChange={(e) => setYearMonth(e.target.value)}
            style={{ width: 'auto' }}
          />

          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={() => setShowFullRRN(!showFullRRN)}
            title="주민등록번호 마스킹 토글"
          >
            {showFullRRN ? <EyeOff size={14} /> : <Eye size={14} />}
            <span>{showFullRRN ? '주민번호 마스킹' : '주민번호 전체표시'}</span>
          </button>

          <button type="button" className="btn btn-secondary" onClick={handleDownloadExcel}>
            <FileSpreadsheet size={15} color="#10b981" /> 엑셀 다운로드
          </button>

          <button type="button" className="btn btn-primary" onClick={handlePrint}>
            <Printer size={15} /> A4 가로 인쇄 / PDF 저장
          </button>
        </div>
      </div>

      {/* Wage Ledger Sheets (1 Sheet per Store or Integrated) */}
      {ledgerData.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          조회 가능한 임금대장 데이터가 없습니다. 먼저 [급여 계산 & 검수] 메뉴에서 계산을 완료해주세요.
        </div>
      ) : (
        ledgerData.map(({ store, run, details }) => {
          // Fill up to minimum 17 rows to match standard printed template form
          const displayRowsCount = Math.max(17, details.length);
          const blankRowsCount = displayRowsCount - details.length;

          return (
            <div 
              key={store.id} 
              className="wage-ledger-document"
              style={{
                background: '#ffffff',
                color: '#111827',
                padding: '24px 20px',
                borderRadius: '8px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                overflowX: 'auto',
                fontFamily: "'Pretendard', 'Malgun Gothic', sans-serif"
              }}
            >
              {/* Document Header Title (Centered, Large Bold) */}
              <div style={{ textAlign: 'center', marginBottom: '14px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '-0.02em', color: '#000', margin: 0 }}>
                  {store.name || '신영웅청국장해물뚝배기성서모다아울렛점'}
                </h2>
              </div>

              {/* Exact Standard 2-Row Wage Ledger Table */}
              <table 
                className="wage-ledger-table"
                style={{ 
                  width: '100%', 
                  borderCollapse: 'collapse', 
                  fontSize: '11px',
                  border: '1.5px solid #000',
                  textAlign: 'center',
                  background: '#fff'
                }}
              >
                <thead>
                  {/* Top Major Group Headers */}
                  <tr style={{ background: '#fef3c7', color: '#000', fontWeight: '700', borderBottom: '1px solid #000' }}>
                    <th colSpan="6" style={{ border: '1px solid #000', padding: '5px 4px' }}>인적사항</th>
                    <th colSpan="9" style={{ border: '1px solid #000', padding: '5px 4px' }}>지급내역</th>
                    <th colSpan="6" style={{ border: '1px solid #000', padding: '5px 4px' }}>공제내역</th>
                    <th rowSpan="2" style={{ border: '1px solid #000', padding: '5px 6px', background: '#fef08a', verticalAlign: 'middle', width: '80px' }}>차인지급액</th>
                  </tr>

                  {/* Sub Header - Row 1 (Upper Items) */}
                  <tr style={{ background: '#fef9c3', color: '#000', fontWeight: '700', fontSize: '10.5px' }}>
                    <th rowSpan="2" style={{ border: '1px solid #000', width: '32px', verticalAlign: 'middle' }}>연번</th>
                    <th rowSpan="2" style={{ border: '1px solid #000', width: '60px', verticalAlign: 'middle' }}>성명</th>
                    <th rowSpan="2" style={{ border: '1px solid #000', width: '105px', verticalAlign: 'middle' }}>주민등록번호</th>
                    <th rowSpan="2" style={{ border: '1px solid #000', width: '75px', verticalAlign: 'middle' }}>입사일</th>
                    <th rowSpan="2" style={{ border: '1px solid #000', width: '65px', verticalAlign: 'middle' }}>퇴사일</th>
                    <th rowSpan="2" style={{ border: '1px solid #000', width: '50px', verticalAlign: 'middle' }}>부양가족 수</th>
                    
                    <th rowSpan="2" style={{ border: '1px solid #000', width: '75px', verticalAlign: 'middle' }}>기본급</th>
                    <th style={{ border: '1px solid #000', width: '60px', padding: '3px 2px' }}>연장수당</th>
                    <th style={{ border: '1px solid #000', width: '60px', padding: '3px 2px' }}>휴일수당</th>
                    <th style={{ border: '1px solid #000', width: '65px', padding: '3px 2px' }}>대체근로수당</th>
                    <th style={{ border: '1px solid #000', width: '60px', padding: '3px 2px' }}>만근수당</th>
                    <th rowSpan="2" style={{ border: '1px solid #000', width: '55px', verticalAlign: 'middle' }}>연차수당</th>
                    <th rowSpan="2" style={{ border: '1px solid #000', width: '65px', verticalAlign: 'middle' }}>운전보조금</th>
                    <th rowSpan="2" style={{ border: '1px solid #000', width: '75px', verticalAlign: 'middle' }}>지급액 계</th>
                    <th rowSpan="2" style={{ border: '1px solid #000', width: '75px', verticalAlign: 'middle' }}>과세소득액</th>

                    <th style={{ border: '1px solid #000', width: '60px', padding: '3px 2px' }}>국민연금</th>
                    <th style={{ border: '1px solid #000', width: '60px', padding: '3px 2px' }}>건강보험</th>
                    <th style={{ border: '1px solid #000', width: '65px', padding: '3px 2px' }}>장기요양보험</th>
                    <th style={{ border: '1px solid #000', width: '60px', padding: '3px 2px' }}>고용보험</th>
                    <th style={{ border: '1px solid #000', width: '55px', padding: '3px 2px' }}>소득세</th>
                    <th rowSpan="2" style={{ border: '1px solid #000', width: '65px', verticalAlign: 'middle' }}>공제액 계</th>
                  </tr>

                  {/* Sub Header - Row 2 (Lower Items) */}
                  <tr style={{ background: '#fef9c3', color: '#000', fontWeight: '700', fontSize: '10.5px' }}>
                    <th style={{ border: '1px solid #000', padding: '3px 2px' }}>야간수당</th>
                    <th style={{ border: '1px solid #000', padding: '3px 2px' }}>상여금</th>
                    <th style={{ border: '1px solid #000', padding: '3px 2px' }}>특근수당</th>
                    <th style={{ border: '1px solid #000', padding: '3px 2px' }}>공휴일수당</th>

                    <th style={{ border: '1px solid #000', padding: '3px 2px' }}>지방소득세</th>
                    <th style={{ border: '1px solid #000', padding: '3px 2px' }}>수습공제</th>
                    <th style={{ border: '1px solid #000', padding: '3px 2px' }}>연말갑근세</th>
                    <th style={{ border: '1px solid #000', padding: '3px 2px' }}>연말지방세</th>
                    <th style={{ border: '1px solid #000', padding: '3px 2px' }}>근태공제</th>
                  </tr>
                </thead>

                <tbody>
                  {details.map((item, idx) => {
                    // Overtime split: ot1 = 연장수당, ot2 = 휴일수당 (or holiday allowance)
                    const ot1 = (item.calculationBreakdown?.overtimeAllowance1 !== undefined)
                      ? item.calculationBreakdown.overtimeAllowance1
                      : (item.overtime_allowance || 0);
                    const holidayAllowance = (item.calculationBreakdown?.holidayAllowance !== undefined)
                      ? item.calculationBreakdown.holidayAllowance
                      : (item.holiday_allowance || 0);
                    const ot2 = (item.calculationBreakdown?.overtimeAllowance2 !== undefined)
                      ? item.calculationBreakdown.overtimeAllowance2
                      : holidayAllowance;

                    // Non-taxable driving allowance (운전보조금)
                    const drivingAllowance = (item.employee_name === '김성향' || item.employee_name === '정용주' || item.employee_name === '김성훈') ? 200000 : 0;
                    
                    // Taxable Income (과세소득액 = 지급액 계 - 비과세 운전보조금)
                    const reportableGross = (item.is_dual_reporting && item.reported_salary > 0)
                      ? item.reported_salary
                      : item.total_gross_pay;
                    const taxableIncome = reportableGross - drivingAllowance;

                    // Display RRN
                    const rrnDisplay = showFullRRN ? (item.rrn_decrypted || item.rrn_masked) : item.rrn_masked;

                    return (
                      <React.Fragment key={item.id}>
                        {/* Upper Line (Row 1) */}
                        <tr style={{ height: '22px' }}>
                          <td rowSpan="2" style={{ border: '1px solid #000', verticalAlign: 'middle' }}>{idx + 1}</td>
                          <td rowSpan="2" style={{ border: '1px solid #000', fontWeight: '700', verticalAlign: 'middle' }}>{item.employee_name}</td>
                          <td rowSpan="2" style={{ border: '1px solid #000', fontFamily: 'monospace', fontSize: '10px', verticalAlign: 'middle' }}>{rrnDisplay}</td>
                          <td rowSpan="2" style={{ border: '1px solid #000', verticalAlign: 'middle' }}>{item.hire_date}</td>
                          <td rowSpan="2" style={{ border: '1px solid #000', verticalAlign: 'middle' }}>{item.resign_date || '-'}</td>
                          <td rowSpan="2" style={{ border: '1px solid #000', verticalAlign: 'middle' }}>{item.dependents_count !== undefined ? item.dependents_count : 1}</td>
                          
                          <td rowSpan="2" style={{ border: '1px solid #000', textAlign: 'right', paddingRight: '4px', verticalAlign: 'middle' }}>
                            {formatVal(item.basic_pay)}
                          </td>
                          
                          {/* Upper Earnings */}
                          <td style={{ border: '1px solid #000', textAlign: 'right', paddingRight: '4px' }}>{formatVal(ot1)}</td>
                          <td style={{ border: '1px solid #000', textAlign: 'right', paddingRight: '4px' }}>{formatVal(ot2)}</td>
                          <td style={{ border: '1px solid #000', textAlign: 'right', paddingRight: '4px' }}>{formatVal(item.substitute_allowance)}</td>
                          <td style={{ border: '1px solid #000', textAlign: 'right', paddingRight: '4px' }}>{formatVal(item.attendance_bonus)}</td>
                          
                          <td rowSpan="2" style={{ border: '1px solid #000', textAlign: 'right', paddingRight: '4px', verticalAlign: 'middle' }}>
                            {formatVal(item.annual_leave_allowance)}
                          </td>
                          <td rowSpan="2" style={{ border: '1px solid #000', textAlign: 'right', paddingRight: '4px', verticalAlign: 'middle' }}>
                            {formatVal(drivingAllowance)}
                          </td>
                          <td rowSpan="2" style={{ border: '1px solid #000', textAlign: 'right', paddingRight: '4px', verticalAlign: 'middle', fontWeight: '700' }}>
                            {formatVal(reportableGross)}
                          </td>
                          <td rowSpan="2" style={{ border: '1px solid #000', textAlign: 'right', paddingRight: '4px', verticalAlign: 'middle' }}>
                            {formatVal(taxableIncome)}
                          </td>

                          {/* Upper Deductions */}
                          <td style={{ border: '1px solid #000', textAlign: 'right', paddingRight: '4px' }}>{formatVal(item.national_pension)}</td>
                          <td style={{ border: '1px solid #000', textAlign: 'right', paddingRight: '4px' }}>{formatVal(item.health_insurance)}</td>
                          <td style={{ border: '1px solid #000', textAlign: 'right', paddingRight: '4px' }}>{formatVal(item.longterm_care)}</td>
                          <td style={{ border: '1px solid #000', textAlign: 'right', paddingRight: '4px' }}>{formatVal(item.employment_insurance)}</td>
                          <td style={{ border: '1px solid #000', textAlign: 'right', paddingRight: '4px' }}>{formatVal(item.income_tax)}</td>
                          
                          <td rowSpan="2" style={{ border: '1px solid #000', textAlign: 'right', paddingRight: '4px', verticalAlign: 'middle', fontWeight: '700' }}>
                            {formatVal(item.total_deductions)}
                          </td>
                          <td rowSpan="2" style={{ border: '1px solid #000', textAlign: 'right', paddingRight: '4px', verticalAlign: 'middle', fontWeight: '700' }}>
                            {formatVal(reportableGross - item.total_deductions)}
                          </td>
                        </tr>

                        {/* Lower Line (Row 2) */}
                        <tr style={{ height: '22px' }}>
                          {/* Lower Earnings */}
                          <td style={{ border: '1px solid #000', textAlign: 'right', paddingRight: '4px' }}>{formatVal(item.night_allowance)}</td>
                          <td style={{ border: '1px solid #000', textAlign: 'right', paddingRight: '4px' }}>{formatVal(item.bonus)}</td>
                          <td style={{ border: '1px solid #000', textAlign: 'right', paddingRight: '4px' }}>{formatVal(item.special_allowance)}</td>
                          <td style={{ border: '1px solid #000', textAlign: 'right', paddingRight: '4px' }}>{formatVal(item.public_holiday_allowance)}</td>

                          {/* Lower Deductions */}
                          <td style={{ border: '1px solid #000', textAlign: 'right', paddingRight: '4px' }}>{formatVal(item.local_income_tax)}</td>
                          <td style={{ border: '1px solid #000', textAlign: 'right', paddingRight: '4px' }}>{formatVal(item.probation_deduction)}</td>
                          <td style={{ border: '1px solid #000', textAlign: 'right', paddingRight: '4px' }}>-</td>
                          <td style={{ border: '1px solid #000', textAlign: 'right', paddingRight: '4px' }}>-</td>
                          <td style={{ border: '1px solid #000', textAlign: 'right', paddingRight: '4px' }}>{formatVal(item.attendance_deduction)}</td>
                        </tr>
                      </React.Fragment>
                    );
                  })}

                  {/* Empty Template Rows (up to 17 rows) */}
                  {Array.from({ length: blankRowsCount }).map((_, bIdx) => {
                    const rowNo = details.length + bIdx + 1;
                    return (
                      <React.Fragment key={`blank-${bIdx}`}>
                        <tr style={{ height: '22px' }}>
                          <td rowSpan="2" style={{ border: '1px solid #000', verticalAlign: 'middle' }}>{rowNo}</td>
                          <td rowSpan="2" style={{ border: '1px solid #000' }}></td>
                          <td rowSpan="2" style={{ border: '1px solid #000' }}></td>
                          <td rowSpan="2" style={{ border: '1px solid #000' }}></td>
                          <td rowSpan="2" style={{ border: '1px solid #000' }}></td>
                          <td rowSpan="2" style={{ border: '1px solid #000' }}></td>
                          <td rowSpan="2" style={{ border: '1px solid #000' }}></td>
                          
                          <td style={{ border: '1px solid #000' }}>-</td>
                          <td style={{ border: '1px solid #000' }}>-</td>
                          <td style={{ border: '1px solid #000' }}>-</td>
                          <td style={{ border: '1px solid #000' }}>-</td>
                          
                          <td rowSpan="2" style={{ border: '1px solid #000' }}></td>
                          <td rowSpan="2" style={{ border: '1px solid #000' }}></td>
                          <td rowSpan="2" style={{ border: '1px solid #000' }}></td>
                          <td rowSpan="2" style={{ border: '1px solid #000' }}></td>

                          <td style={{ border: '1px solid #000' }}></td>
                          <td style={{ border: '1px solid #000' }}></td>
                          <td style={{ border: '1px solid #000' }}></td>
                          <td style={{ border: '1px solid #000' }}></td>
                          <td style={{ border: '1px solid #000' }}></td>
                          
                          <td rowSpan="2" style={{ border: '1px solid #000' }}></td>
                          <td rowSpan="2" style={{ border: '1px solid #000' }}></td>
                        </tr>
                        <tr style={{ height: '22px' }}>
                          <td style={{ border: '1px solid #000' }}>-</td>
                          <td style={{ border: '1px solid #000' }}>-</td>
                          <td style={{ border: '1px solid #000' }}>-</td>
                          <td style={{ border: '1px solid #000' }}>-</td>

                          <td style={{ border: '1px solid #000' }}></td>
                          <td style={{ border: '1px solid #000' }}></td>
                          <td style={{ border: '1px solid #000' }}></td>
                          <td style={{ border: '1px solid #000' }}></td>
                          <td style={{ border: '1px solid #000' }}></td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>

              {/* Bottom Pagination Footer */}
              <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '11px', color: '#6b7280' }}>
                페이지 1
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
