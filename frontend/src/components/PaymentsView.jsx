import React, { useState } from 'react';
import { 
  CreditCard, 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  Calendar, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Filter, 
  X,
  DollarSign
} from 'lucide-react';
import { api } from '../api';

export default function PaymentsView({ 
  payments, 
  tenants, 
  onRefresh, 
  notify, 
  confirm 
}) {
  const [statusFilter, setStatusFilter] = useState('All');
  const [monthFilter, setMonthFilter] = useState('');
  const [search, setSearch] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);

  const [form, setForm] = useState({
    tenant_id: '',
    billing_month: new Date().toISOString().substring(0, 7),
    amount_paid: 7500,
    payment_date: new Date().toISOString().substring(0, 10),
    status: 'Paid'
  });

  const formatLKR = (val) => {
    return 'LKR ' + Number(val || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleOpenAdd = () => {
    if (tenants.length === 0) {
      notify('Please register tenants first before logging rent payments.', 'error');
      return;
    }

    const defaultTenant = tenants[0];
    const defaultRent = defaultTenant ? Number(defaultTenant.monthly_rent) : 7500;

    setEditingPayment(null);
    setForm({
      tenant_id: defaultTenant?.tenant_id || '',
      billing_month: new Date().toISOString().substring(0, 7),
      amount_paid: defaultRent,
      payment_date: new Date().toISOString().substring(0, 10),
      status: 'Paid'
    });
    setIsModalOpen(true);
  };

  const handleTenantChange = (tenantId) => {
    const selected = tenants.find((t) => Number(t.tenant_id) === Number(tenantId));
    setForm({
      ...form,
      tenant_id: Number(tenantId),
      amount_paid: selected ? Number(selected.monthly_rent) : form.amount_paid
    });
  };

  const handleOpenEdit = (payment) => {
    setEditingPayment(payment);
    setForm({
      tenant_id: payment.tenant_id,
      billing_month: payment.billing_month,
      amount_paid: payment.amount_paid,
      payment_date: payment.payment_date,
      status: payment.status
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (form.amount_paid < 0) {
      notify('Payment amount cannot be negative.', 'error');
      return;
    }

    try {
      if (editingPayment) {
        await api.updatePayment({
          payment_id: editingPayment.payment_id,
          ...form
        });
        notify('Payment record updated successfully!', 'success');
      } else {
        await api.createPayment(form);
        notify('Rent payment recorded successfully!', 'success');
      }
      setIsModalOpen(false);
      onRefresh();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const handleDelete = (payment) => {
    confirm({
      title: 'Delete Payment Record',
      message: `Are you sure you want to delete payment log #${payment.payment_id} (${formatLKR(payment.amount_paid)} for ${payment.tenant_name})? This action cannot be undone.`,
      confirmText: 'Delete Record',
      onConfirm: async () => {
        try {
          await api.deletePayment(payment.payment_id);
          notify('Payment record deleted successfully!', 'success');
          onRefresh();
        } catch (err) {
          notify(err.message, 'error');
        }
      }
    });
  };

  const filteredPayments = payments.filter((p) => {
    if (statusFilter !== 'All' && p.status !== statusFilter) return false;
    if (monthFilter && p.billing_month !== monthFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        p.tenant_name.toLowerCase().includes(q) ||
        p.property_name.toLowerCase().includes(q) ||
        p.room_number.toLowerCase().includes(q) ||
        p.billing_month.includes(q)
      );
    }
    return true;
  });

  return (
    <div>
      {/* Search & Filter Controls */}
      <div className="filter-bar">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input 
            type="text" 
            className="form-control" 
            placeholder="Search payments by tenant, property, or room..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={15} style={{ color: 'var(--text-muted)' }} />
          <select 
            className="form-control" 
            style={{ width: 'auto', padding: '6px 12px', fontSize: '0.85rem' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Partial">Partial</option>
            <option value="Pending">Pending</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={15} style={{ color: 'var(--text-muted)' }} />
          <input 
            type="month" 
            className="form-control" 
            style={{ width: 'auto', padding: '6px 12px', fontSize: '0.85rem' }}
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
          />
          {monthFilter && (
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => setMonthFilter('')}
              title="Clear month filter"
            >
              Clear
            </button>
          )}
        </div>

        <button className="btn btn-primary btn-sm" onClick={handleOpenAdd}>
          <Plus size={16} /> Record Payment
        </button>
      </div>

      {filteredPayments.length === 0 ? (
        <div className="glass-card empty-state">
          <CreditCard className="empty-state-icon" />
          <h4>No Payment Records Found</h4>
          <p>{search || statusFilter !== 'All' || monthFilter ? 'No transactions matched your filters.' : 'Record monthly student rent collections.'}</p>
          {!search && statusFilter === 'All' && !monthFilter && (
            <button className="btn btn-primary btn-sm" style={{ marginTop: '16px' }} onClick={handleOpenAdd}>
              <Plus size={16} /> Record First Payment
            </button>
          )}
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Receipt / Log</th>
                <th>Tenant</th>
                <th>Boarding Property</th>
                <th>Room</th>
                <th>Month</th>
                <th>Amount Paid</th>
                <th>Paid Date</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((p) => (
                <tr key={p.payment_id}>
                  <td>
                    <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      #{p.payment_id}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#fff' }}>{p.tenant_name}</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      {p.nic_or_reg_no}
                    </div>
                  </td>
                  <td>{p.property_name}</td>
                  <td>{p.room_number}</td>
                  <td>
                    <span style={{ fontFamily: 'monospace', color: 'var(--text-silver)', background: 'rgba(255,255,255,0.03)', padding: '2px 6px', borderRadius: '4px' }}>
                      {p.billing_month}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, color: '#34d399' }}>
                    {formatLKR(p.amount_paid)}
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{p.payment_date}</td>
                  <td>
                    <span className={`badge badge-${p.status.toLowerCase()}`}>
                      {p.status === 'Paid' && <CheckCircle size={12} />}
                      {p.status === 'Pending' && <Clock size={12} />}
                      {p.status === 'Partial' && <AlertCircle size={12} />}
                      {p.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button 
                        className="btn-icon edit" 
                        title="Edit Payment"
                        onClick={() => handleOpenEdit(p)}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        className="btn-icon delete" 
                        title="Delete Record"
                        onClick={() => handleDelete(p)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingPayment ? 'Edit Payment Log' : 'Record Rent Payment'}</h3>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Select Tenant <span className="required">*</span></label>
                  <select 
                    className="form-control" 
                    required
                    value={form.tenant_id}
                    onChange={(e) => handleTenantChange(e.target.value)}
                  >
                    {tenants.map((t) => (
                      <option key={t.tenant_id} value={t.tenant_id}>
                        {t.full_name} ({t.property_name} - {t.room_number}) [Rent: LKR {t.monthly_rent}]
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label>Billing Month <span className="required">*</span></label>
                    <input 
                      type="month" 
                      className="form-control" 
                      required 
                      value={form.billing_month}
                      onChange={(e) => setForm({ ...form, billing_month: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Amount Paid (LKR) <span className="required">*</span></label>
                    <input 
                      type="number" 
                      min="0" 
                      step="100"
                      className="form-control" 
                      required 
                      value={form.amount_paid}
                      onChange={(e) => setForm({ ...form, amount_paid: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: 0 }}>
                  <div className="form-group">
                    <label>Payment Date <span className="required">*</span></label>
                    <input 
                      type="date" 
                      className="form-control" 
                      required 
                      value={form.payment_date}
                      onChange={(e) => setForm({ ...form, payment_date: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Payment Status <span className="required">*</span></label>
                    <select 
                      className="form-control" 
                      required
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                    >
                      <option value="Paid">Paid (Full)</option>
                      <option value="Partial">Partial</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingPayment ? 'Save Changes' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
