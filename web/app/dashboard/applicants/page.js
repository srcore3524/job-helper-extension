'use client';

import { useState, useEffect } from 'react';

const emptyForm = {
  name: '',
  title: '',
  email: '',
  phone: '',
  location: '',
  linkedin_url: '',
  github_url: '',
  website_url: '',
};

export default function ApplicantsPage() {
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function loadApplicants() {
    setLoading(true);
    try {
      const res = await fetch('/api/applicants');
      const data = await res.json();
      setApplicants(data.applicants || []);
    } catch {
      // ignore
    }
    setLoading(false);
  }

  useEffect(() => {
    loadApplicants();
  }, []);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setShowModal(true);
  }

  function openEdit(a) {
    setEditing(a);
    setForm({
      name: a.name || '',
      title: a.title || '',
      email: a.email || '',
      phone: a.phone || '',
      location: a.location || '',
      linkedin_url: a.linkedin_url || '',
      github_url: a.github_url || '',
      website_url: a.website_url || '',
    });
    setError('');
    setShowModal(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const method = editing ? 'PUT' : 'POST';
      const body = editing ? { ...form, id: editing.id } : form;
      const res = await fetch('/api/applicants', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }
      setShowModal(false);
      loadApplicants();
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!confirm('Delete this applicant?')) return;
    await fetch('/api/applicants', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    loadApplicants();
  }

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2>Applicants</h2>
        <button className="btn-primary" onClick={openAdd}>
          + Add Applicant
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Title</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Location</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {applicants.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    No applicants yet
                  </td>
                </tr>
              ) : (
                applicants.map((a) => (
                  <tr key={a.id}>
                    <td>{a.name}</td>
                    <td>{a.title || '-'}</td>
                    <td>{a.email || '-'}</td>
                    <td>{a.phone || '-'}</td>
                    <td>{a.location || '-'}</td>
                    <td>
                      <button className="btn-secondary btn-sm" style={{ marginRight: 6 }} onClick={() => openEdit(a)}>
                        Edit
                      </button>
                      <button className="btn-danger btn-sm" onClick={() => handleDelete(a.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editing ? 'Edit Applicant' : 'Add Applicant'}</h2>
            {error && <div className="error-msg">{error}</div>}
            <form onSubmit={handleSave}>
              <div className="form-row">
                <div className="form-group">
                  <label>Name *</label>
                  <input value={form.name} onChange={(e) => setField('name', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Title</label>
                  <input value={form.title} onChange={(e) => setField('title', e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label>Location</label>
                <input value={form.location} onChange={(e) => setField('location', e.target.value)} />
              </div>
              <div className="form-group">
                <label>LinkedIn URL</label>
                <input value={form.linkedin_url} onChange={(e) => setField('linkedin_url', e.target.value)} />
              </div>
              <div className="form-group">
                <label>GitHub URL</label>
                <input value={form.github_url} onChange={(e) => setField('github_url', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Website URL</label>
                <input value={form.website_url} onChange={(e) => setField('website_url', e.target.value)} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
