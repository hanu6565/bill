import React, { useState, useEffect } from 'react';
import { TableProperties, Download, Printer, FileSpreadsheet, Building2, Calendar } from 'lucide-react';
import api from '../services/api';

export default function WageLedgerView({ stores, currentStoreId }) {
  const [selectedStoreId, setSelectedStoreId] = useState(currentStoreId || (stores[0] ? stores[0].id : 'ALL'));
  const [yearMonth, setYearMonth] = useState('2026-08');
  const [ledgerData, setLedgerData] = useState([]);
  const [loading, setLoading] = useState(false);

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
        // All stores integrated
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Action Bar */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TableProperties size={22} color="#3b82f6" /> 임금대장 (매장별 2행 구조)
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            직원 1명당 2행 구조(1행: 주요 지급/공제, 2행: 지방소득세/수습공제/보조항목)의 표준 임금대장을 조회하고 내보냅니다.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <select 
            className="form-select" 
            value={selectedStoreId} 
            onChange={(e) => setSelectedStoreId(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
            style={{ width: 'auto', minWidth: '170px' }}
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

          <button type="button" className="btn btn-secondary" onClick={handleDownloadExcel}>
            <FileSpreadsheet size={15} color="#10b981" /> 엑셀 다운로드
          </button>

          <button type="button" className="btn btn-primary" onClick={handlePrint}>
            <Printer size={15} /> PDF 인쇄 / 저장
          </button>
        </div>
      </div>

      {/* Wage Ledger Sheets */}
      {ledgerData.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          조회 가능한 임금대장 데이터가 없습니다. 먼저 급여 계산을 진행해주세요.
        </div>
      ) : (
        ledgerData.map(({ store, run, details }) => {
          let totalGrossSum = 0;
          let totalDeductSum = 0;
          let totalNetSum = 0;

          return (
            <div key={store.id} className="card" style={{ padding: '20px', overflowX: 'auto' }}>
              {/* Sheet Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '14px', borderBottom: '2px solid var(--border-strong)', paddingBottom: '10px' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#fff' }}>
                    {yearMonth} 귀속 임금대장 - {store.name}
                  </h2>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    대표자: {store.ceo_name || '-'} | 사업자등록번호: {store.business_number || '-'} | 산재보험 요율: {store.accident_rate}%
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  발급일자: {new Date().toISOString().split('T')[0]} | 직원 수: <strong style={{ color: '#60a5fa' }}>{details.length}명</strong>
                </div>
              </div>

              {/* 2-Row Wage Ledger Table */}
              <div className="table-container" style={{ border: '1px solid #334155', background: '#0f172a' }}>
                <table style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
                  <thead>
                    <tr style={{ background: '#1e3a8a', color: '#fff', textAlign: 'center' }}>
                      <th style={{ padding: '6px' }}>연번</th>
                      <th style={{ padding: '6px' }}>성명</th>
                      <th style={{ padding: '6px' }}>주민등록번호</th>
                      <th style={{ padding: '6px' }}>입사일</th>
                      <th style={{ padding: '6px' }}>퇴사일</th>
                      <th style={{ padding: '6px' }}>부양</th>
                      <th style={{ padding: '6px' }}>기본급</th>
                      <th style={{ padding: '6px' }}>연장수당</th>
                      <th style={{ padding: '6px' }}>야간수당</th>
                      <th style={{ padding: '6px' }}>휴일수당</th>
                      <th style={{ padding: '6px' }}>공휴일수당</th>
                      <th style={{ padding: '6px' }}>대체근로</th>
                      <th style={{ padding: '6px' }}>만근수당</th>
                      <th style={{ padding: '6px' }}>연차수당</th>
                      <th style={{ padding: '6px' }}>운전보조</th>
                      <th style={{ padding: '6px' }}>상여금</th>
                      <th style={{ padding: '6px' }}>특근수당</th>
                      <th style={{ padding: '6px', background: '#1e40af' }}>지급액 계</th>
                      <th style={{ padding: '6px' }}>과세소득</th>
                      <th style={{ padding: '6px' }}>국민연금</th>
                      <th style={{ padding: '6px' }}>건강보험</th>
                      <th style={{ padding: '6px' }}>장기요양</th>
                      <th style={{ padding: '6px' }}>고용보험</th>
                      <th style={{ padding: '6px' }}>소득세</th>
                      <th style={{ padding: '6px', background: '#991b1b' }}>공제액 계</th>
                      <th style={{ padding: '6px', background: '#065f46' }}>차인지급액</th>
                    </tr>
                    <tr style={{ background: '#2563eb', color: '#fff', textAlign: 'center' }}>
                      <th style={{ padding: '4px' }}>직위</th>
                      <th style={{ padding: '4px' }}>계좌정보</th>
                      <th style={{ padding: '4px' }}>비고</th>
                      <th style={{ padding: '4px' }}></th>
                      <th style={{ padding: '4px' }}></th>
                      <th style={{ padding: '4px' }}></th>
                      <th style={{ padding: '4px' }}>지방소득세</th>
                      <th style={{ padding: '4px' }}>수습공제</th>
                      <th style={{ padding: '4px' }}>근태공제</th>
                      <th style={{ padding: '4px' }}>미신고공제</th>
                      <th style={{ padding: '4px' }}></th>
                      <th style={{ padding: '4px' }}></th>
                      <th style={{ padding: '4px' }}></th>
                      <th style={{ padding: '4px' }}></th>
                      <th style={{ padding: '4px' }}></th>
                      <th style={{ padding: '4px' }}></th>
                      <th style={{ padding: '4px' }}></th>
                      <th style={{ padding: '4px' }}></th>
                      <th style={{ padding: '4px' }}>비과세소득</th>
                      <th style={{ padding: '4px' }}>사업자지급</th>
                      <th style={{ padding: '4px' }}>개인통장지급</th>
                      <th style={{ padding: '4px' }}></th>
                      <th style={{ padding: '4px' }}></th>
                      <th style={{ padding: '4px' }}></th>
                      <th style={{ padding: '4px' }}></th>
                      <th style={{ padding: '4px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.map((item, idx) => {
                      totalGrossSum += (item.total_gross_pay || 0);
                      totalDeductSum += (item.total_deductions || 0);
                      totalNetSum += (item.net_pay || 0);

                      const bgRow1 = idx % 2 === 0 ? '#131b2e' : '#1e2942';
                      const bgRow2 = idx % 2 === 0 ? '#0b0f19' : '#162035';

                      return (
                        <React.Fragment key={item.id}>
                          {/* Row 1: Primary items */}
                          <tr style={{ background: bgRow1, borderTop: '1px solid #334155' }}>
                            <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                            <td style={{ fontWeight: '700', color: '#fff' }}>{item.employee_name}</td>
                            <td style={{ fontFamily: 'var(--font-mono)' }}>{item.rrn_masked}</td>
                            <td>{item.hire_date}</td>
                            <td>{item.resign_date || '-'}</td>
                            <td style={{ textAlign: 'center' }}>{item.dependents_count || 1}</td>
                            <td style={{ textAlign: 'right' }}>{(item.basic_pay || 0).toLocaleString()}</td>
                            <td style={{ textAlign: 'right' }}>{(item.overtime_allowance || 0).toLocaleString()}</td>
                            <td style={{ textAlign: 'right' }}>{(item.night_allowance || 0).toLocaleString()}</td>
                            <td style={{ textAlign: 'right' }}>{(item.holiday_allowance || 0).toLocaleString()}</td>
                            <td style={{ textAlign: 'right' }}>{(item.public_holiday_allowance || 0).toLocaleString()}</td>
                            <td style={{ textAlign: 'right' }}>{(item.substitute_allowance || 0).toLocaleString()}</td>
                            <td style={{ textAlign: 'right' }}>{(item.attendance_bonus || 0).toLocaleString()}</td>
                            <td style={{ textAlign: 'right' }}>{(item.annual_leave_allowance || 0).toLocaleString()}</td>
                            <td style={{ textAlign: 'right' }}>{(item.car_allowance || 0).toLocaleString()}</td>
                            <td style={{ textAlign: 'right' }}>{(item.bonus || 0).toLocaleString()}</td>
                            <td style={{ textAlign: 'right' }}>{(item.special_allowance || 0).toLocaleString()}</td>
                            <td style={{ textAlign: 'right', fontWeight: '700', color: '#60a5fa', background: 'rgba(59, 130, 246, 0.1)' }}>
                              {(item.total_gross_pay || 0).toLocaleString()}
                            </td>
                            <td style={{ textAlign: 'right' }}>{(item.taxable_income || 0).toLocaleString()}</td>
                            <td style={{ textAlign: 'right' }}>{(item.national_pension || 0).toLocaleString()}</td>
                            <td style={{ textAlign: 'right' }}>{(item.health_insurance || 0).toLocaleString()}</td>
                            <td style={{ textAlign: 'right' }}>{(item.longterm_care || 0).toLocaleString()}</td>
                            <td style={{ textAlign: 'right' }}>{(item.employment_insurance || 0).toLocaleString()}</td>
                            <td style={{ textAlign: 'right' }}>{(item.income_tax || 0).toLocaleString()}</td>
                            <td style={{ textAlign: 'right', fontWeight: '700', color: '#f87171', background: 'rgba(239, 68, 68, 0.1)' }}>
                              {(item.total_deductions || 0).toLocaleString()}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: '800', color: '#34d399', background: 'rgba(16, 185, 129, 0.15)' }}>
                              {(item.net_pay || 0).toLocaleString()}
                            </td>
                          </tr>

                          {/* Row 2: Secondary items */}
                          <tr style={{ background: bgRow2, color: 'var(--text-muted)', borderBottom: '1px solid #334155' }}>
                            <td style={{ textAlign: 'center' }}>{item.position || '직원'}</td>
                            <td colSpan="2">{item.bank_name} {item.account_number}</td>
                            <td>{item.is_dual_reporting ? '이중신고' : ''}</td>
                            <td></td>
                            <td></td>
                            <td style={{ textAlign: 'right', color: '#fca5a5' }}>{(item.local_income_tax || 0).toLocaleString()}</td>
                            <td style={{ textAlign: 'right', color: '#fca5a5' }}>{(item.probation_deduction || 0).toLocaleString()}</td>
                            <td style={{ textAlign: 'right', color: '#fca5a5' }}>{(item.attendance_deduction || 0).toLocaleString()}</td>
                            <td style={{ textAlign: 'right', color: '#fca5a5' }}>{(item.unreported_diff_deduction || 0).toLocaleString()}</td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td style={{ textAlign: 'right' }}>{(item.non_taxable_income || 0).toLocaleString()}</td>
                            <td style={{ textAlign: 'right', color: '#60a5fa' }}>{(item.biz_account_pay || 0).toLocaleString()}</td>
                            <td style={{ textAlign: 'right', color: '#34d399' }}>{(item.personal_account_pay || 0).toLocaleString()}</td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                          </tr>
                        </React.Fragment>
                      );
                    })}

                    {/* Bottom Grand Totals Row */}
                    <tr style={{ background: '#020617', fontWeight: '800', color: '#fff', borderTop: '2px solid #3b82f6' }}>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '10px' }}>
                        매장 합계 (총 {details.length}명)
                      </td>
                      <td colSpan="11"></td>
                      <td style={{ textAlign: 'right', color: '#60a5fa', fontSize: '13px' }}>
                        {totalGrossSum.toLocaleString()}원
                      </td>
                      <td></td>
                      <td colSpan="5"></td>
                      <td style={{ textAlign: 'right', color: '#f87171', fontSize: '13px' }}>
                        {totalDeductSum.toLocaleString()}원
                      </td>
                      <td style={{ textAlign: 'right', color: '#34d399', fontSize: '14px' }}>
                        {totalNetSum.toLocaleString()}원
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
