import React from 'react';
import { 
  Store, Users, Calendar, Calculator, FileText, 
  TableProperties, Settings as SettingsIcon, LayoutDashboard, LogOut, ChevronDown 
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, currentStoreId, setCurrentStoreId, stores, user, onLogout }) {
  const currentStore = stores.find(s => s.id === Number(currentStoreId));

  return (
    <header className="navbar no-print">
      <div className="navbar-inner">
        {/* Left: Brand & Active Store Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ 
              width: '36px', height: '36px', borderRadius: '10px', 
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)'
            }}>
              <Calculator size={20} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: '800', fontSize: '15px', letterSpacing: '-0.02em', color: '#fff' }}>
                PAYROLL MASTER
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                요식업 다중 매장 급여 관리
              </div>
            </div>
          </div>

          {/* Store Selector Dropdown */}
          <div className="store-selector-box">
            <Store size={16} color="#60a5fa" />
            <select 
              value={currentStoreId || ''} 
              onChange={(e) => setCurrentStoreId(e.target.value ? Number(e.target.value) : '')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="" style={{ background: '#1e2942', color: '#fff' }}>🏢 전체 매장 (통합 대시보드)</option>
              {stores.map(s => (
                <option key={s.id} value={s.id} style={{ background: '#1e2942', color: '#fff' }}>
                  📍 {s.name} ({s.default_wage_type === 'HOURLY' ? '시급제 매장' : '월급제 매장'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Center: Navigation Links */}
        <nav className="nav-links">
          <button 
            type="button"
            className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={16} />
            <span>대시보드</span>
          </button>

          <button 
            type="button"
            className={`nav-link ${activeTab === 'stores' ? 'active' : ''}`}
            onClick={() => setActiveTab('stores')}
          >
            <Store size={16} />
            <span>매장 관리</span>
          </button>

          <button 
            type="button"
            className={`nav-link ${activeTab === 'employees' ? 'active' : ''}`}
            onClick={() => setActiveTab('employees')}
          >
            <Users size={16} />
            <span>직원 관리</span>
          </button>

          <button 
            type="button"
            className={`nav-link ${activeTab === 'attendance' ? 'active' : ''}`}
            onClick={() => setActiveTab('attendance')}
          >
            <Calendar size={16} />
            <span>근태 입력</span>
          </button>

          <button 
            type="button"
            className={`nav-link ${activeTab === 'payroll' ? 'active' : ''}`}
            onClick={() => setActiveTab('payroll')}
          >
            <Calculator size={16} />
            <span>급여 계산 & 검수</span>
          </button>

          <button 
            type="button"
            className={`nav-link ${activeTab === 'wageLedger' ? 'active' : ''}`}
            onClick={() => setActiveTab('wageLedger')}
          >
            <TableProperties size={16} />
            <span>임금대장</span>
          </button>

          <button 
            type="button"
            className={`nav-link ${activeTab === 'payslips' ? 'active' : ''}`}
            onClick={() => setActiveTab('payslips')}
          >
            <FileText size={16} />
            <span>급여명세서</span>
          </button>

          <button 
            type="button"
            className={`nav-link ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <SettingsIcon size={16} />
            <span>설정</span>
          </button>
        </nav>

        {/* Right: User Profile & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
              {user ? user.username : '대표(관리자)'}
            </span>
            <span className="badge badge-primary" style={{ fontSize: '10px', padding: '1px 6px' }}>
              총괄 대표
            </span>
          </div>
          <button 
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onLogout}
            title="로그아웃"
          >
            <LogOut size={14} />
            <span>로그아웃</span>
          </button>
        </div>
      </div>

      {/* Active Store Indicator Ribbon */}
      <div style={{ 
        background: currentStore ? 'linear-gradient(90deg, #1e3a8a, #1e293b)' : 'linear-gradient(90deg, #0f172a, #1e293b)', 
        padding: '6px 24px', 
        fontSize: '12px', 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: 'var(--text-muted)' }}>현재 작업 대상 매장:</span>
          <span style={{ fontWeight: '700', color: currentStore ? '#60a5fa' : '#34d399' }}>
            {currentStore ? `📍 ${currentStore.name}` : '🌐 전체 매장 통합 보기'}
          </span>
          {currentStore && (
            <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
              기본 {currentStore.default_wage_type === 'HOURLY' ? '시급제' : '월급제'} | 산재요율 {(currentStore.accident_rate || 0.9)}%
            </span>
          )}
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '11.5px' }}>
          2026년 기준 최저시급 10,320원 / 4대보험 및 간이세액표 자동 적용
        </div>
      </div>
    </header>
  );
}
