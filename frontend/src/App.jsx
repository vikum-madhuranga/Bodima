import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import OwnersPropertiesView from './components/OwnersPropertiesView';
import RoomsView from './components/RoomsView';
import TenantsView from './components/TenantsView';
import PaymentsView from './components/PaymentsView';
import Notification from './components/Notification';
import ConfirmModal from './components/ConfirmModal';
import { api } from './api';
import { RefreshCw, AlertTriangle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [backendOnline, setBackendOnline] = useState(true);

  // Global Data State
  const [dashboardData, setDashboardData] = useState(null);
  const [owners, setOwners] = useState([]);
  const [properties, setProperties] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [payments, setPayments] = useState([]);

  // Toast Notifications
  const [notifications, setNotifications] = useState([]);

  // Confirmation Modal
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Delete',
    isDanger: true,
    onConfirm: () => {}
  });

  const notify = (message, type = 'info') => {
    const id = Date.now() + Math.random().toString();
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 4500);
  };

  const dismissNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const confirm = ({ title, message, confirmText, isDanger = true, onConfirm }) => {
    setConfirmConfig({
      isOpen: true,
      title,
      message,
      confirmText,
      isDanger,
      onConfirm: () => {
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        onConfirm();
      }
    });
  };

  // Fetch all initial data from backend
  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, ownRes, propRes, roomRes, tenRes, payRes] = await Promise.all([
        api.getDashboard().catch(() => null),
        api.getOwners().catch(() => ({ data: [] })),
        api.getProperties().catch(() => ({ data: [] })),
        api.getRooms().catch(() => ({ data: [] })),
        api.getTenants().catch(() => ({ data: [] })),
        api.getPayments().catch(() => ({ data: [] })),
      ]);

      if (dashRes && dashRes.success) {
        setDashboardData(dashRes.data);
        setBackendOnline(true);
      } else if (!dashRes) {
        setBackendOnline(false);
      }

      setOwners(ownRes.data || []);
      setProperties(propRes.data || []);
      setRooms(roomRes.data || []);
      setTenants(tenRes.data || []);
      setPayments(payRes.data || []);
    } catch (err) {
      console.warn('Failed to load initial data:', err);
      setBackendOnline(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Tab Title helper
  const getTabTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return { title: 'Dashboard Overview', subtitle: 'Live accommodation metrics & financial summary' };
      case 'properties':
        return { title: 'Owners & Properties', subtitle: 'Manage landlords, boarding houses, and amenities' };
      case 'rooms':
        return { title: 'Rooms Management', subtitle: 'Room capacities, monthly rents, and live bed occupancy' };
      case 'tenants':
        return { title: 'Tenants Directory', subtitle: 'Student resident roster, contact info, and room assignments' };
      case 'payments':
        return { title: 'Rent Payments', subtitle: 'Monthly rent collection logs and payment history' };
      default:
        return { title: 'Bodima System', subtitle: 'University Accommodation Manager' };
    }
  };

  const { title, subtitle } = getTabTitle();

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        counts={{
          properties: properties.length,
          rooms: rooms.length,
          tenants: tenants.length,
        }}
      />

      {/* Main Content Area */}
      <div className="main-wrapper">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-title">
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>

          <div className="topbar-actions">
            <button 
              className="btn btn-secondary btn-sm"
              onClick={loadAllData}
              title="Refresh all data"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </header>

        {/* Backend Warning Banner if offline */}
        {!backendOnline && (
          <div style={{
            margin: '20px 32px 0',
            padding: '14px 18px',
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            color: '#991B1B',
            fontSize: '0.86rem'
          }}>
            <AlertTriangle size={20} style={{ color: '#DC2626', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: '#7F1D1D', display: 'block', marginBottom: '2px' }}>
                Cannot connect to PHP REST API at http://localhost:8000
              </strong>
              Please ensure WampServer is running and start the PHP built-in server inside the `backend` folder:
              <pre style={{ margin: '6px 0 0', padding: '6px 10px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '6px', fontFamily: 'monospace', fontSize: '0.8rem', color: '#047857' }}>
                cd "E:\VIKUM\uni docs\2.2\Bodima_system\backend" ; php -S localhost:8000
              </pre>
            </div>
          </div>
        )}

        {/* Content Body */}
        <main className="content-body">
          {activeTab === 'dashboard' && (
            <DashboardView 
              data={dashboardData} 
              loading={loading}
              onNavigate={(tab) => setActiveTab(tab)}
              onRefresh={loadAllData}
            />
          )}

          {activeTab === 'properties' && (
            <OwnersPropertiesView 
              properties={properties}
              owners={owners}
              onRefresh={loadAllData}
              notify={notify}
              confirm={confirm}
            />
          )}

          {activeTab === 'rooms' && (
            <RoomsView 
              rooms={rooms}
              properties={properties}
              onRefresh={loadAllData}
              notify={notify}
              confirm={confirm}
            />
          )}

          {activeTab === 'tenants' && (
            <TenantsView 
              tenants={tenants}
              rooms={rooms}
              properties={properties}
              onRefresh={loadAllData}
              notify={notify}
              confirm={confirm}
            />
          )}

          {activeTab === 'payments' && (
            <PaymentsView 
              payments={payments}
              tenants={tenants}
              onRefresh={loadAllData}
              notify={notify}
              confirm={confirm}
            />
          )}
        </main>
      </div>

      {/* Floating Notifications */}
      <Notification 
        notifications={notifications} 
        onDismiss={dismissNotification} 
      />

      {/* Confirmation Dialog */}
      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
        isDanger={confirmConfig.isDanger}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
