import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api, session } from '../lib/api.js';

export default function Login() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (session.get()) return <Navigate to="/" replace />;

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token } = await api.login(password);
      session.set(token);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <span className="login-logo">🧺</span>
        <h1>Hozmagazin Admin</h1>
        <p className="muted">Do'kon boshqaruv paneliga kirish</p>

        <label className="field">
          <span>Parol</span>
          <input
            className="input"
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Parolni kiriting"
          />
        </label>
        <p className="muted small">Parol serverdagi ADMIN_PASSWORD sozlamasida</p>

        {error && <div className="form-error">{error}</div>}

        <button className="btn btn-primary btn-block" disabled={loading || !password}>
          {loading ? 'Tekshirilmoqda...' : 'Kirish'}
        </button>
      </form>
    </div>
  );
}
