'use client';

import { useState, useEffect } from 'react';

export default function TrainingPage() {
  const [applicants, setApplicants] = useState([]);
  const [applicantId, setApplicantId] = useState('');
  const [activeTab, setActiveTab] = useState('job');
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/applicants')
      .then((r) => r.json())
      .then((data) => setApplicants(data.applicants || []))
      .catch(() => {});
  }, []);

  async function loadMaterials() {
    if (!applicantId) {
      setMaterials([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/training?applicant_id=${applicantId}&type=${activeTab}`);
      const data = await res.json();
      setMaterials(data.materials || []);
    } catch {
      // ignore
    }
    setLoading(false);
  }

  useEffect(() => {
    loadMaterials();
  }, [applicantId, activeTab]);

  function openAdd() {
    setEditing(null);
    setContent('');
    setError('');
    setShowModal(true);
  }

  function openEdit(item) {
    setEditing(item);
    setContent(item.content || '');
    setError('');
    setShowModal(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const method = editing ? 'PUT' : 'POST';
      const body = editing
        ? { id: editing.id, content }
        : { applicant_id: applicantId, type: activeTab, content };
      const res = await fetch('/api/training', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed');
      }
      setShowModal(false);
      loadMaterials();
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!confirm('Delete this training material?')) return;
    await fetch('/api/training', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    loadMaterials();
  }

  return (
    <div>
      <div className="page-header">
        <h2>Training Materials</h2>
        {applicantId && (
          <button className="btn-primary" onClick={openAdd}>
            + Add Material
          </button>
        )}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="form-group">
          <label>Select Applicant</label>
          <select value={applicantId} onChange={(e) => setApplicantId(e.target.value)} style={{ maxWidth: 300 }}>
            <option value="">-- Select --</option>
            {applicants.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {applicantId && (
        <div className="tabs">
          <button className={`tab ${activeTab === 'job' ? 'active' : ''}`} onClick={() => setActiveTab('job')}>
            Job Training
          </button>
          <button className={`tab ${activeTab === 'upwork' ? 'active' : ''}`} onClick={() => setActiveTab('upwork')}>
            Upwork Training
          </button>
        </div>
      )}

      {loading ? (
        <div className="loading-overlay">
          <div className="spinner" />
          <span>Loading...</span>
        </div>
      ) : materials.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {materials.map((m) => (
            <div key={m.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                  {new Date(m.created_at).toLocaleString()}
                </span>
                <div>
                  <button className="btn-secondary btn-sm" style={{ marginRight: 6 }} onClick={() => openEdit(m)}>
                    Edit
                  </button>
                  <button className="btn-danger btn-sm" onClick={() => handleDelete(m.id)}>
                    Delete
                  </button>
                </div>
              </div>
              <pre
                style={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  background: 'var(--bg-tertiary)',
                  padding: 14,
                  borderRadius: 'var(--radius)',
                  fontSize: 13,
                  lineHeight: 1.6,
                  maxHeight: 200,
                  overflow: 'auto',
                }}
              >
                {m.content}
              </pre>
            </div>
          ))}
        </div>
      ) : applicantId ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
          No {activeTab} training materials yet.
        </div>
      ) : null}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editing ? 'Edit Material' : 'Add Material'}</h2>
            {error && <div className="error-msg">{error}</div>}
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Content *</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  required
                  style={{ minHeight: 200 }}
                  placeholder="Paste training material content here..."
                />
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
