import React from 'react';
import { 
  Home, 
  Building2, 
  DoorOpen, 
  Users, 
  CreditCard, 
  Layers
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, counts = {} }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard Overview', icon: Home, count: null },
    { id: 'properties', label: 'Owners & Properties', icon: Building2, count: counts.properties },
    { id: 'rooms', label: 'Rooms Management', icon: DoorOpen, count: counts.rooms },
    { id: 'tenants', label: 'Tenants Directory', icon: Users, count: counts.tenants },
    { id: 'payments', label: 'Rent Payments', icon: CreditCard, count: null },
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-icon">
          <Layers size={22} />
        </div>
        <div className="brand-text">
          <h1>Bodima</h1>
          <span>Finder & Tenant Manager</span>
        </div>
      </div>

      <ul className="nav-links">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <li 
              key={item.id} 
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
              {item.count !== null && item.count !== undefined && (
                <span className="nav-badge">{item.count}</span>
              )}
            </li>
          );
        })}
      </ul>

      <div className="sidebar-footer">
        <strong>ICT 2308 Database Systems</strong>
        <span>Rajarata University Demo</span>
      </div>
    </aside>
  );
}
