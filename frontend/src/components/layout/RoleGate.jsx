import { useAuth } from '../../auth/useAuth';

/**
 * UX-layer role gating only. The backend independently enforces and
 * scrubs data per role (see backend/src/middleware/rbac.js) — this
 * component just keeps the UI from offering actions a role can't take.
 */
export function RoleGate({ allow, children, fallback = null }) {
  const { user } = useAuth();
  if (!user || !allow.includes(user.roleName)) return fallback;
  return children;
}
