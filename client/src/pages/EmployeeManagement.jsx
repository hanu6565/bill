import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, Edit2, Trash2, Eye, EyeOff, ShieldCheck, 
  AlertTriangle, Car, CreditCard, Building, Calendar, DollarSign, Calculator 
} from 'lucide-react';
import api from '../services/api';
import Modal from '../components/Modal';
import HourlyWageCalculatorModal from '../components/HourlyWageCalculatorModal';

export const VISA_GUIDES = {
  'D-2': {
    title: 'D-2 (유학 / 학위과정)',
    category: '시간제 취업 (아르바이트 허용)',
    workHours: '학기 중 주 20~25시간 이내 (TOPIK 성적에 따라 상이) / 주말 및 방학 중 무제한 근무 가능',
    permits: '출입국관리사무소 사전 [시간제취업(체류자격외활동) 허가서] 발급 필수 (미발급 시 불법고용 과태료 부과)',
    socialIns: '건강보험 당연가입(외국인유학생 의무), 산재보험 의무가입 / 국민연금·고용보험은 법정 적용 제외',
    allowedJobs: '일반 음식점 주방보조, 홀서빙, 매장 보조 등 (단, 유흥주점/단란주점/사행업종 절대 불가)'
  },
  'D-4': {
    title: 'D-4 (일반연수 / 어학연수)',
    category: '시간제 취업 (제한적 허용)',
    workHours: '입국 후 6개월 경과 후부터 허가 가능 / 주 20시간 이내 (방학 기간도 주 20시간 제한 동일)',
    permits: '체류자격외활동허가(시간제취업 허가) 사전 승인 필수',
    socialIns: '건강보험 당연가입, 산재보험 의무가입 / 국민연금·고용보험 제외',
    allowedJobs: '음식점 주방보조 및 홀서빙 (유흥/사행성 업종 불가)'
  },
  'H-2': {
    title: 'H-2 (방문취업 / 외국국적동포)',
    category: '특례고용 취업',
    workHours: '주 40~52시간 전일제 상용직 및 파트타임 자유 근무 가능',
    permits: '고용노동부 [특례고용가능확인서] 발급 및 채용 후 14일 이내 [외국인 취업개시/근로개시 신고] 필수',
    socialIns: '4대보험 당연가입 + 외국인 전용보험(출국만기보험, 귀국비용보험, 상해보험) 사업주 의무가입',
    allowedJobs: '한식, 중식, 일식 등 모든 요식업종 주방/홀/배달 전 직종 자유 취업 가능'
  },
  'E-9': {
    title: 'E-9 (비전문취업 / 고용허가제)',
    category: '상용 정규 취업',
    workHours: '법정 주 40시간 + 연장 한도 12시간 (주 최대 52시간 근무 가능)',
    permits: '고용노동부 [외국인 고용허가서] 및 표준근로계약서 필수 (사업장 변경 시 고용센터 신고)',
    socialIns: '4대보험 의무가입 + 외국인 전용보험(출국만기보험, 임금체불보증보험) 사업주 가입 필수',
    allowedJobs: '음식점업 주방보조(정부 허용 업종 확대 대상 사업장), 제조업, 농축산업 등'
  },
  'F-4': {
    title: 'F-4 (재외동포)',
    category: '광범위 취업 허용',
    workHours: '근로시간 법적 제한 없음 (주 40~52시간 전일제 및 탄력근무 자유)',
    permits: '별도 외국인 취업허가 불필요 (내국인과 유사하게 채용 가능)',
    socialIns: '내국인과 100% 동일하게 4대보험 의무가입 (외국인 전용보험 대상 제외)',
    allowedJobs: '음식점업 조리, 주방, 매장관리, 매니저, 서빙 등 요식업 전반 근무 가능'
  },
  'F-5': {
    title: 'F-5 (영주권)',
    category: '완전 자유 취업',
    workHours: '내국인과 동일 (취업 및 근무시간에 아무런 법적 제한 없음)',
    permits: '별도 허가나 신고 불필요 (내국인과 동일 채용)',
    socialIns: '내국인과 100% 동일 (4대보험 의무 적용)',
    allowedJobs: '모든 직종 및 요식업 전 분야 자유 취업'
  },
  'F-6': {
    title: 'F-6 (결혼이민)',
    category: '완전 자유 취업',
    workHours: '내국인과 동일 (근무시간 및 고용형태 무제한)',
    permits: '별도 취업허가나 외국인 고용허가 절차 불필요',
    socialIns: '내국인과 100% 동일하게 4대보험 의무가입',
    allowedJobs: '음식점 주방, 서빙, 점장 등 모든 직무 자유 취업'
  },
  'F-2': {
    title: 'F-2 (거주)',
    category: '자유 취업',
    workHours: '내국인과 동일하게 자유 근무 가능',
    permits: '체류기간 내 취업활동 자유',
    socialIns: '내국인과 동일 (4대보험 의무 적용)',
    allowedJobs: '요식업 전 직종 가능'
  },
  'E-7': {
    title: 'E-7 (특정활동 / 전문조리사)',
    category: '전문인력 취업',
    workHours: '주 40~52시간 (고용계약서 범위 내)',
    permits: '전문 조리사 등 고용추천서 및 출입국 E-7 비자 지정 사업장 근무',
    socialIns: '4대보험 의무가입',
    allowedJobs: '전문 주방장, 한식/양식/중식/일식 전문 요리사'
  },
  'OTHER': {
    title: '기타 외국인 비자',
    category: '체류자격 확인 필요',
    workHours: '체류자격별 법정 취업허가 범위 및 고용노동부 지침 준수 필요',
    permits: '출입국관리사무소(하이코리아 1345)를 통해 체류자격외활동허가 여부 사전 확인 필수',
    socialIns: '체류자격 및 국적별 상호주의 원칙에 따른 4대보험 적용',
    allowedJobs: '취업 자격이 없는 비자(B-1, B-2, C-3 등)는 취업이 엄격히 금지됩니다.'
  }
};

