import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Edit2, 
  Trash2, 
  Phone, 
  Search, 
  Calendar, 
  Building2, 
  DoorOpen, 
  X,
  CreditCard,
  CheckCircle2
} from 'lucide-react';
import { api } from '../api';

export default function TenantsView({ 
  tenants, 
  rooms, 
  properties, 
  onRefresh, 
  notify, 
  confirm 
}) {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);

  const [form, setForm] = useState({
    room_id: '',
    full_name: '',
    nic_or_reg_no: '',
    phone: '',
    check_in_date: new Date().toISOString().substring(0, 10)
  });

  const handleOpenAdd = () => {
    if (rooms.length === 0) {
      notify('Please configure rooms first before registering tenants.', 'error');
      return;
    }

    // Find the first room with available capacity
    const availableRoom = rooms.find((r) => Number(r.vacant_beds) > 0);
    if (!availableRoom) {
      notify('All registered rooms are currently at full capacity! Add more rooms or adjust capacity.', 'error');
    }

    setEditingTenant(null);
    setForm({
      room_id: availableRoom ? availableRoom.room_id : rooms[0]?.room_id || '',
      full_name: '',
      nic_or_reg_no: '',
      phone: '',
      check_in_date: new Date().toISOString().substring(0, 10)
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tenant) => {
    setEditingTenant(tenant);
    setForm({
      room_id: tenant.room_id,
      full_name: tenant.full_name,
      nic_or_reg_no: tenant.nic_or_reg_no,
      phone: tenant.phone,
      check_in_date: tenant.check_in_date
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    // Validate Sri Lankan 10-digit phone
    const phoneClean = form.phone.trim();
    if (!/^0[0-9]{9}$/.test(phoneClean)) {
      notify('Phone number must be a valid 10-digit number (e.g. 0771234567 or 0714567890)', 'error');
      return;
    }

    try {
      if (editingTenant) {
        await api.updateTenant({
          tenant_id: editingTenant.tenant_id,
          ...form,
          phone: phoneClean
        });
        notify('Tenant details updated successfully!', 'success');
      } else {
        await api.createTenant({
          ...form,
          phone: phoneClean
        });
        notify('Tenant registered and assigned to room successfully!', 'success');
      }
      setIsModalOpen(false);
      onRefresh();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const handleDelete = (tenant) => {
    confirm({
      title: 'Delete Tenant',
      message: `Are you sure you want to remove tenant "${tenant.full_name}" (${tenant.nic_or_reg_no})? MySQL Foreign Key constraints will prevent deletion if this tenant has recorded rent payments.`,
      confirmText: 'Remove Tenant',
      onConfirm: async () => {
        try {
          await api.deleteTenant(tenant.tenant_id);
          notify('Tenant removed successfully!', 'success');
          onRefresh();
        } catch (err) {
          notify(err.message, 'error');
        }
      }
    });
  };

  // Filter tenants by search query
  const filteredTenants = tenants.filter((t) => {
    const q = search.toLowerCase();
    return (
      t.full_name.toLowerCase().includes(q) ||
      t.nic_or_reg_no.toLowerCase().includes(q) ||
      t.phone.toLowerCase().includes(q) ||
      t.property_name.toLowerCase().includes(q) ||
      t.room_number.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      {/* Top Search & Action Bar */}
      <div className="filter-bar">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input 
            type="text" 
            className="form-control" 
            placeholder="Search tenant by name, NIC / Student Reg No, room, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <button className="btn btn-primary btn-sm" onClick={handleOpenAdd}>
          <UserPlus size={16} /> Register Tenant
        </button>
      </div>

      {filteredTenants.length === 0 ? (
        <div className="glass-card empty-state">
          <Users className="empty-state-icon" />
          <h4>No Tenants Found</h4>
          <p>{search ? 'No tenant matched your search query.' : 'Register university students or tenants to boarding rooms.'}</p>
          {!search && (
            <button className="btn btn-primary btn-sm" style={{ marginTop: '16px' }} onClick={handleOpenAdd}>
              <UserPlus size={16} /> Register First Tenant
            </button>
          )}
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Tenant Details</th>
                <th>NIC / Reg No</th>
                <th>Contact</th>
                <th>Boarding Room</th>
                <th>Check-in Date</th>
                <th>Rent Payments</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTenants.map((t) => (
                <tr key={t.tenant_id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.full_name}</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      ID: #{t.tenant_id}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)', background: '#F1F5F9', padding: '3px 8px', borderRadius: '6px', border: '1px solid #CBD5E1' }}>
                      {t.nic_or_reg_no}
                    </span>
                  </td>
                  <td>
                    <a 
                      href={`tel:${t.phone}`} 
                      style={{ color: '#059669', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Phone size={13} /> {t.phone}
                    </a>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                      {t.room_number}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {t.property_name} ({t.gender_type})
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-silver)' }}>
                      <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
                      {t.check_in_date}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CreditCard size={13} style={{ color: 'var(--accent-emerald)' }} />
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-silver)' }}>
                        {t.total_payments_count || 0} log(s)
                      </span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button 
                        className="btn-icon edit" 
                        title="Edit Tenant"
                        onClick={() => handleOpenEdit(t)}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        className="btn-icon delete" 
                        title="Remove Tenant"
                        onClick={() => handleDelete(t)}
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

      {/* TENANT MODAL */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingTenant ? 'Edit Tenant Information' : 'Register New Tenant'}</h3>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Full Student / Tenant Name <span className="required">*</span></label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required 
                    placeholder="e.g. Kasun Wickramasinghe"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>NIC or University Student Reg No <span className="required">*</span></label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required 
                    placeholder="e.g. RJT/2022/ICT/012 or 200012345678"
                    value={form.nic_or_reg_no}
                    onChange={(e) => setForm({ ...form, nic_or_reg_no: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Phone Number (10 Digits Sri Lankan) <span className="required">*</span></label>
                  <input 
                    type="tel" 
                    className="form-control" 
                    required 
                    placeholder="0778901234"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                    10 digits starting with 07 (e.g. 0771234567, 0719876543)
                  </small>
                </div>

                {/* ROOM SELECTION WITH STRICT CAPACITY & DISABLED FULL ROOMS */}
                <div className="form-group">
                  <label>Assign Boarding Room <span className="required">*</span></label>
                  <select 
                    className="form-control" 
                    required
                    value={form.room_id}
                    onChange={(e) => setForm({ ...form, room_id: Number(e.target.value) })}
                  >
                    {rooms.map((r) => {
                      const isCurrentTenantRoom = editingTenant && Number(editingTenant.room_id) === Number(r.room_id);
                      const isFull = Number(r.vacant_beds) <= 0 && !isCurrentTenantRoom;

                      return (
                        <option 
                          key={r.room_id} 
                          value={r.room_id} 
                          disabled={isFull}
                          style={isFull ? { color: '#94a3b8', fontStyle: 'italic' } : {}}
                        >
                          {r.property_name} — {r.room_number} ({r.gender_type}) 
                          {isFull 
                            ? ` [FULL: ${r.occupied_beds}/${r.capacity} beds taken]` 
                            : ` [${r.vacant_beds} bed(s) available - LKR ${r.monthly_rent}/mo]`}
                        </option>
                      );
                    })}
                  </select>
                  <small style={{ color: 'var(--accent-emerald-light)', fontSize: '0.74rem', marginTop: '4px', display: 'block' }}>
                    Rooms at full capacity are disabled automatically to prevent overbooking.
                  </small>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Check-in Date <span className="required">*</span></label>
                  <input 
                    type="date" 
                    className="form-control" 
                    required 
                    value={form.check_in_date}
                    onChange={(e) => setForm({ ...form, check_in_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingTenant ? 'Save Changes' : 'Register Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
