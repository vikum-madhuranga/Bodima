import React, { useState } from 'react';
import { 
  Building2, 
  UserCheck, 
  Plus, 
  Edit2, 
  Trash2, 
  Phone, 
  MapPin, 
  FileText, 
  Filter,
  X
} from 'lucide-react';
import { api } from '../api';

export default function OwnersPropertiesView({ 
  properties, 
  owners, 
  onRefresh, 
  notify, 
  confirm 
}) {
  const [activeSubTab, setActiveSubTab] = useState('properties');
  const [genderFilter, setGenderFilter] = useState('All');

  // Property Modal State
  const [isPropModalOpen, setIsPropModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [propForm, setPropForm] = useState({
    owner_id: '',
    property_name: '',
    address: '',
    gender_type: 'Boys',
    utility_notes: ''
  });

  // Owner Modal State
  const [isOwnerModalOpen, setIsOwnerModalOpen] = useState(false);
  const [editingOwner, setEditingOwner] = useState(null);
  const [ownerForm, setOwnerForm] = useState({
    full_name: '',
    phone: '',
    nic_number: ''
  });

  // --- Property Handlers ---
  const handleOpenAddProperty = () => {
    if (owners.length === 0) {
      notify('Please register at least one owner/landlord first before creating a property.', 'error');
      setActiveSubTab('owners');
      return;
    }
    setEditingProperty(null);
    setPropForm({
      owner_id: owners[0]?.owner_id || '',
      property_name: '',
      address: '',
      gender_type: 'Boys',
      utility_notes: ''
    });
    setIsPropModalOpen(true);
  };

  const handleOpenEditProperty = (prop) => {
    setEditingProperty(prop);
    setPropForm({
      owner_id: prop.owner_id,
      property_name: prop.property_name,
      address: prop.address,
      gender_type: prop.gender_type,
      utility_notes: prop.utility_notes || ''
    });
    setIsPropModalOpen(true);
  };

  const handleSaveProperty = async (e) => {
    e.preventDefault();
    try {
      if (editingProperty) {
        await api.updateProperty({
          property_id: editingProperty.property_id,
          ...propForm
        });
        notify('Property updated successfully!', 'success');
      } else {
        await api.createProperty(propForm);
        notify('Property created successfully!', 'success');
      }
      setIsPropModalOpen(false);
      onRefresh();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const handleDeleteProperty = (prop) => {
    confirm({
      title: 'Delete Property',
      message: `Are you sure you want to delete "${prop.property_name}"? If there are rooms registered in this property, MySQL foreign key constraints will block deletion until rooms are removed.`,
      confirmText: 'Delete Property',
      onConfirm: async () => {
        try {
          await api.deleteProperty(prop.property_id);
          notify('Property deleted successfully!', 'success');
          onRefresh();
        } catch (err) {
          notify(err.message, 'error');
        }
      }
    });
  };

  // --- Owner Handlers ---
  const handleOpenAddOwner = () => {
    setEditingOwner(null);
    setOwnerForm({
      full_name: '',
      phone: '',
      nic_number: ''
    });
    setIsOwnerModalOpen(true);
  };

  const handleOpenEditOwner = (owner) => {
    setEditingOwner(owner);
    setOwnerForm({
      full_name: owner.full_name,
      phone: owner.phone,
      nic_number: owner.nic_number
    });
    setIsOwnerModalOpen(true);
  };

  const handleSaveOwner = async (e) => {
    e.preventDefault();
    if (!/^0[0-9]{9}$/.test(ownerForm.phone)) {
      notify('Phone number must be 10 digits (e.g. 0771234567)', 'error');
      return;
    }

    try {
      if (editingOwner) {
        await api.updateOwner({
          owner_id: editingOwner.owner_id,
          ...ownerForm
        });
        notify('Owner updated successfully!', 'success');
      } else {
        await api.createOwner(ownerForm);
        notify('Owner registered successfully!', 'success');
      }
      setIsOwnerModalOpen(false);
      onRefresh();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const handleDeleteOwner = (owner) => {
    confirm({
      title: 'Delete Owner',
      message: `Are you sure you want to delete landlord "${owner.full_name}"? MySQL Foreign Key constraints will prevent deletion if this owner still has active properties.`,
      confirmText: 'Delete Owner',
      onConfirm: async () => {
        try {
          await api.deleteOwner(owner.owner_id);
          notify('Owner deleted successfully!', 'success');
          onRefresh();
        } catch (err) {
          notify(err.message, 'error');
        }
      }
    });
  };

  // Filter properties
  const filteredProperties = properties.filter((p) => {
    if (genderFilter === 'All') return true;
    return p.gender_type === genderFilter;
  });

  return (
    <div>
      {/* Sub tabs header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
          <button 
            className={`btn btn-sm ${activeSubTab === 'properties' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveSubTab('properties')}
            style={{ borderRadius: '8px' }}
          >
            <Building2 size={16} />
            Properties ({properties.length})
          </button>
          <button 
            className={`btn btn-sm ${activeSubTab === 'owners' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveSubTab('owners')}
            style={{ borderRadius: '8px' }}
          >
            <UserCheck size={16} />
            Landlords / Owners ({owners.length})
          </button>
        </div>

        {activeSubTab === 'properties' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={15} style={{ color: 'var(--text-muted)' }} />
              <select 
                className="form-control" 
                style={{ width: 'auto', padding: '6px 12px', fontSize: '0.85rem' }}
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
              >
                <option value="All">All Genders</option>
                <option value="Boys">Boys Only</option>
                <option value="Girls">Girls Only</option>
                <option value="Mixed">Mixed</option>
              </select>
            </div>
            <button className="btn btn-primary btn-sm" onClick={handleOpenAddProperty}>
              <Plus size={16} /> Add Property
            </button>
          </div>
        ) : (
          <button className="btn btn-primary btn-sm" onClick={handleOpenAddOwner}>
            <Plus size={16} /> Register Landlord
          </button>
        )}
      </div>

      {/* PROPERTIES SUB-TAB */}
      {activeSubTab === 'properties' && (
        <div>
          {filteredProperties.length === 0 ? (
            <div className="glass-card empty-state">
              <Building2 className="empty-state-icon" />
              <h4>No Properties Found</h4>
              <p>Add boarding properties to manage rooms, occupancy, and university student tenants.</p>
              <button className="btn btn-primary btn-sm" style={{ marginTop: '16px' }} onClick={handleOpenAddProperty}>
                <Plus size={16} /> Add First Property
              </button>
            </div>
          ) : (
            <div className="cards-grid">
              {filteredProperties.map((p) => {
                const totalCap = Number(p.total_capacity) || 0;
                const occ = Number(p.occupied_beds) || 0;
                const percent = totalCap > 0 ? Math.min(100, Math.round((occ / totalCap) * 100)) : 0;
                const isFull = totalCap > 0 && occ >= totalCap;

                return (
                  <div key={p.property_id} className="glass-card property-card">
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <div>
                          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
                            {p.property_name}
                          </h3>
                          <span className={`badge badge-gender-${p.gender_type.toLowerCase()}`}>
                            {p.gender_type}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button 
                            className="btn-icon edit" 
                            title="Edit Property"
                            onClick={() => handleOpenEditProperty(p)}
                          >
                            <Edit2 size={15} />
                          </button>
                          <button 
                            className="btn-icon delete" 
                            title="Delete Property"
                            onClick={() => handleDeleteProperty(p)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-silver)', fontSize: '0.85rem', marginBottom: '8px' }}>
                        <MapPin size={15} style={{ color: 'var(--accent-emerald)', flexShrink: 0 }} />
                        <span>{p.address}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '14px' }}>
                        <UserCheck size={14} style={{ flexShrink: 0 }} />
                        <span>Owner: <strong style={{ color: '#fff' }}>{p.owner_name}</strong> ({p.owner_phone})</span>
                      </div>

                      {p.utility_notes && (
                        <div style={{ 
                          fontSize: '0.82rem', 
                          color: 'var(--text-secondary)', 
                          background: 'rgba(255, 255, 255, 0.05)', 
                          padding: '12px', 
                          borderRadius: '10px',
                          border: '1px solid rgba(255,255,255,0.08)',
                          marginBottom: '16px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-emerald-light)', marginBottom: '5px', fontSize: '0.76rem', fontWeight: 600 }}>
                            <FileText size={13} /> Utility & Amenities Notes:
                          </div>
                          {p.utility_notes}
                        </div>
                      )}
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '14px', marginTop: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{p.total_rooms} Rooms Available</span>
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
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* OWNERS SUB-TAB */}
      {activeSubTab === 'owners' && (
        <div>
          {owners.length === 0 ? (
            <div className="glass-card empty-state">
              <UserCheck className="empty-state-icon" />
              <h4>No Landlords Registered</h4>
              <p>Register property owners/landlords first to associate with boarding houses.</p>
              <button className="btn btn-primary btn-sm" style={{ marginTop: '16px' }} onClick={handleOpenAddOwner}>
                <Plus size={16} /> Register Landlord
              </button>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Landlord Name</th>
                    <th>Phone Number</th>
                    <th>NIC Number</th>
                    <th>Properties Owned</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {owners.map((o) => (
                    <tr key={o.owner_id}>
                      <td style={{ fontWeight: 600, color: '#fff' }}>{o.full_name}</td>
                      <td>
                        <a href={`tel:${o.phone}`} style={{ color: 'var(--accent-emerald-light)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Phone size={13} /> {o.phone}
                        </a>
                      </td>
                      <td><span style={{ fontFamily: 'monospace', color: 'var(--text-silver)' }}>{o.nic_number}</span></td>
                      <td>
                        <span className="badge badge-paid" style={{ fontSize: '0.78rem' }}>
                          {o.properties_count || 0} property/properties
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button 
                            className="btn-icon edit" 
                            title="Edit Owner"
                            onClick={() => handleOpenEditOwner(o)}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            className="btn-icon delete" 
                            title="Delete Owner"
                            onClick={() => handleDeleteOwner(o)}
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
        </div>
      )}

      {/* PROPERTY MODAL */}
      {isPropModalOpen && (
        <div className="modal-overlay" onClick={() => setIsPropModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingProperty ? 'Edit Boarding Property' : 'Add New Property'}</h3>
              <button className="btn-icon" onClick={() => setIsPropModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveProperty}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Property Name <span className="required">*</span></label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required 
                    placeholder="e.g. Sarasavi Villa"
                    value={propForm.property_name}
                    onChange={(e) => setPropForm({ ...propForm, property_name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Landlord / Owner <span className="required">*</span></label>
                  <select 
                    className="form-control" 
                    required
                    value={propForm.owner_id}
                    onChange={(e) => setPropForm({ ...propForm, owner_id: Number(e.target.value) })}
                  >
                    {owners.map((o) => (
                      <option key={o.owner_id} value={o.owner_id}>
                        {o.full_name} ({o.phone})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Gender Category <span className="required">*</span></label>
                  <select 
                    className="form-control"
                    value={propForm.gender_type}
                    onChange={(e) => setPropForm({ ...propForm, gender_type: e.target.value })}
                  >
                    <option value="Boys">Boys</option>
                    <option value="Girls">Girls</option>
                    <option value="Mixed">Mixed</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Full Address <span className="required">*</span></label>
                  <textarea 
                    className="form-control" 
                    required 
                    placeholder="e.g. No. 42, Lake View Road, Mihintale"
                    value={propForm.address}
                    onChange={(e) => setPropForm({ ...propForm, address: e.target.value })}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Utility & Facility Notes</label>
                  <textarea 
                    className="form-control" 
                    placeholder="e.g. Free Wi-Fi, separate sub-meter, drinking water filter"
                    value={propForm.utility_notes}
                    onChange={(e) => setPropForm({ ...propForm, utility_notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsPropModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingProperty ? 'Save Changes' : 'Create Property'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OWNER MODAL */}
      {isOwnerModalOpen && (
        <div className="modal-overlay" onClick={() => setIsOwnerModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingOwner ? 'Edit Landlord Details' : 'Register New Landlord'}</h3>
              <button className="btn-icon" onClick={() => setIsOwnerModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveOwner}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Full Name <span className="required">*</span></label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required 
                    placeholder="e.g. Bandara Dissanayake"
                    value={ownerForm.full_name}
                    onChange={(e) => setOwnerForm({ ...ownerForm, full_name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Phone Number (10 Digits) <span className="required">*</span></label>
                  <input 
                    type="tel" 
                    className="form-control" 
                    required 
                    placeholder="0771234567"
                    value={ownerForm.phone}
                    onChange={(e) => setOwnerForm({ ...ownerForm, phone: e.target.value })}
                  />
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                    Must be in Sri Lankan 10-digit format (07XXXXXXXX).
                  </small>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>National Identity Card (NIC) <span className="required">*</span></label>
                  <input 
                    type="text" 
                    className="form-control" 
                    required 
                    placeholder="e.g. 721893450V or 199912345678"
                    value={ownerForm.nic_number}
                    onChange={(e) => setOwnerForm({ ...ownerForm, nic_number: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsOwnerModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingOwner ? 'Save Changes' : 'Register Landlord'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
