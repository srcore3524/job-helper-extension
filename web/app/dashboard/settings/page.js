'use client';

import { useState } from 'react';

export default function SettingsPage() {
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const body = {};
      if (email) body.email = email;
      if (newPassword) {
        body.current_password = currentPassword;
        body.new_password = newPassword;
      }

      if (!body.email && !body.new_password) {
        throw new Error('Nothing to update');
      }

      const res = await fetch('/api/auth/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');

      setSuccess('Settings updated successfully');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  return (
    <div>
      <div className="page-header">
        <h2>Settings</h2>
      </div>

      <div className="card" style={{ maxWidth: 500 }}>
        {error && <div className="error-msg">{error}</div>}
        {success && <div className="success-msg">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>New Email (leave blank to keep current)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="new@email.com"
            />
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '20px 0' }} />

          <div className="form-group">
            <label>Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Required to change password"
            />
          </div>
          <div className="form-group">
            <label>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 6 characters"
              minLength={6}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? 'Updating...' : 'Update Settings'}
          </button>
        </form>
      </div>
    </div>
  );
}
