'use client';

import { useState, useEffect, useMemo } from 'react';

const PER_PAGE = 20;

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
  const [selected, setSelected] = useState(new Set());
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState('');
  const [detailJob, setDetailJob] = useState(null);
  const [sortBy, setSortBy] = useState('applied_at');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetch('/api/applicants')
      .then((r) => r.json())
      .then((data) => setApplicants(data.applicants || []))
      .catch(() => {});
  }, []);

  function loadJobs() {
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
    setSelected(new Set());
    setPage(1);
  }

  useEffect(() => {
    loadJobs();
  }, [applicantId, dateFrom, dateTo]);

  // Filter by search
  const filtered = useMemo(() => {
    if (!search.trim()) return jobs;
    const q = search.toLowerCase();
    return jobs.filter(
      (j) =>
        (j.title || '').toLowerCase().includes(q) ||
        (j.site || '').toLowerCase().includes(q)
    );
  }, [jobs, search]);

  // Sort
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let valA, valB;
      switch (sortBy) {
        case 'site':
          valA = (a.site || '').toLowerCase();
          valB = (b.site || '').toLowerCase();
          return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case 'match_percent':
          valA = a.match_percent ?? -1;
          valB = b.match_percent ?? -1;
          return sortDir === 'asc' ? valA - valB : valB - valA;
        case 'apply_status':
          valA = (a.apply_status || '').toLowerCase();
          valB = (b.apply_status || '').toLowerCase();
          return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case 'applied_at':
        default:
          valA = a.applied_at ? new Date(a.applied_at).getTime() : 0;
          valB = b.applied_at ? new Date(b.applied_at).getTime() : 0;
          return sortDir === 'asc' ? valA - valB : valB - valA;
      }
    });
    return arr;
  }, [filtered, sortBy, sortDir]);

  // Paginate
  const totalPages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  const paged = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Reset page when search/sort changes
  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [search, sortBy, sortDir]);

  function handleSort(col) {
    if (sortBy === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortDir(col === 'site' || col === 'apply_status' ? 'asc' : 'desc');
    }
  }

  function sortIcon(col) {
    if (sortBy !== col) return ' ↕';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  }

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    const pageIds = paged.map((j) => j.id);
    const allSelected = pageIds.every((id) => selected.has(id));
    if (allSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        pageIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        pageIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }

  async function handleDeleteSelected() {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} job(s)?`)) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/jobs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      if (!res.ok) throw new Error('Failed to delete');
      setJobs((prev) => prev.filter((j) => !selected.has(j.id)));
      setSelected(new Set());
    } catch {
      alert('Failed to delete jobs');
    }
    setDeleting(false);
  }

  const pageIds = paged.map((j) => j.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));

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
          <label>Search</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or site..."
          />
        </div>
        <div className="form-group">
          <label>From</label>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="form-group">
          <label>To</label>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <button
          className="btn-icon"
          onClick={loadJobs}
          disabled={loading}
          title="Refresh"
          style={{ alignSelf: 'flex-end', marginBottom: 2 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={loading ? 'spin' : ''}>
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </button>
      </div>

      {loading ? (
        <div className="loading-overlay">
          <div className="spinner" />
          <span>Loading jobs...</span>
        </div>
      ) : (
        <>
          {selected.size > 0 && (
            <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {selected.size} selected
              </span>
              <button
                className="btn-danger btn-sm"
                onClick={handleDeleteSelected}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete Selected'}
              </button>
            </div>
          )}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>
                      <input
                        type="checkbox"
                        checked={allPageSelected}
                        onChange={toggleAll}
                      />
                    </th>
                    <th className="sortable-th" onClick={() => handleSort('site')}>
                      Site{sortIcon('site')}
                    </th>
                    <th>Title</th>
                    <th>Summary</th>
                    <th>Skills</th>
                    <th className="sortable-th" onClick={() => handleSort('match_percent')}>
                      Match{sortIcon('match_percent')}
                    </th>
                    <th>Interview</th>
                    <th className="sortable-th" onClick={() => handleSort('apply_status')}>
                      Status{sortIcon('apply_status')}
                    </th>
                    <th className="sortable-th" onClick={() => handleSort('applied_at')}>
                      Applied{sortIcon('applied_at')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paged.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                        No jobs found
                      </td>
                    </tr>
                  ) : (
                    paged.map((job) => (
                      <tr
                        key={job.id}
                        className="clickable-row"
                        style={selected.has(job.id) ? { background: 'rgba(108, 99, 255, 0.08)' } : {}}
                        onClick={() => setDetailJob(job)}
                      >
                        <td onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selected.has(job.id)}
                            onChange={() => toggleSelect(job.id)}
                          />
                        </td>
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

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn-secondary btn-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Prev
              </button>
              <span className="pagination-info">
                Page {page} of {totalPages} ({sorted.length} jobs)
              </span>
              <button
                className="btn-secondary btn-sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {detailJob && (
        <div className="modal-overlay" onClick={() => setDetailJob(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <h2 style={{ margin: 0 }}>{detailJob.title}</h2>
                {detailJob.company && (
                  <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: 14 }}>{detailJob.company}</p>
                )}
              </div>
              <span className={getBadgeClass(detailJob.apply_status)} style={{ flexShrink: 0 }}>
                {detailJob.apply_status || 'none'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16, fontSize: 13 }}>
              {detailJob.site && (
                <div><strong>Site:</strong> {detailJob.site}</div>
              )}
              {detailJob.location && (
                <div><strong>Location:</strong> {detailJob.location}</div>
              )}
              {detailJob.remote_type && (
                <div><strong>Type:</strong> {detailJob.remote_type}</div>
              )}
              {detailJob.match_percent != null && (
                <div><strong>Match:</strong> {detailJob.match_percent}%</div>
              )}
              {detailJob.applied_at && (
                <div><strong>Applied:</strong> {new Date(detailJob.applied_at).toLocaleDateString()}</div>
              )}
            </div>

            {detailJob.summary && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Summary</div>
                <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0 }}>{detailJob.summary}</p>
              </div>
            )}

            {detailJob.skills && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Skills</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {detailJob.skills.split(',').map((s, i) => (
                    <span key={i} style={{
                      padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                      background: 'var(--accent-light, rgba(108,99,255,0.1))', color: 'var(--accent, #6c63ff)',
                    }}>
                      {s.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {detailJob.description && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Description</div>
                <pre style={{
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 13, lineHeight: 1.6,
                  background: 'var(--bg-tertiary)', padding: 14, borderRadius: 'var(--radius)',
                  maxHeight: 200, overflow: 'auto', margin: 0,
                }}>
                  {detailJob.description}
                </pre>
              </div>
            )}

            <div className="modal-actions">
              {detailJob.external_link && (
                <a
                  href={detailJob.external_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                  style={{ textDecoration: 'none', textAlign: 'center' }}
                >
                  View Job Post
                </a>
              )}
              <button className="btn-secondary" onClick={() => setDetailJob(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
