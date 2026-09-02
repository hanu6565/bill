import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, ShieldCheck, DollarSign, Calendar, 
  Plus, Trash2, Save, RefreshCw, CheckCircle2 
} from 'lucide-react';
import api from '../services/api';
import Modal from '../components/Modal';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('rates'); // 'rates' | 'minwage' | 'holidays'
  const [settings, setSettings] = useState({});
  const [holidays, setHolidays] = useState([]);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [loading, setLoading] = useState(false);

  // Add Holiday Modal
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [newHoliday, setNewHoliday] = useState({
    holiday_date: '',
    holiday_name: '',
    is_substitute: 0
  });

  // Rates Form
  const [ratesForm, setRatesForm] = useState({
    minimumWage: 10320,
    nationalPension: 0.045,
    healthInsurance: 0.03545,
    longtermCareRateOfHealth: 0.1295,
    employmentInsurance: 0.009,
    carAllowanceNonTaxableLimit: 200000,
    overtimeNonTaxableSalaryLimit: 2100000
  });

  useEffect(() => {
    loadSettings();
    loadHolidays();
  }, [selectedYear]);

  const loadSettings = async () => {
    try {
      const res = await api.getSettings();
      if (res.success && res.settings) {
        setSettings(res.settings);
        if (res.settings.rates_2026) {
          setRatesForm(res.settings.rates_2026);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadHolidays = async () => {
    setLoading(true);
    try {
      const res = await api.getHolidays(selectedYear);
      if (res.success) {
        setHolidays(res.holidays);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRates = async (e) => {
    e.preventDefault();
    try {
      await api.saveSettings('rates_2026', ratesForm, '2026년도 급여 계산 기준 요율 및 최저시급');
      alert('2026년도 계산 기준 요율이 저장되었습니다.');
      loadSettings();
    } catch (err) {
      alert(err.message || '저장 실패');
    }
  };

  const handleAddHoliday = async (e) => {
    e.preventDefault();
    try {
      await api.addHoliday(newHoliday);
      setIsHolidayModalOpen(false);
      setNewHoliday({ holiday_date: '', holiday_name: '', is_substitute: 0 });
      loadHolidays();
    } catch (err) {
      alert(err.message || '공휴일 등록 실패');
    }
  };

  const handleDeleteHoliday = async (id, name) => {
    if (!window.confirm(`[${name}] 공휴일을 삭제하시겠습니까?`)) return;
    try {
      await api.deleteHoliday(id);
      loadHolidays();
    } catch (err) {
      alert(err.message || '삭제 실패');
    }
  };

  const handleResetRatesToStatutory = () => {
    if (!window.confirm('대한민국 보건복지부/고용노동부 공식 법정 기준 요율(국민연금 4.5%, 건보 3.545%, 장기요양 12.95%, 고용 0.9%, 최저시급 10,320원)로 초기화하시겠습니까?')) return;
    setRatesForm({
      minimumWage: 10320,
      nationalPension: 0.045,
      healthInsurance: 0.03545,
      longtermCareRateOfHealth: 0.1295,
      employmentInsurance: 0.009,
      carAllowanceNonTaxableLimit: 200000,
      overtimeNonTaxableSalaryLimit: 2100000
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SettingsIcon size={22} color="#3b82f6" /> 계산 기준값 및 공휴일 캘린더 설정
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          연도별 4대보험 요율, 법정 최저시급, 비과세 한도 및 대한민국 공휴일 캘린더를 통합 관리합니다.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
        <button 
          type="button" 
          className={`btn ${activeTab === 'rates' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('rates')}
        >
          <ShieldCheck size={16} /> 4대보험 & 세금 요율 설정
        </button>
        <button 
          type="button" 
          className={`btn ${activeTab === 'minwage' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('minwage')}
        >
          <DollarSign size={16} /> 최저임금 연도별 이력
        </button>
        <button 
          type="button" 
          className={`btn ${activeTab === 'holidays' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('holidays')}
        >
          <Calendar size={16} /> 공휴일 캘린더 관리
        </button>
      </div>

      {/* TAB 1: Rates Form */}
      {activeTab === 'rates' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Statutory Reference Guide Card */}
          <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#60a5fa', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                🏛️ 대한민국 4대 사회보험 법정 공제 요율 안내 (2025~2026년 현행 고시 기준)
              </h3>
              <span className="badge badge-primary" style={{ fontSize: '11px' }}>공식 법령 고시 기준</span>
            </div>

            <div className="table-container" style={{ margin: 0 }}>
              <table style={{ fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.3)' }}>
                    <th style={{ padding: '8px 10px' }}>보험 구분</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>근로자 부담 요율</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>사업주 부담 요율</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>총 합계 요율</th>
                    <th style={{ padding: '8px 10px' }}>법정 부과 기준 및 면제 연령</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: '700', color: '#fff' }}>국민연금</td>
                    <td style={{ textAlign: 'center', fontWeight: '800', color: '#60a5fa' }}>4.5%</td>
                    <td style={{ textAlign: 'center', color: '#cbd5e1' }}>4.5%</td>
                    <td style={{ textAlign: 'center', fontWeight: '700' }}>9.0%</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '11.5px' }}>
                      기준소득월액 상한(6,170,000원) / 하한(390,000원) 적용<br />
                      <strong style={{ color: '#fbbf24' }}>만 18세 이상 ~ 만 60세 미만 의무 가입 (만 60세 도달 시 자동 면제)</strong>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: '700', color: '#fff' }}>건강보험</td>
                    <td style={{ textAlign: 'center', fontWeight: '800', color: '#34d399' }}>3.545%</td>
                    <td style={{ textAlign: 'center', color: '#cbd5e1' }}>3.545%</td>
                    <td style={{ textAlign: 'center', fontWeight: '700' }}>7.09%</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '11.5px' }}>보수월액(과세급여) 기준 / 연령 제한 없음</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: '700', color: '#fff' }}>노인장기요양보험</td>
                    <td style={{ textAlign: 'center', fontWeight: '800', color: '#a78bfa' }}>건보료의 12.95%</td>
                    <td style={{ textAlign: 'center', color: '#cbd5e1' }}>건보료의 12.95%</td>
                    <td style={{ textAlign: 'center', fontWeight: '700' }}>0.9182% (보수대비)</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '11.5px' }}>건강보험료에 연동 부과 (실효 요율: 보수월액의 0.4591%씩 분담)</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: '700', color: '#fff' }}>고용보험 (실업급여)</td>
                    <td style={{ textAlign: 'center', fontWeight: '800', color: '#f59e0b' }}>0.9%</td>
                    <td style={{ textAlign: 'center', color: '#cbd5e1' }}>0.9% + 알파</td>
                    <td style={{ textAlign: 'center', fontWeight: '700' }}>1.8% + 알파</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '11.5px' }}>
                      사업주는 고용안정·직능개발요율(0.25%~0.85%) 추가 부담<br />
                      <strong style={{ color: '#fbbf24' }}>만 65세 이후 신규 고용 시 실업급여 적용 제외</strong>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: '700', color: '#fff' }}>산재보험</td>
                    <td style={{ textAlign: 'center', fontWeight: '800', color: '#94a3b8' }}>0원 (면제)</td>
                    <td style={{ textAlign: 'center', color: '#38bdf8' }}>100% (약 0.9%)</td>
                    <td style={{ textAlign: 'center', fontWeight: '700' }}>업종별 상이</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '11.5px' }}>근로자 급여 미공제 (사업주가 전액 100% 부담)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Rates Edit Card */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3 style={{ fontSize: '16px', color: '#fff', margin: 0 }}>2026년도 급여 계산 기준 요율 설정</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                  * 수정 후 저장하시면 이후 계산되는 모든 급여 및 모의정산에 즉시 반영됩니다.
                </span>
              </div>
              <button 
                type="button" 
                className="btn btn-sm btn-secondary" 
                onClick={handleResetRatesToStatutory}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <RefreshCw size={13} /> 법정 기준값으로 초기화
              </button>
            </div>

            <form onSubmit={handleSaveRates} style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px 0 0 0' }}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">국민연금 근로자 요율 (%) *</label>
                  <input 
                    type="number" 
                    step="0.001" 
                    className="form-input" 
                    value={Math.round(ratesForm.nationalPension * 100000) / 1000} 
                    onChange={(e) => setRatesForm({ ...ratesForm, nationalPension: parseFloat(e.target.value) / 100 })} 
                    required
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>법정 기준: 4.5%</span>
                </div>

                <div className="form-group">
                  <label className="form-label">건강보험 근로자 요율 (%) *</label>
                  <input 
                    type="number" 
                    step="0.001" 
                    className="form-input" 
                    value={Math.round(ratesForm.healthInsurance * 100000) / 1000} 
                    onChange={(e) => setRatesForm({ ...ratesForm, healthInsurance: parseFloat(e.target.value) / 100 })} 
                    required
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>법정 기준: 3.545%</span>
                </div>

                <div className="form-group">
                  <label className="form-label">장기요양보험 요율 (% - 건강보험료 대비) *</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="form-input" 
                    value={Math.round(ratesForm.longtermCareRateOfHealth * 10000) / 100} 
                    onChange={(e) => setRatesForm({ ...ratesForm, longtermCareRateOfHealth: parseFloat(e.target.value) / 100 })} 
                    required
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>법정 기준: 12.95%</span>
                </div>

                <div className="form-group">
                  <label className="form-label">고용보험 근로자 요율 (%) *</label>
                  <input 
                    type="number" 
                    step="0.001" 
                    className="form-input" 
                    value={Math.round(ratesForm.employmentInsurance * 100000) / 1000} 
                    onChange={(e) => setRatesForm({ ...ratesForm, employmentInsurance: parseFloat(e.target.value) / 100 })} 
                    required
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>법정 기준: 0.9%</span>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">2026년 법정 최저시급 (원) *</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={ratesForm.minimumWage} 
                    onChange={(e) => setRatesForm({ ...ratesForm, minimumWage: parseInt(e.target.value, 10) || 10320 })} 
                    required
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>209시간 기본급: {(ratesForm.minimumWage * 209).toLocaleString()}원</span>
                </div>

                <div className="form-group">
                  <label className="form-label">자가운전보조금 비과세 월 한도 (원)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={ratesForm.carAllowanceNonTaxableLimit} 
                    onChange={(e) => setRatesForm({ ...ratesForm, carAllowanceNonTaxableLimit: parseInt(e.target.value, 10) || 200000 })} 
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>법정 한도: 월 200,000원</span>
                </div>

                <div className="form-group">
                  <label className="form-label">조리/생산 연장비과세 대상 월정액 기준 (원)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    value={ratesForm.overtimeNonTaxableSalaryLimit} 
                    onChange={(e) => setRatesForm({ ...ratesForm, overtimeNonTaxableSalaryLimit: parseInt(e.target.value, 10) || 2100000 })} 
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>법정 기준: 월 2,100,000원 이하</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="submit" className="btn btn-primary">
                  <Save size={15} /> 요율 설정 저장하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: Minimum Wage History */}
      {activeTab === 'minwage' && (
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: '16px', color: '#fff' }}>대한민국 법정 최저시급 연도별 이력</h3>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>적용 연도</th>
                  <th>최저시급</th>
                  <th>주휴수당 포함 시급 (주 40h)</th>
                  <th>월 환산액 (209시간)</th>
                  <th>인상률</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ background: 'rgba(59, 130, 246, 0.08)' }}>
                  <td><strong style={{ color: '#60a5fa' }}>2026년</strong></td>
                  <td className="num-font" style={{ fontWeight: '800', color: '#34d399', fontSize: '14px' }}>10,320원</td>
                  <td className="num-font">12,384원</td>
                  <td className="num-font" style={{ fontWeight: '700' }}>2,156,880원</td>
                  <td>+2.89%</td>
                  <td><span className="badge badge-success">현재 적용 중</span></td>
                </tr>
                <tr>
                  <td>2025년</td>
                  <td className="num-font">10,030원</td>
                  <td className="num-font">12,036원</td>
                  <td className="num-font">2,096,270원</td>
                  <td>+1.72%</td>
                  <td><span className="badge badge-neutral">과거 이력</span></td>
                </tr>
                <tr>
                  <td>2024년</td>
                  <td className="num-font">9,860원</td>
                  <td className="num-font">11,832원</td>
                  <td className="num-font">2,060,740원</td>
                  <td>+2.50%</td>
                  <td><span className="badge badge-neutral">과거 이력</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Public Holidays Manager */}
      {activeTab === 'holidays' && (
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h3 style={{ fontSize: '16px', color: '#fff' }}>대한민국 법정 공휴일 캘린더 ({selectedYear}년)</h3>
              <select 
                className="form-select" 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                style={{ width: 'auto' }}
              >
                <option value="2025">2025년</option>
                <option value="2026">2026년</option>
                <option value="2027">2027년</option>
              </select>
            </div>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setIsHolidayModalOpen(true)}>
              <Plus size={14} /> 임시공휴일 수동 추가
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>공휴일 날짜</th>
                  <th>공휴일 명칭</th>
                  <th>대체공휴일 여부</th>
                  <th>구분</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {holidays.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                      등록된 공휴일이 없습니다.
                    </td>
                  </tr>
                ) : (
                  holidays.map(h => (
                    <tr key={h.id}>
                      <td style={{ fontWeight: '700', color: '#f87171' }}>{h.holiday_date}</td>
                      <td style={{ color: '#fff', fontWeight: '600' }}>{h.holiday_name}</td>
                      <td>
                        {h.is_substitute ? (
                          <span className="badge badge-warning">대체공휴일</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>일반 법정공휴일</span>
                        )}
                      </td>
                      <td>
                        {h.is_manual ? (
                          <span className="badge badge-purple">수동 추가 (임시)</span>
                        ) : (
                          <span className="badge badge-neutral">공공데이터 동기화</span>
                        )}
                      </td>
                      <td>
                        {h.is_manual ? (
                          <button 
                            type="button" 
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => handleDeleteHoliday(h.id, h.holiday_name)}
                          >
                            <Trash2 size={13} />
                          </button>
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>기본값</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Holiday Modal */}
      <Modal
        isOpen={isHolidayModalOpen}
        onClose={() => setIsHolidayModalOpen(false)}
        title="임시공휴일 수동 추가"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setIsHolidayModalOpen(false)}>취소</button>
            <button type="button" className="btn btn-primary" onClick={handleAddHoliday}>공휴일 등록</button>
          </>
        }
      >
        <form onSubmit={handleAddHoliday} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-group">
            <label className="form-label">공휴일 날짜 *</label>
            <input 
              type="date" 
              className="form-input" 
              value={newHoliday.holiday_date} 
              onChange={(e) => setNewHoliday({ ...newHoliday, holiday_date: e.target.value })} 
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-label">공휴일 명칭 *</label>
            <input 
              type="text" 
              className="form-input" 
              value={newHoliday.holiday_name} 
              onChange={(e) => setNewHoliday({ ...newHoliday, holiday_name: e.target.value })} 
              placeholder="예: 정부 지정 임시공휴일" 
              required 
            />
          </div>

          <div className="form-group">
            <label className="form-check">
              <input 
                type="checkbox" 
                checked={newHoliday.is_substitute === 1} 
                onChange={(e) => setNewHoliday({ ...newHoliday, is_substitute: e.target.checked ? 1 : 0 })} 
              />
              <span>대체공휴일로 지정</span>
            </label>
          </div>
        </form>
      </Modal>
    </div>
  );
}
