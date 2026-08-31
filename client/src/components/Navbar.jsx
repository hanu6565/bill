import React from 'react';
import { 
  Store, Users, Calendar, Calculator, FileText, 
  TableProperties, Settings as SettingsIcon, LayoutDashboard, LogOut
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, currentStoreId, setCurrentStoreId, stores, user, onLogout }) {
  const currentStore = stores.find(s => s.id === Number(currentStoreId));

  const navItems = [
    { id: 'dashboard', label: '대시보드', icon: LayoutDashboard },
    { id: 'stores', label: '매장 관리', icon: Store },
    { id: 'employees', label: '직원 관리', icon: Users },
    { id: 'attendance', label: '근태 입력', icon: Calendar },
    { id: 'payroll', label: '급여 계산 & 검수', icon: Calculator },
    { id: 'wageLedger', label: '임금대장', icon: TableProperties },
    { id: 'payslips', label: '급여명세서', icon: FileText },
    { id: 'settings', label: '설정', icon: SettingsIcon },
  ];

  return (
    <header className="navbar no-print">
      <div className="navbar-inner">
        {/* Left: Brand & Active Store Selector */}
        <div className="navbar-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ 
              width: '34px', height: '34px', borderRadius: '10px', 
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
              flexShrink: 0
            }}>
              <Calculator size={18} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: '800', fontSize: '14px', letterSpacing: '-0.02em', color: '#fff', lineHeight: 1.2 }}>
                PAYROLL MASTER
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.2 }}>
                다중 매장 급여 관리
              </div>
            </div>
          </div>

          {/* Store Selector Dropdown */}
          <div className="store-selector-box">
            <Store size={15} color="#60a5fa" style={{ flexShrink: 0 }} />
            <select 
              value={currentStoreId || ''} 
              onChange={(e) => setCurrentStoreId(e.target.value ? Number(e.target.value) : '')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontWeight: '600',
                fontSize: '12.5px',
                cursor: 'pointer',
                outline: 'none',
                maxWidth: '220px'
              }}
            >
              <option value="" style={{ background: '#1e2942', color: '#fff' }}>🏢 전체 매장 (통합 대시보드)</option>
              {stores.map(s => (
                <option key={s.id} value={s.id} style={{ background: '#1e2942', color: '#fff' }}>
                  📍 {s.name} ({s.default_wage_type === 'HOURLY' ? '시급제' : '월급제'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Center: Navigation Links */}
        <nav className="nav-links">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button 
                key={item.id}
                type="button"
                className={`nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                <Icon size={15} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right: User Profile & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#f8fafc' }}>
              {user ? user.username : 'admin'}
            </span>
            <span className="badge badge-primary" style={{ fontSize: '10px', padding: '1px 6px', marginTop: '2px' }}>
              총괄 대표
            </span>
          </div>
          <button 
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onLogout}
            title="로그아웃"
            style={{ padding: '6px 12px', fontSize: '12px' }}
          >
            <LogOut size={13} />
            <span>로그아웃</span>
          </button>
        </div>
      </div>

      {/* Active Store Indicator Ribbon */}
      <div style={{ 
        background: currentStore ? 'linear-gradient(90deg, #1e3a8a, #1e293b)' : 'linear-gradient(90deg, #0f172a, #1e293b)', 
        padding: '6px 20px', 
        fontSize: '12px', 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#94a3b8' }}>현재 작업 대상:</span>
          <span style={{ fontWeight: '700', color: currentStore ? '#60a5fa' : '#34d399' }}>
            {currentStore ? `📍 ${currentStore.name}` : '🌐 전체 매장 통합 보기'}
          </span>
          {currentStore && (
            <span className="badge badge-neutral" style={{ fontSize: '11px', padding: '2px 8px' }}>
              기본 {currentStore.default_wage_type === 'HOURLY' ? '시급제' : '월급제'} | 산재요율 {(currentStore.accident_rate || 0.9)}%
            </span>
          )}
        </div>
        <div style={{ color: '#64748b', fontSize: '11.5px' }}>
          2026년 최저시급 10,320원 / 4대보험 및 간이세액표 자동 적용
        </div>
      </div>
    </header>
  );
}
