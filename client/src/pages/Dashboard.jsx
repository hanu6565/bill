import React, { useState, useEffect } from 'react';
import { 
  DollarSign, TrendingUp, Users, Store, ArrowUpRight, 
  CheckCircle2, AlertCircle, Clock, Calendar, FileSpreadsheet 
} from 'lucide-react';
import api from '../services/api';

export default function Dashboard({ setCurrentStoreId, setActiveTab }) {
  const [yearMonth, setYearMonth] = useState('2026-09');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, [yearMonth]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.getDashboardSummary(yearMonth);
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStoreJump = (storeId, tab) => {
    setCurrentStoreId(storeId);
    setActiveTab(tab);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'CONFIRMED':
        return <span className="badge badge-success"><CheckCircle2 size={12} /> 급여 확정</span>;
      case 'INSPECTING':
      case 'CALCULATED':
        return <span className="badge badge-warning"><Clock size={12} /> 검수 대기</span>;
      case 'REOPENED':
        return <span className="badge badge-purple"><AlertCircle size={12} /> 재오픈 수정중</span>;
      default:
        return <span className="badge badge-neutral">미계산</span>;
    }
  };

  if (loading && !data) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>대시보드 데이터를 불러오는 중...</div>;
  }

  const { overview, store_summaries, monthly_trends } = data || { overview: {}, store_summaries: [], monthly_trends: [] };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header & Month Filter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>🏢 전체 매장 인건비 대시보드</span>
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            운영 중인 모든 요식업 매장의 월별 인건비 현황 및 급여 계산 진행 상황을 한눈에 파악합니다.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-surface-elevated)', padding: '6px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-strong)' }}>
            <Calendar size={16} color="#60a5fa" />
            <span style={{ fontSize: '13px', fontWeight: '600' }}>귀속연월:</span>
            <input 
              type="month"
              value={yearMonth}
              onChange={(e) => setYearMonth(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontWeight: '700',
                fontSize: '14px',
                fontFamily: 'var(--font-main)',
                cursor: 'pointer',
                outline: 'none'
              }}
            />
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">
            <DollarSign size={16} color="#3b82f6" /> 이번 달 인건비 지급총액 (과세+비과세)
          </div>
          <div className="stat-value" style={{ color: '#60a5fa' }}>
            {(overview.total_gross_pay || 0).toLocaleString()}원
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            총 {overview.total_stores || 0}개 매장 합산 기준
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">
            <TrendingUp size={16} color="#10b981" /> 실지급액 합계 (차인지급액)
          </div>
          <div className="stat-value" style={{ color: '#34d399' }}>
            {(overview.total_net_pay || 0).toLocaleString()}원
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            공제총액: {(overview.total_deductions || 0).toLocaleString()}원
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">
            <Store size={16} color="#a855f7" /> 운영 매장 & 계산 진행 현황
          </div>
          <div className="stat-value">
            {overview.processed_stores || 0} <span style={{ fontSize: '16px', color: 'var(--text-muted)' }}>/ {overview.total_stores || 0}개 매장</span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {overview.processed_stores === overview.total_stores ? '🎉 전 매장 급여 계산 완료' : '진행 중인 매장이 있습니다'}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">
            <Users size={16} color="#f59e0b" /> 전체 재직 직원 수
          </div>
          <div className="stat-value">
            {overview.total_active_employees || 0}명
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            상용직 & 일용직 포함
          </div>
        </div>
      </div>

      {/* Store Comparison Cards */}
      <div className="card">
        <div className="card-header">
          <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Store size={18} color="#3b82f6" /> 매장별 {yearMonth} 급여 관리 현황
          </h3>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            매장 카드를 클릭하면 해당 매장으로 바로 전환됩니다
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {store_summaries.map(store => (
            <div 
              key={store.id}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                transition: 'all 0.2s',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#fff' }}>{store.name}</h4>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    대표자: {store.ceo_name || '-'} | {store.default_wage_type === 'HOURLY' ? '시급제 매장' : '월급제 매장'}
                  </div>
                </div>
                {getStatusBadge(store.payroll_status)}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '10px 12px', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)', fontSize: '12.5px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>재직 직원: </span>
                  <strong>{store.employee_count}명</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>산재요율: </span>
                  <strong>{store.accident_rate}%</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>지급총액: </span>
                  <strong className="num-font">{(store.total_gross_pay || 0).toLocaleString()}원</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>실지급액: </span>
                  <strong className="num-font" style={{ color: '#34d399' }}>{(store.total_net_pay || 0).toLocaleString()}원</strong>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm" 
                  style={{ flex: 1 }}
                  onClick={() => handleStoreJump(store.id, 'attendance')}
                >
                  <Calendar size={13} /> 근태입력
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary btn-sm" 
                  style={{ flex: 1 }}
                  onClick={() => handleStoreJump(store.id, 'payroll')}
                >
                  <ArrowUpRight size={13} /> 급여계산·검수
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6-Month Labor Cost Trend Visualization */}
      <div className="card">
        <div className="card-header">
          <h3 style={{ fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} color="#10b981" /> 최근 6개월 전체 매장 인건비 추이
          </h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', gap: '16px', height: '200px', paddingTop: '20px' }}>
          {monthly_trends.map(t => {
            const maxGross = Math.max(...monthly_trends.map(m => m.total_gross || 1), 1);
            const heightPercent = Math.max(15, Math.round((t.total_gross / maxGross) * 100));
            const isCurrent = t.year_month === yearMonth;

            return (
              <div key={t.year_month} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flex: 1 }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: isCurrent ? '#60a5fa' : 'var(--text-secondary)' }}>
                  {t.total_gross > 0 ? `${(Math.round(t.total_gross / 10000)).toLocaleString()}만` : '0'}
                </div>
                <div 
                  style={{
                    width: '100%',
                    maxWidth: '48px',
                    height: `${heightPercent}%`,
                    background: isCurrent 
                      ? 'linear-gradient(180deg, #3b82f6, #1d4ed8)' 
                      : 'linear-gradient(180deg, #334155, #1e293b)',
                    borderRadius: '6px 6px 0 0',
                    border: isCurrent ? '1px solid #60a5fa' : '1px solid var(--border-subtle)',
                    transition: 'height 0.4s ease',
                    boxShadow: isCurrent ? '0 0 12px rgba(59, 130, 246, 0.4)' : 'none'
                  }}
                  title={`${t.year_month}: 지급총액 ${t.total_gross.toLocaleString()}원 / 실지급액 ${t.total_net.toLocaleString()}원`}
                />
                <div style={{ fontSize: '12px', fontWeight: isCurrent ? '700' : '500', color: isCurrent ? '#fff' : 'var(--text-muted)' }}>
                  {t.year_month.substring(2)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
