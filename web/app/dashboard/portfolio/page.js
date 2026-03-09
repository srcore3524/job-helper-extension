'use client';

import { useState, useEffect } from 'react';

const emptyForm = { project_name: '', description: '', tech_stack: '', url: '' };

export default function PortfolioPage() {
  const [applicants, setApplicants] = useState([]);
  const [applicantId, setApplicantId] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [addMode, setAddMode] = useState('manual'); // 'manual' or 'fetch'
  const [fetchUrl, setFetchUrl] = useState('');
  const [fetching, setFetching] = useState(false);
  const [fetchedProjects, setFetchedProjects] = useState([]);

  useEffect(() => {
    fetch('/api/applicants')
      .then((r) => r.json())
      .then((data) => setApplicants(data.applicants || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!applicantId) {
      setItems([]);
      return;
    }
    setLoading(true);
    fetch(`/api/portfolio?applicant_id=${applicantId}`)
      .then((r) => r.json())
      .then((data) => setItems(data.portfolios || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [applicantId]);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setFetchUrl('');
    setFetchedProjects([]);
    setAddMode('manual');
    setError('');
    setShowModal(true);
  }

  function openEdit(item) {
    setEditing(item);
    setAddMode('manual');
    setForm({
      project_name: item.project_name || '',
      description: item.description || '',
      tech_stack: item.tech_stack || '',
      url: item.url || '',
    });
    setError('');
    setShowModal(true);
  }

  async function handleFetchUrl() {
    if (!fetchUrl.trim()) return;
    setFetching(true);
    setError('');
    setFetchedProjects([]);
    try {
      const res = await fetch('/api/portfolio/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: fetchUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fetch failed');
      const projects = (data.projects || []).filter(p => p.project_name);
      if (projects.length === 0) throw new Error('No projects found on this page');
      setFetchedProjects(projects);
    } catch (err) {
      setError(err.message);
    }
    setFetching(false);
  }

  async function handleSaveFetched(replace) {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicant_id: applicantId, projects: fetchedProjects, replace }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save projects');
      }
      setShowModal(false);
      const r2 = await fetch(`/api/portfolio?applicant_id=${applicantId}`);
      const d2 = await r2.json();
      setItems(d2.portfolios || []);
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const method = editing ? 'PUT' : 'POST';
      const body = editing
        ? { ...form, id: editing.id }
        : { ...form, applicant_id: applicantId };
      const res = await fetch('/api/portfolio', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed');
      }
      setShowModal(false);
      const r2 = await fetch(`/api/portfolio?applicant_id=${applicantId}`);
      const d2 = await r2.json();
      setItems(d2.portfolios || []);
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!confirm('Delete this portfolio item?')) return;
    await fetch('/api/portfolio', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const r2 = await fetch(`/api/portfolio?applicant_id=${applicantId}`);
    const d2 = await r2.json();
    setItems(d2.portfolios || []);
  }

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <div>
      <div className="page-header">
        <h2>Portfolio</h2>
        {applicantId && (
          <button className="btn-primary" onClick={openAdd}>
            + Add Project
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

      {loading ? (
        <div className="loading-overlay">
          <div className="spinner" />
          <span>Loading...</span>
        </div>
      ) : items.length > 0 ? (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Description</th>
                  <th>Tech Stack</th>
                  <th>URL</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.project_name}</td>
                    <td title={item.description}>
                      {item.description?.length > 60
                        ? item.description.slice(0, 60) + '...'
                        : item.description}
                    </td>
                    <td>{item.tech_stack || '-'}</td>
                    <td>
                      {item.url ? (
                        <a href={item.url} target="_blank" rel="noopener noreferrer">
                          Link
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>
                      <button className="btn-secondary btn-sm" style={{ marginRight: 6 }} onClick={() => openEdit(item)}>
                        Edit
                      </button>
                      <button className="btn-danger btn-sm" onClick={() => handleDelete(item.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : applicantId ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
          No portfolio items yet.
        </div>
      ) : null}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editing ? 'Edit Project' : 'Add Project'}</h2>

            {!editing && (
              <div className="tabs" style={{ marginBottom: 16 }}>
                <button
                  className={`tab ${addMode === 'fetch' ? 'active' : ''}`}
                  onClick={() => setAddMode('fetch')}
                >
                  Fetch from URL
                </button>
                <button
                  className={`tab ${addMode === 'manual' ? 'active' : ''}`}
                  onClick={() => setAddMode('manual')}
                >
                  Manual Entry
                </button>
              </div>
            )}

            {error && <div className="error-msg">{error}</div>}

            {addMode === 'fetch' && !editing && (
              <div style={{ marginBottom: 20 }}>
                <div className="form-group">
                  <label>Portfolio URL (paste your portfolio site link)</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      value={fetchUrl}
                      onChange={(e) => setFetchUrl(e.target.value)}
                      placeholder="https://your-portfolio.com"
                      style={{ flex: 1 }}
                    />
                    <button
                      className="btn-primary"
                      onClick={handleFetchUrl}
                      disabled={fetching || !fetchUrl.trim()}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      {fetching ? 'Fetching...' : 'Fetch'}
                    </button>
                  </div>
                </div>
                {fetching && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 13 }}>
                    <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                    Analyzing portfolio for projects...
                  </div>
                )}
                {fetchedProjects.length > 0 && (
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                      Found {fetchedProjects.length} project{fetchedProjects.length > 1 ? 's' : ''}:
                    </div>
                    <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {fetchedProjects.map((p, i) => (
                        <div key={i} style={{ background: 'var(--bg-secondary, #1a1a2e)', borderRadius: 8, padding: '10px 14px' }}>
                          <div style={{ fontWeight: 600, marginBottom: 4 }}>{p.project_name}</div>
                          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>{p.description}</div>
                          {p.tech_stack && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.tech_stack}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {(addMode === 'manual' || editing) && (
              <form onSubmit={handleSave}>
                <div className="form-group">
                  <label>Project Name *</label>
                  <input value={form.project_name} onChange={(e) => setField('project_name', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Description *</label>
                  <textarea value={form.description} onChange={(e) => setField('description', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Tech Stack</label>
                  <input
                    value={form.tech_stack}
                    onChange={(e) => setField('tech_stack', e.target.value)}
                    placeholder="React, Node.js, PostgreSQL..."
                  />
                </div>
                <div className="form-group">
                  <label>URL</label>
                  <input value={form.url} onChange={(e) => setField('url', e.target.value)} placeholder="https://..." />
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
            )}

            {addMode === 'fetch' && !editing && (
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                {fetchedProjects.length > 0 && (
                  <>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => handleSaveFetched(false)}
                      disabled={saving}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      {saving ? 'Saving...' : `Add New (${fetchedProjects.length})`}
                    </button>
                    <button
                      type="button"
                      className="btn-danger"
                      onClick={() => handleSaveFetched(true)}
                      disabled={saving}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      {saving ? 'Saving...' : 'Replace All'}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