export default function EmployeeManagement({ stores, currentStoreId, setCurrentStoreId }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);

  // Unmask RRN State
  const [unmaskedRRNMap, setUnmaskedRRNMap] = useState({});

  // Active Tab inside Add/Edit Modal
  const [modalTab, setModalTab] = useState('basic'); // 'basic' | 'wage' | 'insurance' | 'account'

  const [formData, setFormData] = useState({
    store_id: currentStoreId || (stores[0] ? stores[0].id : 1),
    name: '',
    rrn: '',
    hire_date: new Date().toISOString().split('T')[0],
    resign_date: '',
    position: '직원',
    dependents_count: 1,
    is_foreigner: 0,
    visa_type: '',
    employment_type: 'REGULAR', // 'REGULAR' | 'DAILY'
    wage_type: 'MONTHLY', // 'MONTHLY' | 'HOURLY'
    contract_salary: 2500000,
    hourly_wage: 10320,
    fixed_work_hours: '10:00~22:00',
    bank_name: '',
    account_number: '',
    has_car: 0,
    notes: '',

    // 4대보험 신고구조
    is_dual_reporting: 0,
    reported_salary: 0,
    withholding_rate: 10.0,
    payslip_display_mode: 'SPLIT_PAY', // 'SPLIT_PAY' | 'SINGLE_DEDUCTION'

    // 수습기간
    contract_duration_type: 'ONE_YEAR_OR_MORE', // 'ONE_YEAR_OR_MORE' | 'LESS_THAN_ONE_YEAR'
    is_simple_labor: 0,
    probation_applicable: 0,
    probation_start_date: new Date().toISOString().split('T')[0],
    probation_end_date: '',
    probation_rate: 90.0,

    // 비과세 및 4대보험/세금 선택 항목
    non_taxable_meal: 0,
    non_taxable_car: 0,
    non_taxable_overtime: 0,
    tax_exempt_income_tax: 1,
    tax_exempt_social_ins: 1,
    ins_national_pension: 1,
    ins_health: 1,
    ins_longterm_care: 1,
    ins_employment: 1,
    ins_work_accident: 1,
    deduct_income_tax: 1,
    deduct_local_tax: 1,
    fixed_national_pension: 0,
    ordinary_wage_items: ['basic_pay']
  });

  useEffect(() => {
    loadEmployees();
  }, [currentStoreId]);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const res = await api.getEmployees(currentStoreId);
      if (res.success) {
        setEmployees(res.employees);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStoreChange = (selectedStoreId) => {
    setFormData(prev => ({
      ...prev,
      store_id: selectedStoreId
    }));
  };

  const openCreateModal = () => {
    setEditingEmployee(null);
    setModalTab('basic');
    const defaultStore = stores.find(s => s.id === Number(currentStoreId)) || stores[0];
    const initialWageType = defaultStore ? defaultStore.default_wage_type : 'MONTHLY';

    setFormData({
      store_id: defaultStore ? defaultStore.id : 1,
      name: '',
      rrn: '',
      hire_date: new Date().toISOString().split('T')[0],
      resign_date: '',
      position: '직원',
      dependents_count: 1,
      is_foreigner: 0,
      visa_type: '',
      employment_type: 'REGULAR',
      wage_type: initialWageType,
      contract_salary: initialWageType === 'MONTHLY' ? 2500000 : 0,
      hourly_wage: 10320,
      fixed_work_hours: '10:00~22:00',
      bank_name: '',
      account_number: '',
      has_car: 0,
      notes: '',
      is_dual_reporting: 0,
      reported_salary: 0,
      withholding_rate: 10.0,
      payslip_display_mode: 'SPLIT_PAY',
      contract_duration_type: 'ONE_YEAR_OR_MORE',
      is_simple_labor: 0,
      probation_applicable: 0,
      probation_start_date: new Date().toISOString().split('T')[0],
      probation_end_date: '',
      probation_rate: 90.0,
      non_taxable_meal: 0,
      non_taxable_car: 0,
      non_taxable_overtime: 0,
      tax_exempt_income_tax: 1,
      tax_exempt_social_ins: 1,
      ins_national_pension: 1,
      ins_health: 1,
      ins_longterm_care: 1,
      ins_employment: 1,
      ins_work_accident: 1,
      deduct_income_tax: 1,
      deduct_local_tax: 1,
      fixed_national_pension: 0,
      ordinary_wage_items: ['basic_pay']
    });
    setIsModalOpen(true);
  };

  const openEditModal = (emp) => {
    setEditingEmployee(emp);
    setModalTab('basic');
    setFormData({
      store_id: emp.store_id,
      name: emp.name,
      rrn: emp.rrn_masked,
      hire_date: emp.hire_date,
      resign_date: emp.resign_date || '',
      position: emp.position || '직원',
      dependents_count: emp.dependents_count || 1,
      is_foreigner: emp.is_foreigner || 0,
      visa_type: emp.visa_type || '',
      employment_type: emp.employment_type || 'REGULAR',
      wage_type: emp.wage_type || 'MONTHLY',
      contract_salary: emp.contract_salary || 0,
      hourly_wage: emp.hourly_wage || 10320,
      fixed_work_hours: emp.fixed_work_hours || '10:00~22:00',
      bank_name: emp.bank_name || '',
      account_number: emp.account_number || '',
      has_car: emp.has_car || 0,
      notes: emp.notes || '',
      is_dual_reporting: emp.is_dual_reporting || 0,
      reported_salary: emp.reported_salary || 0,
      withholding_rate: emp.withholding_rate || 10.0,
      payslip_display_mode: emp.payslip_display_mode || 'SPLIT_PAY',
      contract_duration_type: emp.contract_duration_type || 'ONE_YEAR_OR_MORE',
      is_simple_labor: emp.is_simple_labor || 0,
      probation_applicable: emp.probation_applicable || 0,
      probation_start_date: emp.probation_start_date || emp.hire_date,
      probation_end_date: emp.probation_end_date || '',
      probation_rate: emp.probation_rate || 90.0,
      non_taxable_meal: emp.non_taxable_meal || 0,
      non_taxable_car: emp.non_taxable_car || 0,
      non_taxable_overtime: emp.non_taxable_overtime || 0,
      tax_exempt_income_tax: emp.tax_exempt_income_tax !== undefined ? emp.tax_exempt_income_tax : 1,
      tax_exempt_social_ins: emp.tax_exempt_social_ins !== undefined ? emp.tax_exempt_social_ins : 1,
      ins_national_pension: emp.ins_national_pension !== undefined ? emp.ins_national_pension : 1,
      ins_health: emp.ins_health !== undefined ? emp.ins_health : 1,
      ins_longterm_care: emp.ins_longterm_care !== undefined ? emp.ins_longterm_care : 1,
      ins_employment: emp.ins_employment !== undefined ? emp.ins_employment : 1,
      ins_work_accident: emp.ins_work_accident !== undefined ? emp.ins_work_accident : 1,
      deduct_income_tax: emp.deduct_income_tax !== undefined ? emp.deduct_income_tax : (emp.tax_exempt_income_tax !== undefined ? emp.tax_exempt_income_tax : 1),
      deduct_local_tax: emp.deduct_local_tax !== undefined ? emp.deduct_local_tax : 1,
      fixed_national_pension: emp.fixed_national_pension || 0,
      ordinary_wage_items: typeof emp.ordinary_wage_items === 'string' ? JSON.parse(emp.ordinary_wage_items || '["basic_pay"]') : (emp.ordinary_wage_items || ['basic_pay'])
    });
    setIsModalOpen(true);
  };

  const handleUnmaskRRN = async (empId) => {
    if (unmaskedRRNMap[empId]) {
      // Toggle off
      setUnmaskedRRNMap(prev => ({ ...prev, [empId]: null }));
      return;
    }
    try {
      const res = await api.unmaskRRN(empId);
      if (res.success) {
        setUnmaskedRRNMap(prev => ({ ...prev, [empId]: res.rrn }));
      }
    } catch (err) {
      alert(err.message || '주민등록번호 복호화 실패');
    }
  };

  // Determine probation legality
  const isProbationPermissible = formData.contract_duration_type === 'ONE_YEAR_OR_MORE' && formData.is_simple_labor === 0;

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (submitting) return;

    if (!formData.name || !formData.name.trim()) {
      alert('직원 성명을 입력해주세요.');
      setModalTab('basic');
      return;
    }

    if (!formData.hire_date) {
      alert('입사일자를 입력해주세요.');
      setModalTab('basic');
      return;
    }

    if (formData.wage_type === 'HOURLY' && formData.hourly_wage < 10320) {
      alert('2026년 최저시급(10,320원) 미만으로는 직원을 등록할 수 없습니다.');
      setModalTab('basic');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        store_id: Number(formData.store_id) || (stores[0] ? stores[0].id : 1),
        contract_salary: Number(formData.contract_salary) || 0,
        hourly_wage: Number(formData.hourly_wage) || 10320,
        reported_salary: Number(formData.reported_salary) || 0,
        withholding_rate: parseFloat(formData.withholding_rate) || 10.0,
        fixed_national_pension: Number(formData.fixed_national_pension) || 0
      };

      if (editingEmployee) {
        await api.updateEmployee(editingEmployee.id, payload);
      } else {
        await api.createEmployee(payload);
      }
      setIsModalOpen(false);
      await loadEmployees();
    } catch (err) {
      alert(err.message || '직원 정보 저장 실패');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (submitting) return;
    if (!window.confirm(`정말로 직원 [${name}]의 정보를 삭제하시겠습니까?\n과거 근태 및 급여 이력에 영향을 줄 수 있습니다.`)) {
      return;
    }
    setSubmitting(true);
    try {
      await api.deleteEmployee(id);
      await loadEmployees();
    } catch (err) {
      alert(err.message || '직원 삭제 실패');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
      {/* Fullscreen Buffering / Loading Overlay while Submitting */}
      {submitting && (
        <div className="loading-overlay">
          <div className="spinner" />
          <div style={{ color: '#fff', fontSize: '18px', fontWeight: '800', textAlign: 'center' }}>
            {editingEmployee ? '직원 정보를 수정하고 급여 기준을 동기화 중입니다...' : '새 직원을 등록하고 4대보험 및 급여 기준을 생성 중입니다...'}
          </div>
          <div style={{ color: '#93c5fd', fontSize: '13px', background: 'rgba(255,255,255,0.08)', padding: '8px 18px', borderRadius: '20px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
            🛡️ 데이터 무결성 보장을 위해 등록 완료 시까지 모든 화면 조작이 안전하게 차단됩니다.
          </div>
        </div>
      )}
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={22} color="#3b82f6" /> 직원 관리 (매장별)
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            매장별 직원의 인적사항, 급여 방식(월급/시급), 4대보험 이중신고 구조 및 수습기간을 설정합니다.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={() => setIsCalculatorOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid rgba(59, 130, 246, 0.4)' }}
          >
            <Calculator size={16} color="#60a5fa" /> 📊 엑셀 시급계산기 & 포괄시급 역산기
          </button>
          <button type="button" className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={16} /> 신규 직원 등록
          </button>
        </div>
      </div>

      {/* Employees Table */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="table-container" style={{ border: 'none' }}>
          <table>
            <thead>
              <tr>
                <th>소속 매장</th>
                <th>성명 / 직위</th>
                <th>주민등록번호</th>
                <th>고용/급여형태</th>
                <th>책정급여 / 시급</th>
                <th>4대보험 신고구조</th>
                <th>수습여부</th>
                <th>국적/비자</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    등록된 직원이 없습니다. 신규 직원을 등록해주세요.
                  </td>
                </tr>
              ) : (
                employees.map(emp => {
                  const isUnmasked = !!unmaskedRRNMap[emp.id];
                  const displayRRN = isUnmasked ? unmaskedRRNMap[emp.id] : emp.rrn_masked;

                  return (
                    <tr key={emp.id}>
                      <td>
                        <span className="badge badge-neutral">{emp.store_name}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: '700', color: '#fff' }}>{emp.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{emp.position} (입사: {emp.hire_date})</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-mono)' }}>
                          <span style={{ color: isUnmasked ? '#60a5fa' : 'var(--text-secondary)' }}>{displayRRN}</span>
                          <button 
                            type="button" 
                            onClick={() => handleUnmaskRRN(emp.id)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            title={isUnmasked ? '마스킹 처리' : '전체 번호 확인 (관리자 암호화 해제)'}
                          >
                            {isUnmasked ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          <span className={`badge ${emp.employment_type === 'DAILY' ? 'badge-warning' : 'badge-neutral'}`}>
                            {emp.employment_type === 'DAILY' ? '일용직' : '상용직'}
                          </span>
                          <span className={`badge ${emp.wage_type === 'HOURLY' ? 'badge-primary' : 'badge-purple'}`}>
                            {emp.wage_type === 'HOURLY' ? '시급제' : '월급제'}
                          </span>
                        </div>
                      </td>
                      <td>
                        {emp.wage_type === 'MONTHLY' ? (
                          <div style={{ fontWeight: '700', color: '#fff' }} className="num-font">
                            {(emp.contract_salary || 0).toLocaleString()}원/월
                          </div>
                        ) : (
                          <div style={{ fontWeight: '700', color: '#60a5fa' }} className="num-font">
                            {(emp.hourly_wage || 10320).toLocaleString()}원/시
                          </div>
                        )}
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>고정: {emp.fixed_work_hours}</div>
                      </td>
                      <td>
                        {emp.is_dual_reporting ? (
                          <div>
                            <span className="badge badge-warning">⚡ 이중신고 On</span>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                              신고: {(emp.reported_salary || 0).toLocaleString()}원 ({emp.withholding_rate}% 공제)
                            </div>
                          </div>
                        ) : (
                          <span className="badge badge-neutral">일반 실지급 연동</span>
                        )}
                      </td>
                      <td>
                        {emp.probation_applicable ? (
                          <span className="badge badge-purple">수습 {emp.probation_rate}%</span>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>적용안함</span>
                        )}
                      </td>
                      <td>
                        {emp.is_foreigner ? (
                          <span className="badge badge-warning">외국인 ({emp.visa_type || '비자'})</span>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>내국인</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEditModal(emp)} title="수정">
                            <Edit2 size={13} />
                          </button>
                          <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => handleDelete(emp.id, emp.name)} title="삭제">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Employee Modal with Rich Tabbed Configuration */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        size="large"
        title={editingEmployee ? `직원 정보 수정: ${editingEmployee.name}` : '신규 직원 등록'}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)} disabled={submitting}>
              취소
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? '저장 처리 중...' : (editingEmployee ? '수정사항 저장' : '직원 등록 완료')}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '20px', paddingBottom: '10px' }}>
          <button 
            type="button" 
            className={`btn btn-sm ${modalTab === 'basic' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setModalTab('basic')}
          >
            1. 기본 인적정보
          </button>
          <button 
            type="button" 
            className={`btn btn-sm ${modalTab === 'wage' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setModalTab('wage')}
          >
            2. 급여 & 수습기간
          </button>
          <button 
            type="button" 
            className={`btn btn-sm ${modalTab === 'insurance' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setModalTab('insurance')}
          >
            3. 4대보험 & 세금 & 비과세
          </button>
          <button 
            type="button" 
            className={`btn btn-sm ${modalTab === 'account' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setModalTab('account')}
          >
            4. 계좌 및 기타
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* TAB 1: BASIC INFO */}
          {modalTab === 'basic' && (
            <>
              {/* Wage Type Selection in Tab 1 */}
              <div style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)', padding: '14px 16px', borderRadius: 'var(--radius-md)' }}>
                <label className="form-label" style={{ fontWeight: '700', color: '#fff', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <DollarSign size={16} color="#60a5fa" /> 직원 급여 지급 형태 선택 (매장 내 월급제/시급제 직원 개별 지정) *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <label 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '12px 14px',
                      background: formData.wage_type === 'MONTHLY' ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-surface)',
                      border: formData.wage_type === 'MONTHLY' ? '2px solid #3b82f6' : '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      margin: 0
                    }}
                  >
                    <input 
                      type="radio" 
                      name="wage_type_tab1"
                      value="MONTHLY"
                      checked={formData.wage_type === 'MONTHLY'}
                      onChange={() => setFormData({ ...formData, wage_type: 'MONTHLY' })}
                      style={{ width: '18px', height: '18px', accentColor: '#3b82f6' }}
                    />
                    <div>
                      <div style={{ fontWeight: '700', color: formData.wage_type === 'MONTHLY' ? '#60a5fa' : '#fff', fontSize: '13.5px' }}>
                        🟢 월급제 직원
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        고정 책정 월급 + 중도입퇴사 일할계산
                      </div>
                    </div>
                  </label>

                  <label 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '12px 14px',
                      background: formData.wage_type === 'HOURLY' ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-surface)',
                      border: formData.wage_type === 'HOURLY' ? '2px solid #10b981' : '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      margin: 0
                    }}
                  >
                    <input 
                      type="radio" 
                      name="wage_type_tab1"
                      value="HOURLY"
                      checked={formData.wage_type === 'HOURLY'}
                      onChange={() => setFormData({ ...formData, wage_type: 'HOURLY' })}
                      style={{ width: '18px', height: '18px', accentColor: '#10b981' }}
                    />
                    <div>
                      <div style={{ fontWeight: '700', color: formData.wage_type === 'HOURLY' ? '#34d399' : '#fff', fontSize: '13.5px' }}>
                        🔵 시급제 직원 (알바/파트)
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        실제 근태 근무시간 × 시급 + 주휴수당
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">소속 매장 *</label>
                  <select 
                    className="form-select"
                    value={formData.store_id}
                    onChange={(e) => handleStoreChange(e.target.value)}
                    required
                  >
                    {stores.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">직원 성명 *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={formData.name} 
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                    placeholder="예: 김철수" 
                    required 
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">주민등록번호 (AES-256 암호화 저장) *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={formData.rrn} 
                    onChange={(e) => setFormData({ ...formData, rrn: e.target.value })} 
                    placeholder="650420-2******" 
                    required={!editingEmployee}
                  />
                  {(() => {
                    const rrnVal = formData.rrn || (editingEmployee ? editingEmployee.rrn_masked : '');
                    const clean = (rrnVal || '').replace(/[^0-9]/g, '');
                    if (clean.length >= 7) {
                      const yy = parseInt(clean.substring(0, 2), 10);
                      const mm = parseInt(clean.substring(2, 4), 10);
                      const g = parseInt(clean.charAt(6), 10);
                      let bYear = 1900 + yy;
                      if (g === 3 || g === 4 || g === 7 || g === 8) bYear = 2000 + yy;
                      else if (g === 9 || g === 0) bYear = 1800 + yy;
                      let age = 2026 - bYear;
                      if (7 < mm) age -= 1;

                      if (age >= 65) {
                        return (
                          <div style={{ marginTop: '4px', fontSize: '11.5px', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span className="badge badge-danger" style={{ fontSize: '10px' }}>만 {age}세</span>
                            <strong>💡 만 65세 이상: 국민연금 및 고용보험(실업급여) 법정 면제 대상</strong>
                          </div>
                        );
                      } else if (age >= 60) {
                        return (
                          <div style={{ marginTop: '4px', fontSize: '11.5px', color: '#fde68a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span className="badge badge-warning" style={{ fontSize: '10px' }}>만 {age}세</span>
                            <strong>💡 만 60세 이상: 국민연금 법정 면제 대상 (고용/건강보험만 적용)</strong>
                          </div>
                        );
                      } else {
                        return (
                          <div style={{ marginTop: '4px', fontSize: '11.5px', color: '#93c5fd', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span className="badge badge-primary" style={{ fontSize: '10px' }}>만 {age}세</span>
                            <span>만 18~59세: 4대보험 정상 가입 대상</span>
                          </div>
                        );
                      }
                    }
                    return <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>* 목록 및 명세서에는 자동으로 마스킹(900101-1******) 처리됩니다.</span>;
                  })()}
                </div>
                <div className="form-group">
                  <label className="form-label">직위 / 역할</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={formData.position} 
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })} 
                    placeholder="예: 점장, 주방장, 홀서빙, 파트타이머" 
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">입사일자 *</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={formData.hire_date} 
                    onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">퇴사일자 (해당 시)</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={formData.resign_date} 
                    onChange={(e) => setFormData({ ...formData, resign_date: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">부양가족 수 (본인 포함) *</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="11" 
                    className="form-input" 
                    value={formData.dependents_count} 
                    onChange={(e) => setFormData({ ...formData, dependents_count: parseInt(e.target.value) || 1 })} 
                    required 
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">고용 형태</label>
                  <select 
                    className="form-select"
                    value={formData.employment_type}
                    onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                  >
                    <option value="REGULAR">상용직 (정규직 / 계약직)</option>
                    <option value="DAILY">일용직 (일 단위 근로계약 / 15만원 비과세)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">차량 보유 여부 (자가운전보조금용)</label>
                  <select 
                    className="form-select"
                    value={formData.has_car}
                    onChange={(e) => setFormData({ ...formData, has_car: parseInt(e.target.value), non_taxable_car: parseInt(e.target.value) })}
                  >
                    <option value="0">미보유 (자가운전보조금 불가)</option>
                    <option value="1">본인명의 차량 보유 (월 20만원 비과세 가능)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">국적 및 체류자격 *</label>
                  <select 
                    className="form-select"
                    value={formData.is_foreigner}
                    onChange={(e) => {
                      const isFor = parseInt(e.target.value);
                      setFormData({ 
                        ...formData, 
                        is_foreigner: isFor,
                        visa_type: isFor === 1 && !formData.visa_type ? 'D-2' : (isFor === 0 ? '' : formData.visa_type)
                      });
                    }}
                  >
                    <option value="0">내국인 (대한민국 국적)</option>
                    <option value="1">외국인 (비자/체류자격 보유자)</option>
                  </select>
                </div>
              </div>

              {/* Foreign Worker Visa Guidelines & Regulatory Standards */}
              {formData.is_foreigner === 1 && (() => {
                const visaKey = (formData.visa_type || '').toUpperCase().trim();
                const matchedKey = Object.keys(VISA_GUIDES).find(k => visaKey.startsWith(k)) || 'OTHER';
                const guide = VISA_GUIDES[matchedKey] || VISA_GUIDES['OTHER'];

                return (
                  <div style={{ background: 'rgba(30, 41, 59, 0.95)', border: '1px solid rgba(59, 130, 246, 0.4)', padding: '16px', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '-4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      <label className="form-label" style={{ fontWeight: '700', color: '#60a5fa', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        🌐 외국인 비자(체류자격) 선택 및 법정 근무기준
                      </label>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <select 
                          className="form-select"
                          style={{ width: '180px', padding: '6px 10px', fontSize: '12.5px', background: '#0f172a', borderColor: '#3b82f6' }}
                          value={Object.keys(VISA_GUIDES).includes(matchedKey) && matchedKey !== 'OTHER' ? matchedKey : 'CUSTOM'}
                          onChange={(e) => {
                            if (e.target.value !== 'CUSTOM') {
                              setFormData({ ...formData, visa_type: e.target.value });
                            }
                          }}
                        >
                          <option value="D-2">D-2 (유학 / 학위과정)</option>
                          <option value="D-4">D-4 (일반연수 / 어학연수)</option>
                          <option value="H-2">H-2 (방문취업 / 외국동포)</option>
                          <option value="E-9">E-9 (비전문취업 / 고용허가)</option>
                          <option value="F-4">F-4 (재외동포)</option>
                          <option value="F-5">F-5 (영주권)</option>
                          <option value="F-6">F-6 (결혼이민)</option>
                          <option value="F-2">F-2 (거주)</option>
                          <option value="E-7">E-7 (전문조리사 등)</option>
                          <option value="CUSTOM">✏️ 직접 입력</option>
                        </select>
                        <input 
                          type="text" 
                          className="form-input" 
                          style={{ width: '100px', padding: '6px 10px', fontSize: '12.5px' }}
                          value={formData.visa_type} 
                          onChange={(e) => setFormData({ ...formData, visa_type: e.target.value })} 
                          placeholder="비자 코드" 
                          required={formData.is_foreigner === 1}
                        />
                      </div>
                    </div>

                    {/* Guidelines Details Box */}
                    <div style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
                        <span style={{ fontWeight: '800', color: '#fff', fontSize: '13.5px' }}>
                          📋 {guide.title}
                        </span>
                        <span className="badge badge-primary" style={{ fontSize: '11px' }}>
                          {guide.category}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px', marginTop: '4px' }}>
                        <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.6' }}>
                          <strong style={{ color: '#60a5fa' }}>⏱️ 허용 근로시간:</strong><br />
                          {guide.workHours}
                        </div>
                        <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.6' }}>
                          <strong style={{ color: '#f59e0b' }}>📜 필수 인허가/신고:</strong><br />
                          {guide.permits}
                        </div>
                        <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.6' }}>
                          <strong style={{ color: '#34d399' }}>🛡️ 4대보험 & 전용보험:</strong><br />
                          {guide.socialIns}
                        </div>
                        <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.6' }}>
                          <strong style={{ color: '#a78bfa' }}>💼 요식업 직종 및 주의사항:</strong><br />
                          {guide.allowedJobs}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </>
          )}

          {/* TAB 2: WAGE & PROBATION */}
          {modalTab === 'wage' && (
            <>
              {/* Hourly Wage Calculator Shortcut Banner */}
              <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '12px 16px', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <div style={{ fontWeight: '700', color: '#60a5fa', fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calculator size={16} /> 📊 엑셀 시급계산기 & 포괄수당 자동 분할기
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    9.5시간 6일 / 9시간 6일 / 4.5시간 파트 등 표준 패턴에 맞춰 통상시급과 수당을 1초 만에 자동 계산합니다.
                  </div>
                </div>
                <button 
                  type="button" 
                  className="btn btn-sm btn-primary"
                  onClick={() => setIsCalculatorOpen(true)}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  시급계산기 열기
                </button>
              </div>

              {/* Wage Type Selection in Tab 2 */}
              <div style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)', padding: '14px 16px', borderRadius: 'var(--radius-md)' }}>
                <label className="form-label" style={{ fontWeight: '700', color: '#fff', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <DollarSign size={16} color="#60a5fa" /> 직원 급여 지급 형태 선택 *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <label 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '12px 14px',
                      background: formData.wage_type === 'MONTHLY' ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-surface)',
                      border: formData.wage_type === 'MONTHLY' ? '2px solid #3b82f6' : '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      margin: 0
                    }}
                  >
                    <input 
                      type="radio" 
                      name="wage_type_tab2"
                      value="MONTHLY"
                      checked={formData.wage_type === 'MONTHLY'}
                      onChange={() => setFormData({ ...formData, wage_type: 'MONTHLY' })}
                      style={{ width: '18px', height: '18px', accentColor: '#3b82f6' }}
                    />
                    <div>
                      <div style={{ fontWeight: '700', color: formData.wage_type === 'MONTHLY' ? '#60a5fa' : '#fff', fontSize: '13.5px' }}>
                        🟢 월급제 직원
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        고정 책정 월급 + 중도입퇴사 일할계산
                      </div>
                    </div>
                  </label>

                  <label 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '12px 14px',
                      background: formData.wage_type === 'HOURLY' ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-surface)',
                      border: formData.wage_type === 'HOURLY' ? '2px solid #10b981' : '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      margin: 0
                    }}
                  >
                    <input 
                      type="radio" 
                      name="wage_type_tab2"
                      value="HOURLY"
                      checked={formData.wage_type === 'HOURLY'}
                      onChange={() => setFormData({ ...formData, wage_type: 'HOURLY' })}
                      style={{ width: '18px', height: '18px', accentColor: '#10b981' }}
                    />
                    <div>
                      <div style={{ fontWeight: '700', color: formData.wage_type === 'HOURLY' ? '#34d399' : '#fff', fontSize: '13.5px' }}>
                        🔵 시급제 직원 (알바/파트)
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        실제 근태 근무시간 × 시급 + 주휴수당
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {formData.wage_type === 'MONTHLY' ? (
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">책정급여 (월급) *</label>
                    <input 
                      type="number" 
                      step="10000" 
                      className="form-input" 
                      value={formData.contract_salary} 
                      onChange={(e) => setFormData({ ...formData, contract_salary: parseInt(e.target.value) || 0 })} 
                      placeholder="3600000" 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">통상시급 (선택, 명세서 역산용)</label>
                    <input 
                      type="number" 
                      step="1" 
                      className="form-input" 
                      value={formData.hourly_wage || ''} 
                      onChange={(e) => setFormData({ ...formData, hourly_wage: parseInt(e.target.value) || 0 })} 
                      placeholder="예: 11229 (미입력 시 월급/209h)" 
                    />
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>* 미입력 시 포괄 역산 시급이 적용되며, 법정 최저시급(10,320원) 이상으로 자동 보정됩니다.</span>
                  </div>
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">약정 시급 (2026년 최저시급 10,320원 이상) *</label>
                  <input 
                    type="number" 
                    min="10320" 
                    step="10" 
                    className="form-input" 
                    value={formData.hourly_wage} 
                    onChange={(e) => setFormData({ ...formData, hourly_wage: parseInt(e.target.value) || 10320 })} 
                    required 
                  />
                  <div style={{ marginTop: '6px', fontSize: '11.5px', color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>💡 주 15시간 이상 근무 시 법정 주휴수당(시급 × 8h / 40h 비율)이 급여 계산 시 자동으로 합산 산출됩니다.</span>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">고정근무시간 (근태 캘린더 기본값 자동 채움용)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formData.fixed_work_hours} 
                  onChange={(e) => setFormData({ ...formData, fixed_work_hours: e.target.value })} 
                  placeholder="10:00~22:00" 
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>* 월급제 직원은 이 시간이 매달 근태 캘린더에 기본으로 자동 배치됩니다.</span>
              </div>

              {/* Probation Legality Rule Box */}
              <div style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#fff', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={16} color="#60a5fa" /> 수습기간 및 감액 적법성 자동 판정
                </h4>

                <div className="form-row" style={{ marginBottom: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">근로계약 기간</label>
                    <select 
                      className="form-select"
                      value={formData.contract_duration_type}
                      onChange={(e) => setFormData({ ...formData, contract_duration_type: e.target.value })}
                    >
                      <option value="ONE_YEAR_OR_MORE">1년 이상 근로계약</option>
                      <option value="LESS_THAN_ONE_YEAR">1년 미만 근로계약 (수습감액 불가)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">직종 분류 (단순노무직 여부)</label>
                    <select 
                      className="form-select"
                      value={formData.is_simple_labor}
                      onChange={(e) => setFormData({ ...formData, is_simple_labor: parseInt(e.target.value) })}
                    >
                      <option value="0">일반직 (조리, 매니저, 전문서비스 등)</option>
                      <option value="1">단순노무직 (단순서빙/청소/배달 - 감액 불가)</option>
                    </select>
                  </div>
                </div>

                {!isProbationPermissible ? (
                  <div style={{ background: 'var(--danger-bg)', border: '1px solid rgba(239,68,68,0.4)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', color: '#fca5a5', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={16} />
                    <span><strong>최저임금법 시행령 규정</strong>: 1년 미만 근로계약이거나 단순노무직인 경우 수습감액 적용이 법적으로 금지되므로 수습감액 설정이 비활성화됩니다.</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                    <label className="form-check">
                      <input 
                        type="checkbox" 
                        checked={formData.probation_applicable === 1} 
                        onChange={(e) => setFormData({ ...formData, probation_applicable: e.target.checked ? 1 : 0 })} 
                      />
                      <span style={{ fontWeight: '700', color: '#fff' }}>수습기간 감액 적용</span>
                    </label>

                    {formData.probation_applicable === 1 && (
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">수습 시작일</label>
                          <input 
                            type="date" 
                            className="form-input" 
                            value={formData.probation_start_date} 
                            onChange={(e) => setFormData({ ...formData, probation_start_date: e.target.value })} 
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">수습 종료일</label>
                          <input 
                            type="date" 
                            className="form-input" 
                            value={formData.probation_end_date} 
                            onChange={(e) => setFormData({ ...formData, probation_end_date: e.target.value })} 
                            required={formData.probation_applicable === 1}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">수습 지급률 (%)</label>
                          <input 
                            type="number" 
                            min="90" 
                            max="100" 
                            step="1" 
                            className="form-input" 
                            value={formData.probation_rate} 
                            onChange={(e) => setFormData({ ...formData, probation_rate: parseFloat(e.target.value) || 90 })} 
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}


          {/* TAB 3: 4대보험 & 세금 & 이중신고 & 비과세 */}
          {modalTab === 'insurance' && (() => {
            const rrnVal = formData.rrn || (editingEmployee ? editingEmployee.rrn_masked : '');
            const clean = (rrnVal || '').replace(/[^0-9]/g, '');
            let empAge = null;
            if (clean.length >= 7) {
              const yy = parseInt(clean.substring(0, 2), 10);
              const mm = parseInt(clean.substring(2, 4), 10);
              const g = parseInt(clean.charAt(6), 10);
              let bYear = 1900 + yy;
              if (g === 3 || g === 4 || g === 7 || g === 8) bYear = 2000 + yy;
              else if (g === 9 || g === 0) bYear = 1800 + yy;
              empAge = 2026 - bYear;
              if (7 < mm) empAge -= 1;
            }
            const isPensionExempt = empAge !== null && empAge >= 60;
            const isEmploymentExempt = empAge !== null && empAge >= 65;

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* 1. 4대보험 개별 선택 섹션 */}
                <div style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                      🛡️ 4대보험 가입 및 공제 선택
                    </h4>
                    {empAge !== null && (
                      <span className="badge badge-primary" style={{ fontSize: '11.5px', padding: '3px 8px' }}>
                        현재 나이: <strong>만 {empAge}세</strong>
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {/* 국민연금 */}
                    <div style={{ padding: '10px 12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: isPensionExempt ? '1px solid rgba(245,158,11,0.4)' : '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <label className="form-check" style={{ margin: 0 }}>
                          <input 
                            type="checkbox" 
                            checked={formData.ins_national_pension === 1} 
                            onChange={(e) => {
                              const checked = e.target.checked;
                              if (checked && isPensionExempt) {
                                alert(`[안내] 이 직원은 현재 만 ${empAge}세로 국민연금 의무가입 대상(만 60세 미만)에서 제외됩니다.\n본인 희망 시 '임의계속가입'으로 가입할 수 있습니다.`);
                              }
                              setFormData({ ...formData, ins_national_pension: checked ? 1 : 0 });
                            }} 
                          />
                          <span style={{ fontWeight: '700', color: '#fff' }}>국민연금 (4.5% 공제)</span>
                        </label>
                        {isPensionExempt && (
                          <span className="badge badge-warning" style={{ fontSize: '11px' }}>
                            ⚠️ 만 60세 이상 (의무가입 제외)
                          </span>
                        )}
                      </div>

                      {/* 국민연금 결정세액/결정고지금액 입력란 */}
                      {formData.ins_national_pension === 1 && (
                        <div style={{ marginTop: '10px', padding: '10px 12px', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '6px', border: '1px solid rgba(59, 130, 246, 0.25)', marginLeft: '24px' }}>
                          <label style={{ fontSize: '12px', fontWeight: '700', color: '#93c5fd', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                            🏢 국민연금 결정고지금액 (선택사항)
                          </label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                              type="number"
                              className="form-input"
                              style={{ width: '180px', padding: '6px 10px', fontSize: '13px', background: 'var(--bg-surface-elevated)', color: '#fff', border: '1px solid rgba(147, 197, 253, 0.4)' }}
                              placeholder="미입력 시 자동계산"
                              value={formData.fixed_national_pension ? formData.fixed_national_pension : ''}
                              onChange={(e) => setFormData({ ...formData, fixed_national_pension: parseInt(e.target.value, 10) || 0 })}
                            />
                            <span style={{ fontSize: '12.5px', color: '#cbd5e1', fontWeight: '600' }}>원</span>
                            {formData.fixed_national_pension > 0 && (
                              <button
                                type="button"
                                className="btn btn-sm btn-ghost"
                                style={{ fontSize: '11px', padding: '2px 8px', color: '#f87171' }}
                                onClick={() => setFormData({ ...formData, fixed_national_pension: 0 })}
                              >
                                초기화 (자동계산)
                              </button>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '5px', lineHeight: '1.4' }}>
                            * 공단 고지 결정세액을 입력하면 해당 금액이 <strong>우선 고정 공제</strong>되며, <strong>미입력(0원) 시 지급합계(과세급여) 기준 4.5%로 매월 자동 계산</strong>됩니다.
                          </div>
                        </div>
                      )}

                      {isPensionExempt && (
                        <div style={{ fontSize: '11.5px', color: '#fbbf24', marginTop: '6px', paddingLeft: '24px' }}>
                          💡 만 60세 이상은 국민연금 의무가입 대상에서 제외됩니다. (체크 해제 시 연금보험료 0원 처리)
                        </div>
                      )}
                    </div>

                    {/* 건강보험 & 장기요양보험 */}
                    <div style={{ padding: '10px 12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                        <label className="form-check" style={{ margin: 0 }}>
                          <input 
                            type="checkbox" 
                            checked={formData.ins_health === 1} 
                            onChange={(e) => setFormData({ 
                              ...formData, 
                              ins_health: e.target.checked ? 1 : 0,
                              ins_longterm_care: e.target.checked ? formData.ins_longterm_care : 0 
                            })} 
                          />
                          <span style={{ fontWeight: '700', color: '#fff' }}>건강보험 (3.545% 공제)</span>
                        </label>
                        <label className="form-check" style={{ margin: 0 }}>
                          <input 
                            type="checkbox" 
                            checked={formData.ins_longterm_care === 1} 
                            onChange={(e) => setFormData({ ...formData, ins_longterm_care: e.target.checked ? 1 : 0 })}
                            disabled={formData.ins_health === 0}
                          />
                          <span style={{ fontWeight: '600', color: formData.ins_health === 0 ? 'var(--text-muted)' : '#cbd5e1' }}>
                            장기요양보험 (건보료의 12.95%)
                          </span>
                        </label>
                      </div>
                    </div>

                    {/* 고용보험 */}
                    <div style={{ padding: '10px 12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: isEmploymentExempt ? '1px solid rgba(245,158,11,0.4)' : '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <label className="form-check" style={{ margin: 0 }}>
                          <input 
                            type="checkbox" 
                            checked={formData.ins_employment === 1} 
                            onChange={(e) => {
                              const checked = e.target.checked;
                              if (checked && isEmploymentExempt) {
                                alert(`[안내] 이 직원은 현재 만 ${empAge}세로 만 65세 이후 신규 채용된 경우 고용보험(실업급여) 적용제외 대상입니다.`);
                              }
                              setFormData({ ...formData, ins_employment: checked ? 1 : 0 });
                            }} 
                          />
                          <span style={{ fontWeight: '700', color: '#fff' }}>고용보험 (0.9% 공제)</span>
                        </label>
                        {isEmploymentExempt && (
                          <span className="badge badge-warning" style={{ fontSize: '11px' }}>
                            ⚠️ 만 65세 이상 (실업급여 적용제외)
                          </span>
                        )}
                      </div>
                      {isEmploymentExempt && (
                        <div style={{ fontSize: '11.5px', color: '#fbbf24', marginTop: '6px', paddingLeft: '24px' }}>
                          💡 만 65세 이후 신규 고용된 직원은 실업급여 적용제외 대상입니다. (체크 해제 시 고용보험료 0원 처리)
                        </div>
                      )}
                    </div>

                    {/* 산재보험 */}
                    <div style={{ padding: '10px 12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                      <label className="form-check" style={{ margin: 0 }}>
                        <input 
                          type="checkbox" 
                          checked={formData.ins_work_accident === 1} 
                          onChange={(e) => setFormData({ ...formData, ins_work_accident: e.target.checked ? 1 : 0 })} 
                        />
                        <span style={{ fontWeight: '700', color: '#fff' }}>산재보험 (사업주 전액부담 / 0.9%)</span>
                      </label>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', paddingLeft: '24px' }}>
                        * 근로자 급여에서 공제되지 않으며 매장 사업주가 100% 부담합니다.
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. 소득세 / 지방소득세 원천징수 선택 섹션 */}
                <div style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#fff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                    💰 근로소득세 및 지방소득세 원천징수 설정
                  </h4>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                    <div style={{ padding: '10px 12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                      <label className="form-check" style={{ margin: 0 }}>
                        <input 
                          type="checkbox" 
                          checked={formData.deduct_income_tax === 1} 
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            deduct_income_tax: e.target.checked ? 1 : 0,
                            deduct_local_tax: e.target.checked ? formData.deduct_local_tax : 0 
                          })} 
                        />
                        <span style={{ fontWeight: '700', color: '#fff' }}>소득세 원천징수</span>
                      </label>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', paddingLeft: '24px' }}>
                        국세청 간이세액표 기준 자동 산출 (월 106만원 이하 면세)
                      </div>
                    </div>

                    <div style={{ padding: '10px 12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                      <label className="form-check" style={{ margin: 0 }}>
                        <input 
                          type="checkbox" 
                          checked={formData.deduct_local_tax === 1} 
                          onChange={(e) => setFormData({ ...formData, deduct_local_tax: e.target.checked ? 1 : 0 })}
                          disabled={formData.deduct_income_tax === 0}
                        />
                        <span style={{ fontWeight: '700', color: formData.deduct_income_tax === 0 ? 'var(--text-muted)' : '#fff' }}>
                          지방소득세 원천징수 (10%)
                        </span>
                      </label>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', paddingLeft: '24px' }}>
                        소득세의 10% (10원 단위 절사) 자동 산출
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Dual Reporting Structure */}
                <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#60a5fa', margin: 0 }}>
                      ⚡ 4대보험 이중신고 구조 (관리자 전용 설정)
                    </h4>
                    <label className="form-check" style={{ margin: 0 }}>
                      <input 
                        type="checkbox" 
                        checked={formData.is_dual_reporting === 1} 
                        onChange={(e) => setFormData({ ...formData, is_dual_reporting: e.target.checked ? 1 : 0 })} 
                      />
                      <span style={{ fontWeight: '700' }}>이중신고 구조 On</span>
                    </label>
                  </div>

                  {formData.is_dual_reporting === 1 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">별도 4대보험 신고기준액 *</label>
                          <input 
                            type="number" 
                            step="10000" 
                            className="form-input" 
                            value={formData.reported_salary} 
                            onChange={(e) => setFormData({ ...formData, reported_salary: parseInt(e.target.value) || 0 })} 
                            placeholder="2500000" 
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">미신고차액 원천공제율 (%)</label>
                          <input 
                            type="number" 
                            step="0.5" 
                            className="form-input" 
                            value={formData.withholding_rate} 
                            onChange={(e) => setFormData({ ...formData, withholding_rate: parseFloat(e.target.value) || 10 })} 
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">급여명세서 표시 방식</label>
                        <select 
                          className="form-select"
                          value={formData.payslip_display_mode}
                          onChange={(e) => setFormData({ ...formData, payslip_display_mode: e.target.value })}
                        >
                          <option value="SPLIT_PAY">사업자통장 지급분 / 개인통장 지급분 2줄 분리 표시</option>
                          <option value="SINGLE_DEDUCTION">공제내역에 '미신고공제' 단일 항목 한 줄 처리</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Non-Taxable Settings */}
                <div style={{ background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#fff', marginBottom: '12px', margin: 0 }}>
                    비과세 항목 적용 여부
                  </h4>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                    <label className="form-check" style={{ opacity: 0.6, cursor: 'not-allowed', margin: 0 }}>
                      <input type="checkbox" checked={false} disabled />
                      <span>식대 비과세 (회사에서 식사를 제공하므로 전사 공통 OFF 비활성화)</span>
                    </label>

                    <label className="form-check" style={{ margin: 0 }}>
                      <input 
                        type="checkbox" 
                        checked={formData.non_taxable_car === 1} 
                        onChange={(e) => setFormData({ ...formData, non_taxable_car: e.target.checked ? 1 : 0 })} 
                        disabled={formData.has_car === 0}
                      />
                      <span>자가운전보조금 비과세 (월 20만원 한도, 자차 보유 직원 전용)</span>
                    </label>

                    <label className="form-check" style={{ margin: 0 }}>
                      <input 
                        type="checkbox" 
                        checked={formData.non_taxable_overtime === 1} 
                        onChange={(e) => setFormData({ ...formData, non_taxable_overtime: e.target.checked ? 1 : 0 })} 
                      />
                      <span>조리/생산직 연장·야간·휴일수당 비과세 (월정액급여 210만원 이하, 연 240만원 한도)</span>
                    </label>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* TAB 4: ACCOUNT & OTHERS */}
          {modalTab === 'account' && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">급여 지급 은행</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={formData.bank_name} 
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })} 
                    placeholder="예: 신한은행, 국민은행, 카카오뱅크" 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">계좌번호</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={formData.account_number} 
                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value })} 
                    placeholder="110-123-456789" 
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-check">
                  <input 
                    type="checkbox" 
                    checked={formData.has_car === 1} 
                    onChange={(e) => setFormData({ ...formData, has_car: e.target.checked ? 1 : 0 })} 
                  />
                  <span style={{ fontWeight: '700', color: '#fff' }}>자차 보유 (자가운전보조금 지급 대상)</span>
                </label>
              </div>

              <div className="form-group">
                <label className="form-label">관리자 메모 / 비고</label>
                <textarea 
                  className="form-textarea" 
                  rows="3" 
                  value={formData.notes} 
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })} 
                  placeholder="특이사항, 고정근무 패턴 등..." 
                />
              </div>
            </>
          )}
        </form>
      </Modal>

      {/* Hourly Wage & Package Wage Calculator Modal */}
      <HourlyWageCalculatorModal 
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        initialData={formData}
        onApplyToEmployee={(vals) => {
          setFormData(prev => ({
            ...prev,
            ...vals
          }));
        }}
      />
    </div>
  );
}
