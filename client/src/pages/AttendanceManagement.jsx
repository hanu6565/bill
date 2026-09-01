import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, Clock, Upload, Check, AlertCircle, 
  ChevronLeft, ChevronRight, Zap, RefreshCw, FileSpreadsheet, Moon, Sun,
  Plus, Trash2 
} from 'lucide-react';
import api from '../services/api';
import Modal from '../components/Modal';

export default function AttendanceManagement({ stores, currentStoreId, setCurrentStoreId }) {
  const [yearMonth, setYearMonth] = useState('2026-09');
  const [selectedStoreId, setSelectedStoreId] = useState(currentStoreId || (stores[0] ? stores[0].id : 1));
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [attendanceList, setAttendanceList] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(false);

  // Edit Single Day Modal
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);
  const [selectedDayRecord, setSelectedDayRecord] = useState({
    work_date: '',
    clock_in: '10:00',
    clock_out: '22:00',
    break_minutes: 60,
    is_absent: 0,
    is_unpaid_leave: 0,
    is_annual_leave: 0,
    memo: ''
  });

  // Quick Fill Modal
  const [isQuickFillModalOpen, setIsQuickFillModalOpen] = useState(false);
  const [quickOffDates, setQuickOffDates] = useState(new Set());
  const [quickDefaultIn, setQuickDefaultIn] = useState('10:00');
  const [quickDefaultOut, setQuickDefaultOut] = useState('22:00');
  const [quickDefaultBreak, setQuickDefaultBreak] = useState(60);

  // Excel Upload Modal
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [excelFile, setExcelFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (currentStoreId && currentStoreId !== selectedStoreId) {
      setSelectedStoreId(currentStoreId);
    }
  }, [currentStoreId]);

  useEffect(() => {
    loadEmployees();
    loadHolidays();
  }, [selectedStoreId, yearMonth]);

  useEffect(() => {
    if (selectedEmployeeId) {
      loadAttendance();
    }
  }, [selectedEmployeeId, yearMonth]);

  const loadEmployees = async () => {
    try {
      const res = await api.getEmployees(selectedStoreId);
      if (res.success) {
        setEmployees(res.employees);
        if (res.employees.length > 0) {
          if (!selectedEmployeeId || !res.employees.find(e => e.id === Number(selectedEmployeeId))) {
            setSelectedEmployeeId(res.employees[0].id);
          }
        } else {
          setSelectedEmployeeId(null);
          setAttendanceList([]);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadHolidays = async () => {
    try {
      const [yStr, mStr] = yearMonth.split('-');
      const res = await api.getHolidays(yStr, mStr);
      if (res.success) {
        setHolidays(res.holidays);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadAttendance = async () => {
    if (!selectedEmployeeId) return;
    setLoading(true);
    try {
      const res = await api.getAttendance(selectedEmployeeId, selectedStoreId, yearMonth);
      if (res.success) {
        setAttendanceList(res.records);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const currentEmployee = employees.find(e => e.id === Number(selectedEmployeeId));

  // Calendar calculations
  const [yearStr, monthStr] = yearMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const totalDays = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0 = Sun

  const holidayMap = {};
  holidays.forEach(h => {
    holidayMap[h.holiday_date] = h;
  });

  const attendanceMap = {};
  attendanceList.forEach(a => {
    attendanceMap[a.work_date] = a;
  });

  // Summary Metrics
  let totalNetHours = 0;
  let totalOvertimeHours = 0;
  let totalNightHours = 0;
  let totalHolidayHours = 0;
  let totalPubHolidayHours = 0;
  let workingDaysCount = 0;
  let weekdayOffCount = 0;
  let weekendWorkCount = 0;

  for (let d = 1; d <= totalDays; d++) {
    const dStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const att = attendanceMap[dStr];
    const dayOfWeek = new Date(dStr).getDay();
    const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);

    if (att && att.net_work_hours > 0) {
      workingDaysCount++;
      totalNetHours += att.net_work_hours;
      totalOvertimeHours += (att.overtime_hours || 0);
      totalNightHours += (att.night_hours || 0);
      totalHolidayHours += (att.holiday_hours_under8 || 0) + (att.holiday_hours_over8 || 0);
      totalPubHolidayHours += (att.public_holiday_hours_under8 || 0) + (att.public_holiday_hours_over8 || 0);

      if (isWeekend) weekendWorkCount++;
    } else if (!isWeekend) {
      weekdayOffCount++;
    }
  }

  const [customHolidayName, setCustomHolidayName] = useState('');
  const [isHolidayManageModalOpen, setIsHolidayManageModalOpen] = useState(false);
  const [newHolidayInput, setNewHolidayInput] = useState({
    date: `${yearMonth}-17`,
    name: '제헌절'
  });

  // Open Day Edit Modal
  const handleDayClick = (dateStr) => {
    const existing = attendanceMap[dateStr];
    const hol = holidayMap[dateStr];
    if (hol) {
      setCustomHolidayName(hol.holiday_name || '');
    } else if (dateStr.endsWith('-07-17')) {
      setCustomHolidayName('제헌절');
    } else {
      setCustomHolidayName('');
    }

    if (existing) {
      setSelectedDayRecord({
        work_date: dateStr,
        clock_in: existing.clock_in || '10:00',
        clock_out: existing.clock_out || '22:00',
        break_minutes: existing.break_minutes || 60,
        is_absent: existing.is_absent || 0,
        is_unpaid_leave: existing.is_unpaid_leave || 0,
        is_annual_leave: existing.is_annual_leave || 0,
        memo: existing.memo || ''
      });
    } else {
      const fixed = currentEmployee ? currentEmployee.fixed_work_hours : '10:00~22:00';
      const [fIn, fOut] = fixed ? fixed.split('~') : ['10:00', '22:00'];
      setSelectedDayRecord({
        work_date: dateStr,
        clock_in: fIn || '10:00',
        clock_out: fOut || '22:00',
        break_minutes: 60,
        is_absent: 0,
        is_unpaid_leave: 0,
        is_annual_leave: 0,
        memo: ''
      });
    }
    setIsDayModalOpen(true);
  };

  // Toggle Holiday for specific date
  const handleToggleHolidayForDate = async (dateStr, name) => {
    try {
      const res = await api.toggleHoliday({
        holiday_date: dateStr,
        holiday_name: name || (dateStr.endsWith('-07-17') ? '제헌절' : '임시공휴일')
      });
      alert(res.message);
      loadHolidays();
      loadAttendance();
    } catch (err) {
      alert(err.message || '공휴일 설정 실패');
    }
  };

  const handleSaveDay = async (e) => {
    e.preventDefault();
    try {
      await api.saveDailyAttendance({
        employee_id: selectedEmployeeId,
        store_id: selectedStoreId,
        ...selectedDayRecord
      });
      setIsDayModalOpen(false);
      loadAttendance();
    } catch (err) {
      alert(err.message || '저장 실패');
    }
  };

  // Open Quick Fill Modal with Smart Pre-hire & Resignation Detection
  const openQuickFill = () => {
    if (!currentEmployee) return;
    const fixed = currentEmployee.fixed_work_hours || '10:00~22:00';
    const [fIn, fOut] = fixed.split('~');
    setQuickDefaultIn(fIn || '10:00');
    setQuickDefaultOut(fOut || '22:00');
    setQuickDefaultBreak(60);

    const initialOffs = new Set();
    const hireDate = currentEmployee.hire_date;
    const resignDate = currentEmployee.resign_date;

    for (let d = 1; d <= totalDays; d++) {
      const dStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      
      // 입사일 이전이거나 퇴사일 이후인 날짜만 자동으로 미근무(휴무)로 지정
      if (hireDate && dStr < hireDate) {
        initialOffs.add(dStr);
        continue;
      }
      if (resignDate && dStr > resignDate) {
        initialOffs.add(dStr);
        continue;
      }
    }
    setQuickOffDates(initialOffs);
    setIsQuickFillModalOpen(true);
  };

  const toggleQuickOffDate = (dStr) => {
    const next = new Set(quickOffDates);
    if (next.has(dStr)) next.delete(dStr);
    else next.add(dStr);
    setQuickOffDates(next);
  };

  const handleExecuteQuickFill = async () => {
    try {
      await api.quickFillAttendance({
        employee_id: selectedEmployeeId,
        store_id: selectedStoreId,
        year_month: yearMonth,
        default_clock_in: quickDefaultIn,
        default_clock_out: quickDefaultOut,
        default_break_minutes: quickDefaultBreak,
        off_dates: Array.from(quickOffDates)
      });
      setIsQuickFillModalOpen(false);
      loadAttendance();
    } catch (err) {
      alert(err.message || '빠른 입력 실패');
    }
  };

  // Excel Upload
  const handleExcelUpload = async (e) => {
    e.preventDefault();
    if (!excelFile) {
      alert('엑셀 파일을 선택해주세요.');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', excelFile);
      formData.append('store_id', selectedStoreId);

      const res = await api.uploadAttendanceExcel(formData);
      alert(res.message || '업로드 성공');
      setIsExcelModalOpen(false);
      loadAttendance();
    } catch (err) {
      alert(err.message || '업로드 실패');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header & Selectors */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CalendarIcon size={22} color="#3b82f6" /> 근태 입력 (직원별 캘린더)
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            날짜 클릭 시 출퇴근 및 휴게시간을 수정할 수 있으며, 공휴일 및 연장/야간 수당이 자동 분류됩니다.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Store select */}
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

          {/* Month select */}
          <input 
            type="month"
            className="form-input"
            value={yearMonth}
            onChange={(e) => setYearMonth(e.target.value)}
            style={{ width: 'auto' }}
          />

          {/* Employee select */}
          <select 
            className="form-select"
            value={selectedEmployeeId || ''}
            onChange={(e) => setSelectedEmployeeId(Number(e.target.value))}
            style={{ width: 'auto', minWidth: '150px' }}
          >
            {employees.map(e => (
              <option key={e.id} value={e.id}>{e.name} ({e.position} - {e.wage_type === 'HOURLY' ? '시급제' : '월급제'})</option>
            ))}
          </select>

          <button type="button" className="btn btn-secondary" onClick={() => {
            setNewHolidayInput({ date: `${yearMonth}-17`, name: yearMonth.endsWith('-07') ? '제헌절' : '임시공휴일' });
            setIsHolidayManageModalOpen(true);
          }}>
            <CalendarIcon size={15} color="#f87171" /> 🚩 이 달의 공휴일 관리
          </button>

          <button type="button" className="btn btn-secondary" onClick={openQuickFill} disabled={!selectedEmployeeId}>
            <Zap size={15} color="#f59e0b" /> 빠른 입력 모드
          </button>

          <button type="button" className="btn btn-secondary" onClick={() => setIsExcelModalOpen(true)}>
            <Upload size={15} /> 엑셀 일괄 업로드
          </button>
        </div>
      </div>

      {/* Attendance Summary Card (Real-time Audit Card) */}
      {currentEmployee && (
        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(19, 27, 46, 0.95), rgba(30, 41, 66, 0.85))' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#fff' }}>
                {currentEmployee.name} ({currentEmployee.position}) - {yearMonth} 근태 집계 요약
              </h3>
              <span className={`badge ${currentEmployee.wage_type === 'HOURLY' ? 'badge-primary' : 'badge-purple'}`}>
                {currentEmployee.wage_type === 'HOURLY' ? `시급 ${(currentEmployee.hourly_wage || 10320).toLocaleString()}원` : `월급 ${(currentEmployee.contract_salary || 0).toLocaleString()}원`}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              고정근무시간: <strong style={{ color: '#fff' }}>{currentEmployee.fixed_work_hours || '-'}</strong>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
            <div style={{ background: 'var(--bg-surface)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>총 근무일수</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#fff', marginTop: '2px' }} className="num-font">
                {workingDaysCount}일
              </div>
            </div>

            <div style={{ background: 'var(--bg-surface)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>총 순근무시간</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#60a5fa', marginTop: '2px' }} className="num-font">
                {Math.round(totalNetHours * 10) / 10}h
              </div>
            </div>

            <div style={{ background: 'var(--bg-surface)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>연장근로 (1.5x)</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#f59e0b', marginTop: '2px' }} className="num-font">
                {Math.round(totalOvertimeHours * 10) / 10}h
              </div>
            </div>

            <div style={{ background: 'var(--bg-surface)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>야간근로 (0.5x 가산)</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#a855f7', marginTop: '2px' }} className="num-font">
                {Math.round(totalNightHours * 10) / 10}h
              </div>
            </div>

            <div style={{ background: 'var(--bg-surface)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>공휴일근로 (0.5x 가산)</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#ef4444', marginTop: '2px' }} className="num-font">
                {Math.round(totalPubHolidayHours * 10) / 10}h
              </div>
            </div>

            <div style={{ background: 'var(--bg-surface)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>평일휴무 / 주말근무</div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff', marginTop: '4px' }}>
                {weekdayOffCount}일 / {weekendWorkCount}일
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Interactive Calendar */}
      <div className="card">
        {/* Days of Week Header */}
        <div className="calendar-grid" style={{ marginBottom: '8px' }}>
          {['일', '월', '화', '수', '목', '금', '토'].map((dayName, idx) => (
            <div 
              key={dayName} 
              className="calendar-day-header"
              style={{ color: idx === 0 ? '#f87171' : (idx === 6 ? '#60a5fa' : 'var(--text-muted)') }}
            >
              {dayName}
            </div>
          ))}
        </div>

        {/* Calendar Day Cells */}
        <div className="calendar-grid">
          {/* Empty cells before 1st day */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} style={{ background: 'transparent', minHeight: '90px' }} />
          ))}

          {/* Actual days */}
          {Array.from({ length: totalDays }).map((_, i) => {
            const dayNum = i + 1;
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const d = new Date(dateStr);
            const dayOfWeek = d.getDay();
            const isSun = dayOfWeek === 0;
            const isSat = dayOfWeek === 6;
            const holiday = holidayMap[dateStr];
            const att = attendanceMap[dateStr];

            const hasWork = att && att.net_work_hours > 0;
            const isAbsent = att && att.is_absent;
            const isAnnual = att && att.is_annual_leave;
            const isUnpaid = att && att.is_unpaid_leave;

            return (
              <div 
                key={dateStr}
                className={`calendar-cell ${holiday ? 'holiday' : (isSun || isSat ? 'weekend' : '')}`}
                onClick={() => handleDayClick(dateStr)}
              >
                <div className="calendar-date-number">
                  <span style={{ color: holiday || isSun ? '#f87171' : (isSat ? '#60a5fa' : '#fff') }}>
                    {dayNum}
                  </span>
                  {holiday && (
                    <span style={{ fontSize: '10px', color: '#f87171', fontWeight: '700', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75px' }}>
                      {holiday.holiday_name}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '4px' }}>
                  {hasWork ? (
                    <>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: '#60a5fa' }}>
                        {att.clock_in}~{att.clock_out}
                      </div>
                      <div style={{ fontSize: '11px', display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                        <span className="badge badge-primary" style={{ fontSize: '9px', padding: '1px 4px' }}>
                          {att.net_work_hours}h
                        </span>
                        {att.overtime_hours > 0 && (
                          <span className="badge badge-warning" style={{ fontSize: '9px', padding: '1px 4px' }}>
                            연장 {att.overtime_hours}h
                          </span>
                        )}
                        {att.night_hours > 0 && (
                          <span className="badge badge-purple" style={{ fontSize: '9px', padding: '1px 4px' }}>
                            야간 {att.night_hours}h
                          </span>
                        )}
                        {att.day_type === 'PUBLIC_HOLIDAY' && (
                          <span className="badge badge-danger" style={{ fontSize: '9px', padding: '1px 4px' }}>
                            공휴(0.5x)
                          </span>
                        )}
                      </div>
                    </>
                  ) : isAbsent ? (
                    <span className="badge badge-danger" style={{ fontSize: '10px' }}>무단결근</span>
                  ) : isAnnual ? (
                    <span className="badge badge-success" style={{ fontSize: '10px' }}>연차휴가(유급)</span>
                  ) : isUnpaid ? (
                    <span className="badge badge-warning" style={{ fontSize: '10px' }}>무급휴가</span>
                  ) : (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '8px' }}>
                      휴무
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Single Day Modal */}
      <Modal
        isOpen={isDayModalOpen}
        onClose={() => setIsDayModalOpen(false)}
        title={`근태 상세 입력 (${selectedDayRecord.work_date})`}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setIsDayModalOpen(false)}>취소</button>
            <button type="button" className="btn btn-primary" onClick={handleSaveDay}>근태 저장</button>
          </>
        }
      >
        <form onSubmit={handleSaveDay} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <label className="form-check">
              <input 
                type="checkbox" 
                checked={selectedDayRecord.is_absent === 1}
                onChange={(e) => setSelectedDayRecord({ ...selectedDayRecord, is_absent: e.target.checked ? 1 : 0, is_unpaid_leave: 0, is_annual_leave: 0 })}
              />
              <span style={{ color: '#f87171', fontWeight: '700' }}>무단결근 (근태공제 대상)</span>
            </label>

            <label className="form-check">
              <input 
                type="checkbox" 
                checked={selectedDayRecord.is_unpaid_leave === 1}
                onChange={(e) => setSelectedDayRecord({ ...selectedDayRecord, is_unpaid_leave: e.target.checked ? 1 : 0, is_absent: 0, is_annual_leave: 0 })}
              />
              <span style={{ color: '#fbbf24', fontWeight: '700' }}>무급휴가 (근태공제 대상)</span>
            </label>

            <label className="form-check">
              <input 
                type="checkbox" 
                checked={selectedDayRecord.is_annual_leave === 1}
                onChange={(e) => setSelectedDayRecord({ ...selectedDayRecord, is_annual_leave: e.target.checked ? 1 : 0, is_absent: 0, is_unpaid_leave: 0 })}
              />
              <span style={{ color: '#34d399', fontWeight: '700' }}>연차휴가 (유급 / 연차수당)</span>
            </label>
          </div>

          {/* Holiday Designation Card */}
          <div style={{ 
            background: holidayMap[selectedDayRecord.work_date] ? 'rgba(239, 68, 68, 0.12)' : 'var(--bg-surface)', 
            border: holidayMap[selectedDayRecord.work_date] ? '1px solid #ef4444' : '1px solid var(--border-subtle)', 
            padding: '12px 14px', 
            borderRadius: 'var(--radius-md)', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: holidayMap[selectedDayRecord.work_date] ? '#f87171' : '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CalendarIcon size={16} color={holidayMap[selectedDayRecord.work_date] ? '#f87171' : '#94a3b8'} />
                {holidayMap[selectedDayRecord.work_date] 
                  ? `🚩 공휴일 지정됨: [${holidayMap[selectedDayRecord.work_date].holiday_name}]` 
                  : '일반 근무일 (공휴일 아님)'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {holidayMap[selectedDayRecord.work_date] 
                  ? '이 날짜는 공휴일로 등록되어 있어 출근 시 공휴일근로로 자동 처리됩니다.' 
                  : '제헌절(7/17), 회사 창립일 등 공휴일로 지정하려면 오른쪽 버튼을 클릭하세요.'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {!holidayMap[selectedDayRecord.work_date] && (
                <input 
                  type="text" 
                  className="form-input" 
                  value={customHolidayName} 
                  onChange={(e) => setCustomHolidayName(e.target.value)}
                  placeholder="공휴일 명칭 (예: 제헌절)"
                  style={{ width: '150px', padding: '6px 10px', fontSize: '12px' }}
                />
              )}
              <button 
                type="button" 
                className={`btn btn-sm ${holidayMap[selectedDayRecord.work_date] ? 'btn-outline-danger' : 'btn-danger'}`}
                onClick={() => handleToggleHolidayForDate(selectedDayRecord.work_date, customHolidayName)}
              >
                {holidayMap[selectedDayRecord.work_date] ? '공휴일 해제' : '🚩 공휴일로 지정'}
              </button>
            </div>
          </div>

          {!selectedDayRecord.is_absent && !selectedDayRecord.is_unpaid_leave && !selectedDayRecord.is_annual_leave && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">출근 시각 (시간선택 또는 직접 타이핑)</label>
                  <input 
                    type="time" 
                    className="form-input" 
                    value={selectedDayRecord.clock_in || ''} 
                    onChange={(e) => setSelectedDayRecord({ ...selectedDayRecord, clock_in: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">퇴근 시각 (익일 새벽 퇴근 지원)</label>
                  <input 
                    type="time" 
                    className="form-input" 
                    value={selectedDayRecord.clock_out || ''} 
                    onChange={(e) => setSelectedDayRecord({ ...selectedDayRecord, clock_out: e.target.value })} 
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">휴게시간 (분 단위)</label>
                <input 
                  type="number" 
                  step="10" 
                  className="form-input" 
                  value={selectedDayRecord.break_minutes} 
                  onChange={(e) => setSelectedDayRecord({ ...selectedDayRecord, break_minutes: parseInt(e.target.value) || 0 })} 
                  placeholder="60" 
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  * 순근무시간 = (퇴근시각 - 출근시각) - 휴게시간으로 자동 계산됩니다.
                </span>
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">메모 / 특이사항</label>
            <input 
              type="text" 
              className="form-input" 
              value={selectedDayRecord.memo} 
              onChange={(e) => setSelectedDayRecord({ ...selectedDayRecord, memo: e.target.value })} 
              placeholder="예: 조기퇴근 1시간, 대타 근무" 
            />
          </div>
        </form>
      </Modal>

      {/* Holiday Quick Manager Modal */}
      <Modal
        isOpen={isHolidayManageModalOpen}
        onClose={() => setIsHolidayManageModalOpen(false)}
        title={`이 달의 공휴일 관리 (${yearMonth})`}
        footer={
          <button type="button" className="btn btn-secondary" onClick={() => setIsHolidayManageModalOpen(false)}>닫기</button>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            <strong>{yearMonth}</strong> 월에 적용되는 공휴일 목록입니다. 원하는 날짜를 공휴일(제헌절, 임시공휴일 등)로 직접 추가하거나 삭제할 수 있습니다.
          </p>

          {/* Quick Add Form */}
          <div style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontWeight: '700', fontSize: '13px', color: '#fff', marginBottom: '10px' }}>
              ➕ 새 공휴일 지정하기
            </div>
            <div className="form-row" style={{ alignItems: 'flex-end' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">날짜</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={newHolidayInput.date} 
                  onChange={(e) => setNewHolidayInput({ ...newHolidayInput, date: e.target.value })} 
                />
              </div>
              <div className="form-group" style={{ flex: 1.2 }}>
                <label className="form-label">공휴일 명칭</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={newHolidayInput.name} 
                  onChange={(e) => setNewHolidayInput({ ...newHolidayInput, name: e.target.value })} 
                  placeholder="예: 제헌절, 임시공휴일" 
                />
              </div>
              <div className="form-group" style={{ flex: 0.8 }}>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  style={{ width: '100%' }}
                  onClick={async () => {
                    if (!newHolidayInput.date || !newHolidayInput.name) {
                      alert('날짜와 공휴일 명칭을 입력해주세요.');
                      return;
                    }
                    await handleToggleHolidayForDate(newHolidayInput.date, newHolidayInput.name);
                    setIsHolidayManageModalOpen(false);
                  }}
                >
                  <Plus size={14} /> 공휴일 등록
                </button>
              </div>
            </div>
          </div>

          {/* Current Month Holidays Table */}
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>날짜</th>
                  <th>공휴일 명칭</th>
                  <th>구분</th>
                  <th>관리</th>
                </tr>
              </thead>
              <tbody>
                {holidays.filter(h => h.holiday_date.startsWith(yearMonth)).length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                      이번 달에 등록된 공휴일이 없습니다. 위에서 제헌절 등 공휴일을 추가해보세요.
                    </td>
                  </tr>
                ) : (
                  holidays.filter(h => h.holiday_date.startsWith(yearMonth)).map(h => (
                    <tr key={h.id}>
                      <td style={{ fontWeight: '700', color: '#f87171' }}>{h.holiday_date}</td>
                      <td style={{ color: '#fff', fontWeight: '600' }}>{h.holiday_name}</td>
                      <td>
                        {h.is_manual ? <span className="badge badge-purple">수동 지정</span> : <span className="badge badge-neutral">법정공휴일</span>}
                      </td>
                      <td>
                        <button 
                          type="button" 
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => handleToggleHolidayForDate(h.holiday_date)}
                        >
                          <Trash2 size={13} /> 해제
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      {/* Quick Fill Modal */}
      <Modal
        isOpen={isQuickFillModalOpen}
        onClose={() => setIsQuickFillModalOpen(false)}
        size="large"
        title={`빠른 입력 모드: ${currentEmployee ? currentEmployee.name : ''} (${yearMonth})`}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setIsQuickFillModalOpen(false)}>취소</button>
            <button type="button" className="btn btn-primary" onClick={handleExecuteQuickFill}>
              <Zap size={15} /> 일괄 자동 채우기 실행
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            이번 달의 <strong>휴무일(쉬는 날)</strong>을 클릭하여 선택하세요. 선택되지 않은 모든 날짜는 아래 설정된 기본 근무시간대로 자동 생성됩니다.
          </p>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">기본 출근시각</label>
              <input type="time" className="form-input" value={quickDefaultIn} onChange={(e) => setQuickDefaultIn(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">기본 퇴근시각</label>
              <input type="time" className="form-input" value={quickDefaultOut} onChange={(e) => setQuickDefaultOut(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">기본 휴게시간(분)</label>
              <input type="number" step="10" className="form-input" value={quickDefaultBreak} onChange={(e) => setQuickDefaultBreak(parseInt(e.target.value) || 60)} />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
              <label className="form-label" style={{ margin: 0 }}>
                이번 달 날짜 선택 (빨간색 = 휴무/미근무로 지정):
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '11px', padding: '4px 8px' }}
                  onClick={() => {
                    const next = new Set();
                    const hireDate = currentEmployee?.hire_date;
                    const resignDate = currentEmployee?.resign_date;
                    for (let d = 1; d <= totalDays; d++) {
                      const dStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                      if ((hireDate && dStr < hireDate) || (resignDate && dStr > resignDate)) {
                        next.add(dStr);
                      }
                    }
                    setQuickOffDates(next);
                  }}
                >
                  입사 전/퇴사 후만 휴무
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '11px', padding: '4px 8px' }}
                  onClick={() => setQuickOffDates(new Set())}
                >
                  전체 근무로 선택
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
              {Array.from({ length: totalDays }).map((_, i) => {
                const dayNum = i + 1;
                const dStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const isOff = quickOffDates.has(dStr);
                const dayOfWeek = new Date(dStr).getDay();
                const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

                const isPreHire = currentEmployee?.hire_date && dStr < currentEmployee.hire_date;
                const isPostResign = currentEmployee?.resign_date && dStr > currentEmployee.resign_date;

                let statusLabel = isOff ? '휴무' : '근무';
                if (isPreHire) statusLabel = '입사 전';
                else if (isPostResign) statusLabel = '퇴사 후';

                return (
                  <button
                    key={dStr}
                    type="button"
                    onClick={() => toggleQuickOffDate(dStr)}
                    style={{
                      padding: '8px 4px',
                      borderRadius: 'var(--radius-sm)',
                      border: isOff 
                        ? (isPreHire || isPostResign ? '1px dashed rgba(239, 68, 68, 0.7)' : '1px solid rgba(239, 68, 68, 0.5)')
                        : '1px solid rgba(59, 130, 246, 0.4)',
                      background: isOff 
                        ? (isPreHire || isPostResign ? 'rgba(239, 68, 68, 0.25)' : 'var(--danger-bg)')
                        : 'rgba(59, 130, 246, 0.15)',
                      color: isOff ? '#fca5a5' : '#93c5fd',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '2px'
                    }}
                  >
                    <span>{dayNum}일 ({dayNames[dayOfWeek]})</span>
                    <span style={{ fontSize: '10px', color: isPreHire || isPostResign ? '#f87171' : 'inherit' }}>
                      {statusLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>

      {/* Excel Bulk Upload Modal */}
      <Modal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        title="근태 엑셀 일괄 업로드"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setIsExcelModalOpen(false)}>취소</button>
            <button type="button" className="btn btn-primary" onClick={handleExcelUpload} disabled={uploading || !excelFile}>
              {uploading ? '업로드 중...' : '엑셀 업로드 실행'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            매장 직원의 한 달치 근태 기록이 담긴 엑셀 파일(.xlsx, .xls)을 업로드하면 자동으로 순근무시간, 연장/야간/휴일 수당이 산출됩니다.
          </p>

          <div style={{ background: 'var(--bg-surface-elevated)', padding: '14px', borderRadius: 'var(--radius-md)', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <strong>엑셀 권장 컬럼 헤더:</strong><br />
            <code>직원성명 | 근무일자(YYYY-MM-DD) | 출근시간(10:00) | 퇴근시간(22:00) | 휴게분(60) | 결근(Y/N) | 연차(Y/N)</code>
          </div>

          <div className="form-group">
            <label className="form-label">파일 선택</label>
            <input 
              type="file" 
              accept=".xlsx, .xls, .csv" 
              className="form-input" 
              onChange={(e) => setExcelFile(e.target.files[0])} 
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
