import { useEffect, useState } from 'react';
import authService from '../services/authService';
import Loader from '../components/Loader';

const EMPTY_CREDENTIALS = {
  linkedin: { email: '', password: '' },
  indeed: { email: '', password: '' },
  naukri: { email: '', password: '' },
  unstop: { email: '', password: '' },
  google: { email: '', password: '' },
  generic: { email: '', password: '' },
};

const platforms = [
  { id: 'linkedin', label: 'LinkedIn', icon: 'LI' },
  { id: 'indeed', label: 'Indeed', icon: 'IN' },
  { id: 'naukri', label: 'Naukri', icon: 'NK' },
  { id: 'unstop', label: 'Unstop', icon: 'US' },
  { id: 'google', label: 'Google / Gmail', icon: 'G' },
  { id: 'generic', label: 'Generic / Fallback', icon: '*' },
];

const mergeCredentials = (loadedCreds = {}) => {
  return Object.keys(EMPTY_CREDENTIALS).reduce((next, platform) => {
    next[platform] = {
      email: loadedCreds[platform]?.email || loadedCreds[platform]?.username || '',
      password: loadedCreds[platform]?.password || '',
    };
    return next;
  }, {});
};

const CredentialsPage = () => {
  const [credentials, setCredentials] = useState(EMPTY_CREDENTIALS);
  const [showPassword, setShowPassword] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCredentials = async () => {
      try {
        const response = await authService.getCredentials();
        setCredentials(mergeCredentials(response.credentials));
      } catch (err) {
        console.error('Failed to load credentials:', err);
        setError(err.response?.data?.message || err.message || 'Could not retrieve credentials.');
      } finally {
        setLoading(false);
      }
    };
    fetchCredentials();
  }, []);

  const handleChange = (platform, field, value) => {
    setCredentials(prev => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        [field]: value,
      },
    }));
  };

  const togglePasswordVisibility = (platform) => {
    setShowPassword(prev => ({
      ...prev,
      [platform]: !prev[platform],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');
    setError('');

    try {
      const hasPartialCredentials = Object.values(credentials).some(
        ({ email, password }) => (email.trim() && !password) || (!email.trim() && password)
      );

      if (hasPartialCredentials) {
        setError('Enter both username/email and password for each platform you want Co-Pilot to use.');
        return;
      }

      const normalizedCredentials = Object.entries(credentials).reduce((next, [platform, value]) => {
        next[platform] = {
          email: value.email.trim(),
          password: value.password,
        };
        return next;
      }, {});

      await authService.saveCredentials(normalizedCredentials);
      setMessage('Credentials saved successfully. Co-Pilot will use them for auto-login.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Loader message="Loading platform credentials..." />;
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Co-Pilot Credentials</h1>
          <p>Save your job platform logins once. Co-Pilot will sign in automatically when possible, and you only step in for OTP, CAPTCHA, or final review.</p>
        </div>
      </div>

      {message && (
        <div className="alert-message" style={{ background: '#ecfdf5', border: '1px solid #10b981', color: '#047857', marginBottom: '1.5rem', borderRadius: '0.5rem', padding: '1rem' }}>
          {message}
        </div>
      )}

      {error && (
        <div className="alert-message" style={{ background: '#fef2f2', border: '1px solid #ef4444', color: '#b91c1c', marginBottom: '1.5rem', borderRadius: '0.5rem', padding: '1rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          {platforms.map(platform => (
            <div key={platform.id} className="section-panel" style={{ margin: 0 }}>
              <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, minWidth: '2rem', color: 'var(--text-secondary)' }}>{platform.icon}</span>
                <h2>{platform.label}</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <label className="field-label">
                  Email / Username
                  <input
                    type="text"
                    value={credentials[platform.id].email}
                    onChange={(e) => handleChange(platform.id, 'email', e.target.value)}
                    placeholder={`Your ${platform.label} email`}
                    autoComplete="username"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--border)',
                      marginTop: '0.25rem',
                      background: 'var(--background)',
                    }}
                  />
                </label>
                <label className="field-label">
                  Password
                  <div style={{ position: 'relative', marginTop: '0.25rem' }}>
                    <input
                      type={showPassword[platform.id] ? 'text' : 'password'}
                      value={credentials[platform.id].password}
                      onChange={(e) => handleChange(platform.id, 'password', e.target.value)}
                      placeholder="Password"
                      autoComplete="current-password"
                      style={{
                        width: '100%',
                        padding: '0.75rem 4rem 0.75rem 0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border)',
                        background: 'var(--background)',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility(platform.id)}
                      style={{
                        position: 'absolute',
                        right: '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        padding: 0,
                        color: 'var(--primary)',
                        fontWeight: 700,
                      }}
                    >
                      {showPassword[platform.id] ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </label>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button
            type="submit"
            className="button button-primary"
            disabled={submitting}
            style={{ padding: '0.75rem 2rem', fontSize: '1rem', borderRadius: '0.5rem' }}
          >
            {submitting ? 'Saving Credentials...' : 'Save All Credentials'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CredentialsPage;
