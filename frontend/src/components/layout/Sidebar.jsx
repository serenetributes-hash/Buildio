import { NavLink } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';

const ROLE_LABELS = {
  admin_director: 'Main Admin',
  accountant: 'Accountant',
  receptionist: 'Receptionist',
  client: 'Client',
};

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', allow: ['admin_director', 'accountant', 'receptionist'] },
  { to: '/inventory', label: 'Inventory', allow: ['admin_director', 'accountant'] },
  { to: '/finance', label: 'Finance / P&L', allow: ['admin_director', 'accountant'] },
  { to: '/users', label: 'Users', allow: ['admin_director'] },
  { to: '/portal', label: 'My Project', allow: ['client'] },
];

export function Sidebar() {
  const { user, signOut } = useAuth();
  const items = NAV_ITEMS.filter((item) => item.allow.includes(user.roleName));

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="mark">#</span>
        <span className="name">Sitework</span>
      </div>

      <nav>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div>{user.fullName}</div>
        <span className="role-tag">{ROLE_LABELS[user.roleName] || user.roleName}</span>
        <div style={{ marginTop: 12 }}>
          <button className="btn ghost" style={{ color: '#cfd8e3', borderColor: 'rgba(255,255,255,0.18)', width: '100%' }} onClick={signOut}>
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}
