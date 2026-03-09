'use client';

import { useState, useEffect } from 'react';

export default function ResumePage() {
  const [applicants, setApplicants] = useState([]);
  const [applicantId, setApplicantId] = useState('');
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetch('/api/applicants')
      .then((r) => r.json())
      .then((data) => setApplicants(data.applicants || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!applicantId) {
      setResume(null);
      return;
    }
    setLoading(true);
    fetch(`/api/resume?applicant_id=${applicantId}`)
      .then((r) => r.json())
      .then((data) => setResume(data.resume || null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [applicantId]);

  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!applicantId) {
      setError('Select an applicant first');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('applicant_id', applicantId);

      const res = await fetch('/api/resume', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      setResume(data.resume);
      const skillCount = data.skills_extracted || 0;
      setSuccess(
        `Resume uploaded and parsed successfully.${skillCount > 0 ? ` ${skillCount} skills auto-extracted — check the Skills page.` : ''}`
      );
    } catch (err) {
      setError(err.message);
    }

    setUploading(false);
    e.target.value = '';
  }

  return (
    <div>
      <div className="page-header">
        <h2>Resume</h2>
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

        {applicantId && (
          <div style={{ marginTop: 16 }}>
            <label
              className="btn-primary"
              style={{
                display: 'inline-block',
                cursor: uploading ? 'not-allowed' : 'pointer',
                opacity: uploading ? 0.5 : 1,
              }}
            >
              {uploading ? 'Parsing & extracting skills...' : 'Upload PDF'}
              <input type="file" accept=".pdf" onChange={handleUpload} style={{ display: 'none' }} disabled={uploading} />
            </label>
          </div>
        )}
      </div>

      {error && <div className="error-msg">{error}</div>}
      {success && <div className="success-msg">{success}</div>}

      {loading ? (
        <div className="loading-overlay">
          <div className="spinner" />
          <span>Loading resume...</span>
        </div>
      ) : resume ? (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <strong>Parsed Resume Content</strong>
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
              Uploaded: {new Date(resume.uploaded_at).toLocaleString()}
            </span>
          </div>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              background: 'var(--bg-tertiary)',
              padding: 16,
              borderRadius: 'var(--radius)',
              maxHeight: 500,
              overflow: 'auto',
              fontSize: 13,
              lineHeight: 1.7,
            }}
          >
            {resume.content}
          </pre>
        </div>
      ) : applicantId ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
          No resume uploaded yet. Upload a PDF to get started.
        </div>
      ) : null}
    </div>
  );
}
