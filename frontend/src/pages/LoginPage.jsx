import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

export function LoginPage() {
  const { signIn, loading, error } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await signIn(email, password);
      navigate('/');
    } catch {
      // error surfaced via useAuth().error
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontFamily: 'var(--font-data)', color: 'var(--signal)', fontWeight: 600, fontSize: 13 }}>#SITEWORK</div>
          <h2>Sign in</h2>
          <div className="muted" style={{ fontSize: 13 }}>Construction Project Management &amp; Mini-ERP</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>

          {error && <div className="callout" style={{ borderColor: 'var(--stop)', background: 'var(--stop-soft)', color: 'var(--stop)' }}>{error}</div>}

          <button className="btn primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
