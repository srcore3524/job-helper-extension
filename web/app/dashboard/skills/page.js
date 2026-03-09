'use client';

import { useState, useEffect } from 'react';

const emptyForm = { name: '', category: '', proficiency_level: '' };

export default function SkillsPage() {
  const [applicants, setApplicants] = useState([]);
  const [applicantId, setApplicantId] = useState('');
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/applicants')
      .then((r) => r.json())
      .then((data) => setApplicants(data.applicants || []))
      .catch(() => {});
  }, []);

  async function loadSkills() {
    if (!applicantId) {
      setSkills([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/skills?applicant_id=${applicantId}`);
      const data = await res.json();
      setSkills(data.skills || []);
    } catch {
      // ignore
    }
    setLoading(false);
  }

  useEffect(() => {
    loadSkills();
  }, [applicantId]);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setShowModal(true);
  }

  function openEdit(item) {
    setEditing(item);
    setForm({
      name: item.name || '',
      category: item.category || '',
      proficiency_level: item.proficiency_level || '',
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
      const body = editing
        ? { ...form, id: editing.id }
        : { ...form, applicant_id: applicantId };
      const res = await fetch('/api/skills', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed');
      }
      setShowModal(false);
      loadSkills();
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!confirm('Delete this skill?')) return;
    await fetch('/api/skills', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    loadSkills();
  }

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <div>
      <div className="page-header">
        <h2>Skills</h2>
        {applicantId && (
          <button className="btn-primary" onClick={openAdd}>
            + Add Skill
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
      ) : skills.length > 0 ? (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Skill</th>
                  <th>Category</th>
                  <th>Proficiency</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {skills.map((s) => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td>{s.category || '-'}</td>
                    <td>{s.proficiency_level || '-'}</td>
                    <td>
                      <button className="btn-secondary btn-sm" style={{ marginRight: 6 }} onClick={() => openEdit(s)}>
                        Edit
                      </button>
                      <button className="btn-danger btn-sm" onClick={() => handleDelete(s.id)}>
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
          No skills added yet.
        </div>
      ) : null}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editing ? 'Edit Skill' : 'Add Skill'}</h2>
            {error && <div className="error-msg">{error}</div>}
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Skill Name *</label>
                <input value={form.name} onChange={(e) => setField('name', e.target.value)} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <input
                    value={form.category}
                    onChange={(e) => setField('category', e.target.value)}
                    placeholder="Frontend, Backend, DevOps..."
                  />
                </div>
                <div className="form-group">
                  <label>Proficiency Level</label>
                  <select value={form.proficiency_level} onChange={(e) => setField('proficiency_level', e.target.value)}>
                    <option value="">-- Select --</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                    <option value="Expert">Expert</option>
                  </select>
                </div>
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
