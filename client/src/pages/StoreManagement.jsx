import React, { useState, useEffect } from 'react';
import { Store, Plus, Edit2, Trash2, ShieldCheck, MapPin, Phone, Building2 } from 'lucide-react';
import api from '../services/api';
import Modal from '../components/Modal';

export default function StoreManagement({ stores, onStoresUpdated, setCurrentStoreId }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    business_number: '',
    ceo_name: '',
    address: '',
    phone: '',
    accident_rate: 0.9,
    default_wage_type: 'MONTHLY'
  });
  const [loading, setLoading] = useState(false);

  const openCreateModal = () => {
    setEditingStore(null);
    setFormData({
      name: '',
      business_number: '',
      ceo_name: '',
      address: '',
      phone: '',
      accident_rate: 0.9,
      default_wage_type: 'MONTHLY'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (store) => {
    setEditingStore(store);
    setFormData({
      name: store.name || '',
      business_number: store.business_number || '',
      ceo_name: store.ceo_name || '',
      address: store.address || '',
      phone: store.phone || '',
      accident_rate: store.accident_rate || 0.9,
      default_wage_type: store.default_wage_type || 'MONTHLY'
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingStore) {
        await api.updateStore(editingStore.id, formData);
      } else {
        await api.createStore(formData);
      }
      setIsModalOpen(false);
      onStoresUpdated();
    } catch (err) {
      alert(err.message || '저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`정말로 매장 [${name}]을(를) 삭제하시겠습니까?\n매장 삭제 시 소속 직원 및 근태/급여 데이터가 모두 삭제됩니다.`)) {
      return;
    }
    try {
      await api.deleteStore(id);
      onStoresUpdated();
    } catch (err) {
      alert(err.message || '삭제에 실패했습니다.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Store size={22} color="#3b82f6" /> 매장(브랜드) 관리
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            운영 중인 매장 정보를 등록하고 매장별 기본 급여방식(월급제/시급제) 및 산재보험 요율을 관리합니다.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreateModal}>
          <Plus size={16} /> 신규 매장 추가
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
        {stores.map(store => (
          <div key={store.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>{store.name}</h3>
                <span className={`badge ${store.default_wage_type === 'HOURLY' ? 'badge-warning' : 'badge-primary'}`} style={{ marginTop: '6px' }}>
                  기본 {store.default_wage_type === 'HOURLY' ? '시급제 매장' : '월급제 매장'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEditModal(store)} title="매장 수정">
                  <Edit2 size={14} />
                </button>
                <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => handleDelete(store.id, store.name)} title="매장 삭제">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Building2 size={14} color="#94a3b8" />
                <span>사업자번호: <strong style={{ color: '#fff' }}>{store.business_number || '미등록'}</strong> (대표: {store.ceo_name || '-'})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={14} color="#94a3b8" />
                <span>{store.address || '주소 미입력'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Phone size={14} color="#94a3b8" />
                <span>{store.phone || '연락처 미입력'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={14} color="#10b981" />
                <span>산재보험 업종요율: <strong style={{ color: '#34d399' }}>{store.accident_rate}%</strong> (요식업 기준)</span>
              </div>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                소속 재직 직원: <strong style={{ color: '#60a5fa' }}>{store.employee_count || 0}명</strong>
              </span>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm" 
                onClick={() => setCurrentStoreId(store.id)}
              >
                이 매장 선택
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Store Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingStore ? `매장 수정: ${editingStore.name}` : '신규 매장 등록'}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              취소
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
              {loading ? '저장 중...' : (editingStore ? '수정사항 저장' : '매장 등록')}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-group">
            <label className="form-label">매장명 (브랜드명) *</label>
            <input 
              type="text" 
              className="form-input" 
              value={formData.name} 
              onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
              placeholder="예: 한양화로 강남본점" 
              required 
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">대표자명</label>
              <input 
                type="text" 
                className="form-input" 
                value={formData.ceo_name} 
                onChange={(e) => setFormData({ ...formData, ceo_name: e.target.value })} 
                placeholder="예: 홍길동" 
              />
            </div>
            <div className="form-group">
              <label className="form-label">사업자등록번호</label>
              <input 
                type="text" 
                className="form-input" 
                value={formData.business_number} 
                onChange={(e) => setFormData({ ...formData, business_number: e.target.value })} 
                placeholder="000-00-00000" 
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">기본 급여방식 (직원 등록 시 기본값)</label>
              <select 
                className="form-select"
                value={formData.default_wage_type}
                onChange={(e) => setFormData({ ...formData, default_wage_type: e.target.value })}
              >
                <option value="MONTHLY">월급제 매장 (직원 등록 시 월급제 기본 선택)</option>
                <option value="HOURLY">시급제 매장 (직원 등록 시 시급제 기본 선택)</option>
              </select>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                * 직원 개별 등록 시 언제든 시급/월급을 자유롭게 오버라이드할 수 있습니다.
              </span>
            </div>
            <div className="form-group">
              <label className="form-label">산재보험 업종요율 (%)</label>
              <input 
                type="number" 
                step="0.01" 
                className="form-input" 
                value={formData.accident_rate} 
                onChange={(e) => setFormData({ ...formData, accident_rate: parseFloat(e.target.value) || 0.9 })} 
                placeholder="0.9" 
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                * 요식업 기준 기본값 0.9% 제공 (매장별 수정 가능)
              </span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">사업장 주소</label>
            <input 
              type="text" 
              className="form-input" 
              value={formData.address} 
              onChange={(e) => setFormData({ ...formData, address: e.target.value })} 
              placeholder="서울시 강남구 테헤란로..." 
            />
          </div>

          <div className="form-group">
            <label className="form-label">매장 전화번호</label>
            <input 
              type="text" 
              className="form-input" 
              value={formData.phone} 
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })} 
              placeholder="02-1234-5678" 
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
