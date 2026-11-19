import React from 'react';
import { 
  Building2, 
  DoorOpen, 
  BedDouble, 
  DollarSign, 
  UserPlus, 
  PlusCircle, 
  ArrowUpRight,
  ShieldCheck,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';

export default function DashboardView({ data, loading, onNavigate, onRefresh }) {
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
        <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid rgba(16, 185, 129, 0.2)', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '16px' }}>Loading live dashboard metrics...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const summary = data?.summary || {
    total_properties: 0,
    total_rooms: 0,
    vacant_beds: 0,
    total_tenants: 0,
    total_capacity: 0,
    current_month_revenue: 0,
    all_time_revenue: 0,
    current_month: new Date().toISOString().substring(0, 7)
  };

  const recentPayments = data?.recent_payments || [];
  const propertyOccupancies = data?.property_occupancies || [];

  const formatLKR = (val) => {
    return 'LKR ' + Number(val || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div>
      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon emerald">
            <Building2 size={24} />
          </div>
          <div className="kpi-details">
            <h3>Total Properties</h3>
            <div className="kpi-value">{summary.total_properties}</div>
            <div className="kpi-sub">{summary.total_owners || 0} Registered Landlord(s)</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon blue">
            <DoorOpen size={24} />
          </div>
          <div className="kpi-details">
            <h3>Total Rooms</h3>
            <div className="kpi-value">{summary.total_rooms}</div>
            <div className="kpi-sub">{summary.total_capacity} Total Bed Capacity</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon amber">
            <BedDouble size={24} />
          </div>
          <div className="kpi-details">
            <h3>Vacant Beds</h3>
            <div className="kpi-value" style={{ color: summary.vacant_beds > 0 ? '#34d399' : '#f87171' }}>
              {summary.vacant_beds}
            </div>
            <div className="kpi-sub">
              {summary.total_tenants} Active Student Tenant(s)
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon purple">
            <DollarSign size={24} />
          </div>
          <div className="kpi-details">
            <h3>Revenue ({summary.current_month})</h3>
            <div className="kpi-value" style={{ fontSize: '1.35rem' }}>
              {formatLKR(summary.current_month_revenue)}
            </div>
            <div className="kpi-sub">All-Time: {formatLKR(summary.all_time_revenue)}</div>
          </div>
        </div>
      </div>

      {/* Two Column Section: Property Occupancy & Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px', marginBottom: '28px' }}>
        
        {/* Properties Capacity Meter Card */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#fff' }}>Property Occupancy Status</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Live capacity vs occupied beds</p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('properties')}>
              View All <ArrowUpRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {propertyOccupancies.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No properties recorded yet.</div>
            ) : (
              propertyOccupancies.map((p) => {
                const totalCap = Number(p.total_capacity) || 0;
                const occ = Number(p.occupied_beds) || 0;
                const percent = totalCap > 0 ? Math.min(100, Math.round((occ / totalCap) * 100)) : 0;
                const isFull = totalCap > 0 && occ >= totalCap;

                return (
                  <div key={p.property_id} style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '0.9rem' }}>
                        {p.property_name}
                        <span className={`badge badge-gender-${p.gender_type.toLowerCase()}`} style={{ marginLeft: '8px', fontSize: '0.7rem' }}>
                          {p.gender_type}
                        </span>
                      </div>
                      <span className={`occupancy-badge ${isFull ? 'full' : percent > 50 ? 'part' : 'vacant'}`}>
                        {occ} / {totalCap} Beds ({percent}%)
                      </span>
                    </div>

                    <div className="meter-container">
                      <div 
                        className={`meter-bar ${isFull ? 'full' : percent > 50 ? 'mid' : 'low'}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quick Operations & System Highlights */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>Quick Actions</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '20px' }}>Streamline day-to-day boarding operations</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }}>
              <button 
                className="btn btn-primary" 
                style={{ height: '70px', flexDirection: 'column', gap: '6px' }}
                onClick={() => onNavigate('tenants')}
              >
                <UserPlus size={20} />
                <span>Register Tenant</span>
              </button>

              <button 
                className="btn btn-secondary" 
                style={{ height: '70px', flexDirection: 'column', gap: '6px', background: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.25)', color: '#34d399' }}
                onClick={() => onNavigate('payments')}
              >
                <PlusCircle size={20} />
                <span>Log Rent Payment</span>
              </button>
            </div>

            <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <ShieldCheck size={18} style={{ color: '#10b981' }} />
                <span style={{ fontSize: '0.86rem', fontWeight: 600, color: '#fff' }}>Relational Integrity Rules Active</span>
              </div>
              <ul style={{ paddingLeft: '20px', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                <li>Overbooking strictly blocked at backend database & API level.</li>
                <li>Foreign Key cascade prevention keeps orphan records clean.</li>
                <li>Prepared Statements active on all REST endpoints.</li>
              </ul>
            </div>
          </div>

          <div style={{ marginTop: '16px', textAlign: 'right' }}>
            <button className="btn btn-secondary btn-sm" onClick={onRefresh}>
              Refresh Metrics
            </button>
          </div>
        </div>

      </div>

      {/* Recent Rent Payments Table */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#fff' }}>Recent Rent Payments</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Latest transactions logged across properties</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('payments')}>
            View All Logs <ArrowUpRight size={14} />
          </button>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Tenant Name</th>
                <th>Boarding Property</th>
                <th>Room</th>
                <th>Billing Month</th>
                <th>Amount Paid</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentPayments.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No payment records available.
                  </td>
                </tr>
              ) : (
                recentPayments.map((p) => (
                  <tr key={p.payment_id}>
                    <td style={{ fontWeight: 600, color: '#fff' }}>{p.tenant_name}</td>
                    <td>{p.property_name}</td>
                    <td>{p.room_number}</td>
                    <td><span style={{ fontFamily: 'monospace' }}>{p.billing_month}</span></td>
                    <td style={{ fontWeight: 600, color: '#34d399' }}>{formatLKR(p.amount_paid)}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{p.payment_date}</td>
                    <td>
                      <span className={`badge badge-${p.status.toLowerCase()}`}>
                        {p.status === 'Paid' && <CheckCircle size={12} />}
                        {p.status === 'Pending' && <Clock size={12} />}
                        {p.status === 'Partial' && <AlertCircle size={12} />}
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
