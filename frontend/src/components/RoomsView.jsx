import React, { useState } from 'react';
import { 
  DoorOpen, 
  Plus, 
  Edit2, 
  Trash2, 
  Users, 
  Filter,
  X,
  Building2,
  DollarSign
} from 'lucide-react';
import { api } from '../api';

export default function RoomsView({ 
  rooms, 
  properties, 
  onRefresh, 
  notify, 
  confirm 
}) {
  const [propertyFilter, setPropertyFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);

  const [form, setForm] = useState({
    property_id: '',
    room_number: '',
    capacity: 2,
    monthly_rent: 7000
  });

  const formatLKR = (val) => {
    return 'LKR ' + Number(val || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleOpenAdd = () => {
    if (properties.length === 0) {
      notify('Please add a property first before configuring rooms.', 'error');
      return;
    }
    setEditingRoom(null);
    setForm({
      property_id: properties[0]?.property_id || '',
      room_number: '',
      capacity: 2,
      monthly_rent: 7500
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (room) => {
    setEditingRoom(room);
    setForm({
      property_id: room.property_id,
      room_number: room.room_number,
      capacity: room.capacity,
      monthly_rent: room.monthly_rent
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (form.capacity <= 0) {
      notify('Room capacity must be at least 1 bed.', 'error');
      return;
    }
    if (form.monthly_rent < 0) {
      notify('Monthly rent cannot be negative.', 'error');
      return;
    }

    try {
      if (editingRoom) {
        await api.updateRoom({
          room_id: editingRoom.room_id,
          ...form
        });
        notify('Room updated successfully!', 'success');
      } else {
        await api.createRoom(form);
        notify('Room created successfully!', 'success');
      }
      setIsModalOpen(false);
      onRefresh();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const handleDelete = (room) => {
    confirm({
      title: 'Delete Room',
      message: `Are you sure you want to delete "${room.room_number}" from "${room.property_name}"? MySQL Foreign Key constraints will prevent deletion if tenants are currently assigned to this room.`,
      confirmText: 'Delete Room',
      onConfirm: async () => {
        try {
          await api.deleteRoom(room.room_id);
          notify('Room deleted successfully!', 'success');
          onRefresh();
        } catch (err) {
          notify(err.message, 'error');
        }
      }
    });
  };

  const filteredRooms = rooms.filter((r) => {
    if (propertyFilter === 'All') return true;
    return String(r.property_id) === String(propertyFilter);
  });

  return (
    <div>
      {/* Header & Filter Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Filter size={16} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Filter Property:</span>
          <select 
            className="form-control"
            style={{ width: 'auto', padding: '6px 12px', fontSize: '0.85rem' }}
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
          >
            <option value="All">All Boarding Properties ({rooms.length} Rooms)</option>
            {properties.map((p) => (
              <option key={p.property_id} value={p.property_id}>
                {p.property_name}
              </option>
            ))}
          </select>
        </div>

        <button className="btn btn-primary btn-sm" onClick={handleOpenAdd}>
          <Plus size={16} /> Add Room
        </button>
      </div>

      {filteredRooms.length === 0 ? (
        <div className="glass-card empty-state">
          <DoorOpen className="empty-state-icon" />
          <h4>No Rooms Found</h4>
          <p>Create room numbers and specify bed capacities and monthly rent for your boarding house.</p>
          <button className="btn btn-primary btn-sm" style={{ marginTop: '16px' }} onClick={handleOpenAdd}>
            <Plus size={16} /> Add First Room
          </button>
        </div>
      ) : (
        <div className="cards-grid">
          {filteredRooms.map((room) => {
            const cap = Number(room.capacity) || 0;
            const occ = Number(room.occupied_beds) || 0;
            const vacant = Number(room.vacant_beds) || 0;
            const isFull = occ >= cap;
            const percent = cap > 0 ? Math.min(100, Math.round((occ / cap) * 100)) : 0;

            return (
              <div key={room.room_id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <DoorOpen size={18} style={{ color: 'var(--accent-emerald-light)' }} />
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
                          {room.room_number}
                        </h3>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Building2 size={13} /> {room.property_name}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button 
                        className="btn-icon edit" 
                        title="Edit Room"
                        onClick={() => handleOpenEdit(room)}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        className="btn-icon delete" 
                        title="Delete Room"
                        onClick={() => handleDelete(room)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    padding: '12px 14px', 
                    background: 'rgba(255, 255, 255, 0.02)', 
                    borderRadius: '8px', 
                    border: '1px solid rgba(255,255,255,0.04)',
                    marginBottom: '14px' 
                  }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block' }}>
                        Monthly Rent
                      </span>
                      <strong style={{ fontSize: '1.05rem', color: '#34d399' }}>
                        {formatLKR(room.monthly_rent)}
                      </strong>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block' }}>
                        Live Occupancy
                      </span>
                      <span className={`occupancy-badge ${isFull ? 'full' : occ > 0 ? 'part' : 'vacant'}`}>
                        {isFull ? `Full (${occ}/${cap})` : `${occ} / ${cap} Occupied`}
                      </span>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.82rem', color: 'var(--text-silver)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Capacity: <strong>{cap} Beds</strong></span>
                    <span style={{ color: vacant > 0 ? '#34d399' : '#f87171' }}>
                      <strong>{vacant}</strong> bed(s) available
                    </span>
                  </div>

                  <div className="meter-container">
                    <div 
                      className={`meter-bar ${isFull ? 'full' : occ > 0 ? 'mid' : 'low'}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                <div style={{ 
                  marginTop: '16px', 
                  paddingTop: '12px', 
                  borderTop: '1px solid var(--border-subtle)', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  fontSize: '0.76rem',
                  color: 'var(--text-muted)'
                }}>
                  <span>Gender: <strong style={{ color: 'var(--text-silver)' }}>{room.gender_type}</strong></span>
                  <span>Owner: <strong style={{ color: 'var(--text-silver)' }}>{room.owner_name}</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ROOM MODAL */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingRoom ? 'Edit Room' : 'Add New Room'}</h3>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Boarding Property <span className="required">*</span></label>
                  <select 
                    className="form-control" 
                    required
                    value={form.property_id}
                    onChange={(e) => setForm({ ...form, property_id: Number(e.target.value) })}
                  >
                    {properties.map((p) => (
                      <option key={p.property_id} value={p.property_id}>
                        {p.property_name} ({p.gender_type})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Room Number / Label <span className="required">*</span></label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required 
                    placeholder="e.g. Room A-101 or 2nd Floor Dorm"
                    value={form.room_number}
                    onChange={(e) => setForm({ ...form, room_number: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label>Bed Capacity <span className="required">*</span></label>
                    <input 
                      type="number" 
                      min="1" 
                      max="20"
                      className="form-control" 
                      required 
                      value={form.capacity}
                      onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
                    />
                    {editingRoom && (
                      <small style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                        Current tenants: {editingRoom.occupied_beds}
                      </small>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Monthly Rent (LKR) <span className="required">*</span></label>
                    <input 
                      type="number" 
                      min="0" 
                      step="100"
                      className="form-control" 
                      required 
                      value={form.monthly_rent}
                      onChange={(e) => setForm({ ...form, monthly_rent: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingRoom ? 'Save Changes' : 'Create Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
