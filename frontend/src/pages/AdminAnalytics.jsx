import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import analyticsService from '../services/analyticsService';
import { toast } from 'react-toastify';

const AdminAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const res = await analyticsService.getReportData();
      setData(res.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load report analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      await analyticsService.exportCSV();
      toast.success('CSV Report downloaded successfully');
    } catch (error) {
      toast.error('Failed to export CSV report');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading Report Data...</span>
        </div>
      </div>
    );
  }

  const { summary, categoryResults, monthlyComplaints, agentPerformance } = data || {
    summary: { totalComplaints: 0, averageResolutionTimeHrs: 0, averageFeedbackRating: 0, totalFeedbacksCount: 0 },
    categoryResults: [],
    monthlyComplaints: [],
    agentPerformance: []
  };

  // SVG Line Chart coordinates calculation for Monthly trends
  const chartHeight = 200;
  const chartWidth = 500;
  const paddingX = 50;
  const paddingY = 30;

  const maxVal = monthlyComplaints.length > 0 ? Math.max(...monthlyComplaints.map((m) => m.count)) : 10;
  const scaleY = (chartHeight - paddingY * 2) / (maxVal || 1);
  const spacingX = (chartWidth - paddingX * 2) / (monthlyComplaints.length > 1 ? monthlyComplaints.length - 1 : 1);

  // Compute points
  const points = monthlyComplaints.map((item, idx) => {
    const x = paddingX + idx * spacingX;
    const y = chartHeight - paddingY - item.count * scaleY;
    return { x, y, label: item.label, count: item.count };
  });

  const pathD = points.length > 0 
    ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map((p) => `L ${p.x} ${p.y}`).join(' ')
    : '';

  // Area path fill
  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z`
    : '';

  return (
    <div className="py-4 animate-fade-in">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h1 className="h2 fw-bold text-dark mb-1">Analytics & Reporting Center</h1>
          <p className="text-muted mb-0">System performance statistics, resolution speeds, and customer metrics</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary rounded-pill px-3" onClick={fetchReportData}>
            <i className="bi bi-arrow-clockwise me-1"></i> Refresh
          </button>
          <button className="btn btn-success text-white fw-semibold rounded-pill px-4" onClick={handleExportCSV} disabled={exporting}>
            {exporting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status"></span> Exporting...
              </>
            ) : (
              <>
                <i className="bi bi-file-earmark-spreadsheet me-1"></i> Export CSV
              </>
            )}
          </button>
          <Link to="/admin/reports/print" className="btn btn-primary text-white fw-semibold rounded-pill px-4">
            <i className="bi bi-file-earmark-pdf me-1"></i> Export PDF Report
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="row g-4 mb-5">
        <div className="col-lg-3 col-sm-6">
          <div className="card border-0 shadow-sm rounded-4 bg-white p-4">
            <span className="text-muted small fw-semibold text-uppercase tracking-wider">Total System Filings</span>
            <h3 className="fw-black text-dark mb-0 mt-1" style={{ fontWeight: '800' }}>{summary.totalComplaints}</h3>
            <small className="text-muted mt-2 d-block">All category tickets logged</small>
          </div>
        </div>
        <div className="col-lg-3 col-sm-6">
          <div className="card border-0 shadow-sm rounded-4 bg-white p-4">
            <span className="text-muted small fw-semibold text-uppercase tracking-wider">Avg Resolution Speed</span>
            <h3 className="fw-black text-primary mb-0 mt-1" style={{ fontWeight: '800' }}>{summary.averageResolutionTimeHrs} hrs</h3>
            <small className="text-muted mt-2 d-block">Time from filing to completion</small>
          </div>
        </div>
        <div className="col-lg-3 col-sm-6">
          <div className="card border-0 shadow-sm rounded-4 bg-white p-4">
            <span className="text-muted small fw-semibold text-uppercase tracking-wider">Satisfaction Index</span>
            <h3 className="fw-black text-warning-emphasis mb-0 mt-1" style={{ fontWeight: '800' }}>{summary.averageFeedbackRating} / 5.0</h3>
            <small className="text-muted mt-2 d-block">Average score across ratings</small>
          </div>
        </div>
        <div className="col-lg-3 col-sm-6">
          <div className="card border-0 shadow-sm rounded-4 bg-white p-4">
            <span className="text-muted small fw-semibold text-uppercase tracking-wider">Customer Reviews</span>
            <h3 className="fw-black text-success mb-0 mt-1" style={{ fontWeight: '800' }}>{summary.totalFeedbacksCount} logs</h3>
            <small className="text-muted mt-2 d-block">Total feedback submissions</small>
          </div>
        </div>
      </div>

      {/* Charts section: Trend chart + Category shares */}
      <div className="row g-4 mb-5">
        
        {/* Trend line chart */}
        <div className="col-lg-7">
          <div className="card border-0 shadow-sm rounded-4 bg-white p-4 h-100">
            <h5 className="fw-bold mb-1 text-dark">Complaint Intake Timeline</h5>
            <p className="text-muted small mb-4">Volume filed month-over-month (past 6 months)</p>

            {monthlyComplaints.length === 0 ? (
              <div className="text-center py-5 text-muted small italic">No history logged yet.</div>
            ) : (
              <div className="d-flex flex-column h-100 justify-content-center">
                <div style={{ height: '200px', width: '100%' }}>
                  <svg width="100%" height="100%" viewBox="0 0 500 200" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0d6efd" stopOpacity="0.3"/>
                        <stop offset="100%" stopColor="#0d6efd" stopOpacity="0.0"/>
                      </linearGradient>
                    </defs>

                    {/* Grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                      const y = paddingY + pct * (chartHeight - paddingY * 2);
                      return (
                        <line
                          key={idx}
                          x1={paddingX}
                          y1={y}
                          x2={chartWidth - paddingX}
                          y2={y}
                          stroke="#f1f3f5"
                          strokeWidth="1"
                        />
                      );
                    })}

                    {/* Area fill */}
                    {areaD && <path d={areaD} fill="url(#areaGrad)" />}

                    {/* Trend Line */}
                    {pathD && <path d={pathD} fill="none" stroke="#0d6efd" strokeWidth="3" />}

                    {/* Data dots */}
                    {points.map((p, idx) => (
                      <g key={idx}>
                        <circle cx={p.x} cy={p.y} r="5" fill="#0d6efd" stroke="#fff" strokeWidth="2" />
                        <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="9.5" fontWeight="bold" fill="#212529">
                          {p.count}
                        </text>
                        <text x={p.x} y={chartHeight - 10} textAnchor="middle" fontSize="9.5" fill="#6c757d" fontWeight="600">
                          {p.label}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Category Performance analysis */}
        <div className="col-lg-5">
          <div className="card border-0 shadow-sm rounded-4 bg-white p-4 h-100">
            <h5 className="fw-bold mb-1 text-dark">Category Metrics</h5>
            <p className="text-muted small mb-4">Volume counts, resolution speeds, and average customer feedback ratings</p>
            <div className="d-flex flex-column gap-3 overflow-auto" style={{ maxHeight: '280px' }}>
              {categoryResults.map((cat) => {
                const total = summary.totalComplaints || 1;
                const percent = Math.round((cat.totalCount / total) * 100);

                let color = 'bg-primary';
                if (cat.category === 'Billing') color = 'bg-success';
                if (cat.category === 'Service') color = 'bg-warning text-dark';
                if (cat.category === 'Other') color = 'bg-secondary';

                return (
                  <div key={cat.category} className="border-bottom border-light-subtle pb-3">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <div>
                        <span className="badge rounded-pill me-2 px-2.5 py-1 text-white fw-bold small bg-primary">{cat.category}</span>
                        <small className="text-muted">{cat.totalCount} filed ({percent}%)</small>
                      </div>
                      <div className="text-end">
                        <strong className="d-block small text-dark"><i className="bi bi-clock me-1"></i>{cat.avgResolutionTimeHrs} hrs</strong>
                      </div>
                    </div>
                    <div className="d-flex justify-content-between align-items-center mt-2 small text-muted">
                      <span>Completion: <strong>{cat.resolvedCount} / {cat.totalCount}</strong></span>
                      <span className="d-flex align-items-center">
                        Rating: <strong className="text-dark ms-1">{cat.avgRating > 0 ? cat.avgRating : 'N/A'}</strong>
                        {cat.avgRating > 0 && <i className="bi bi-star-fill text-warning ms-1" style={{ fontSize: '10px' }}></i>}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* Agent Performance table */}
      <div className="card border-0 shadow-sm rounded-4 bg-white p-4 mb-4">
        <h5 className="fw-bold mb-1 text-dark">Support Staff Efficiency Summary</h5>
        <p className="text-muted small mb-4">Detailed metrics mapping agent workload volumes, completions, and customer feedback</p>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th>Agent Profile</th>
                <th className="text-center">Total Assigned</th>
                <th className="text-center">Total Resolved</th>
                <th className="text-center">Completion Rate</th>
                <th>Satisfaction Rating</th>
              </tr>
            </thead>
            <tbody>
              {agentPerformance.map((agent) => {
                const percent = agent.totalAssigned > 0 ? Math.round((agent.resolvedCount / agent.totalAssigned) * 100) : 0;
                return (
                  <tr key={agent._id}>
                    <td>
                      <span className="fw-bold text-dark d-block">{agent.name}</span>
                      <small className="text-muted">{agent.email}</small>
                    </td>
                    <td className="text-center fw-bold">{agent.totalAssigned}</td>
                    <td className="text-center">{agent.resolvedCount}</td>
                    <td className="text-center">
                      <div className="d-flex align-items-center justify-content-center gap-2">
                        <div className="progress flex-grow-1" style={{ height: '6px', maxWidth: '80px' }}>
                          <div className="progress-bar bg-success rounded-pill" style={{ width: `${percent}%` }}></div>
                        </div>
                        <span className="small text-dark fw-bold">{percent}%</span>
                      </div>
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-1">
                        <strong className="text-dark me-1">{agent.averageRating > 0 ? agent.averageRating : 'N/A'}</strong>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <i
                            key={star}
                            className={`bi bi-star-fill ${star <= Math.round(agent.averageRating) ? 'text-warning' : 'text-muted-subtle opacity-25'} fs-8`}
                          ></i>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
};

export default AdminAnalytics;
