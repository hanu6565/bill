import React, { useState, useEffect } from 'react';
import api, { getAuthToken, setAuthToken } from './services/api';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import StoreManagement from './pages/StoreManagement';
import EmployeeManagement from './pages/EmployeeManagement';
import AttendanceManagement from './pages/AttendanceManagement';
import PayrollCalculation from './pages/PayrollCalculation';
import PayslipView from './pages/PayslipView';
import WageLedgerView from './pages/WageLedgerView';
import Settings from './pages/Settings';

export default function App() {
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stores, setStores] = useState([]);
  const [currentStoreId, setCurrentStoreId] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      loadStores();
    }
  }, [user]);

  const checkAuth = async () => {
    const token = getAuthToken();
    if (!token) {
      setAuthChecking(false);
      return;
    }
    try {
      const res = await api.getMe();
      if (res.success) {
        setUser(res.user);
      } else {
        setUser(null);
        setAuthToken(null);
      }
    } catch (err) {
      setUser(null);
      setAuthToken(null);
    } finally {
      setAuthChecking(false);
    }
  };

  const loadStores = async () => {
    try {
      const res = await api.getStores();
      if (res.success) {
        setStores(res.stores);
        if (res.stores.length > 0 && !currentStoreId) {
          // Default to first store or keep empty for all-store view
          setCurrentStoreId(res.stores[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    setAuthToken(null);
    setUser(null);
  };

  if (authChecking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b0f19', color: '#94a3b8' }}>
        시스템 초기화 중...
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={(u) => { setUser(u); }} />;
  }

  return (
    <div className="app-container">
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        currentStoreId={currentStoreId}
        setCurrentStoreId={setCurrentStoreId}
        stores={stores}
        user={user}
        onLogout={handleLogout}
      />

      <main className="main-content">
        {activeTab === 'dashboard' && (
          <Dashboard 
            setCurrentStoreId={setCurrentStoreId} 
            setActiveTab={setActiveTab} 
          />
        )}

        {activeTab === 'stores' && (
          <StoreManagement 
            stores={stores} 
            onStoresUpdated={loadStores} 
            setCurrentStoreId={(id) => {
              setCurrentStoreId(id);
              setActiveTab('employees');
            }}
          />
        )}

        {activeTab === 'employees' && (
          <EmployeeManagement 
            stores={stores} 
            currentStoreId={currentStoreId}
            setCurrentStoreId={setCurrentStoreId}
          />
        )}

        {activeTab === 'attendance' && (
          <AttendanceManagement 
            stores={stores} 
            currentStoreId={currentStoreId}
            setCurrentStoreId={setCurrentStoreId}
          />
        )}

        {activeTab === 'payroll' && (
          <PayrollCalculation 
            stores={stores} 
            currentStoreId={currentStoreId}
            setCurrentStoreId={setCurrentStoreId}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'wageLedger' && (
          <WageLedgerView 
            stores={stores} 
            currentStoreId={currentStoreId}
          />
        )}

        {activeTab === 'payslips' && (
          <PayslipView 
            stores={stores} 
            currentStoreId={currentStoreId}
          />
        )}

        {activeTab === 'settings' && (
          <Settings />
        )}
      </main>
    </div>
  );
}
