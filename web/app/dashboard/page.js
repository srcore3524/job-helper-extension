'use client';

import { useState, useEffect } from 'react';

function getBadgeClass(status) {
  if (!status) return 'badge';
  const s = status.toLowerCase();
  if (s === 'applied') return 'badge badge-applied';
  if (s === 'pending') return 'badge badge-pending';
  if (s === 'rejected') return 'badge badge-rejected';
  if (s === 'interview') return 'badge badge-interview';
  if (s === 'offered') return 'badge badge-offered';
  return 'badge badge-applied';
}

function getProgressColor(pct) {
  if (pct >= 80) return '#00cec9';
  if (pct >= 60) return '#6c5ce7';
  if (pct >= 40) return '#fdcb6e';
  return '#ff6b6b';
}

function truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '...' : str;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [applicantId, setApplicantId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/applicants')
      .then((r) => r.json())
      .then((data) => setApplicants(data.applicants || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (applicantId) params.set('applicant_id', applicantId);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);

    fetch(`/api/jobs?${params}`)
      .then((r) => r.json())
      .then((data) => setJobs(data.jobs || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [applicantId, dateFrom, dateTo]);

  return (
    <div>
      <div className="filters">
        <div className="form-group">
          <label>Applicant</label>
          <select value={applicantId} onChange={(e) => setApplicantId(e.target.value)}>
            <option value="">All Applicants</option>
            {applicants.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>From</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="form-group">
          <label>To</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="loading-overlay">
          <div className="spinner" />
          <span>Loading jobs...</span>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Site</th>
                  <th>Title</th>
                  <th>Summary</th>
                  <th>Skills</th>
                  <th>Match</th>
                  <th>Interview</th>
                  <th>Status</th>
                  <th>Applied</th>
                </tr>
              </thead>
              <tbody>
                {jobs.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                      No jobs found
                    </td>
                  </tr>
                ) : (
                  jobs.map((job) => (
                    <tr key={job.id}>
                      <td>
                        {job.site_url && (
                          <img
                            className="site-favicon"
                            src={`https://www.google.com/s2/favicons?domain=${new URL(job.site_url).hostname}&sz=32`}
                            alt=""
                          />
                        )}
                        {job.site || '-'}
                      </td>
                      <td>
                        {job.external_link ? (
                          <a href={job.external_link} target="_blank" rel="noopener noreferrer">
                            {job.title}
                          </a>
                        ) : (
                          job.title
                        )}
                      </td>
                      <td title={job.summary}>{truncate(job.summary, 50)}</td>
                      <td title={job.skills}>{truncate(job.skills, 40)}</td>
                      <td>
                        {job.match_percent != null && (
                          <>
                            <div className="progress-bar">
                              <div
                                className="progress-bar-fill"
                                style={{
                                  width: `${job.match_percent}%`,
                                  background: getProgressColor(job.match_percent),
                                }}
                              />
                            </div>
                            <span style={{ fontSize: 12 }}>{job.match_percent}%</span>
                          </>
                        )}
                      </td>
                      <td>{job.interview_status || '-'}</td>
                      <td>
                        <span className={getBadgeClass(job.apply_status)}>
                          {job.apply_status || 'none'}
                        </span>
                      </td>
                      <td>
                        {job.applied_at
                          ? new Date(job.applied_at).toLocaleDateString()
                          : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
