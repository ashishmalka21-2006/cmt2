import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import analyticsService from '../services/analyticsService';
import { toast } from 'react-toastify';

const PrintReport = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        const res = await analyticsService.getReportData();
        setData(res.data);
        setLoading(false);
      } catch (error) {
        toast.error('Failed to load report data');
        navigate('/admin/analytics');
      }
    };

    fetchReportData();
  }, [navigate]);

  // Trigger print dialog once rendering completes
  useEffect(() => {
    if (!loading && data) {
      const timer = setTimeout(() => {
        window.print();
      }, 800); // Small delay to ensure rendering completes
      return () => clearTimeout(timer);
    }
  }, [loading, data]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Compiling Printable Report...</span>
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

  return (
    <div className="container py-5 bg-white text-dark" id="print-sheet" style={{ maxWidth: '800px', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Action panel (hidden during printing) */}
      <div className="d-print-none bg-light p-4 rounded-4 mb-5 d-flex justify-content-between align-items-center">
        <div>
          <h6 className="fw-bold text-dark mb-0">System Report Ready</h6>
          <p className="text-muted small mb-0">PDF print dialog should open automatically. Use the controls if blocked.</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary btn-sm rounded-pill px-3" onClick={() => navigate('/admin/analytics')}>
            <i className="bi bi-arrow-left me-1"></i> Back to Analytics
          </button>
          <button className="btn btn-primary btn-sm rounded-pill px-3 text-white" onClick={() => window.print()}>
            <i className="bi bi-printer me-1"></i> Print / Save PDF
          </button>
        </div>
      </div>

      {/* Printable Sheet Content */}
      <div className="border border-dark p-5 rounded-3">
        {/* Report Header */}
        <div className="d-flex justify-content-between align-items-center border-bottom border-2 pb-4 mb-4">
          <div>
            <h2 className="fw-bold text-dark mb-1">ResolveHub</h2>
            <h5 className="text-muted mb-0">Systems Performance & Resolutions Report</h5>
          </div>
          <div className="text-end">
            <span className="badge bg-dark px-3 py-1.5 fs-7 mb-1 text-white">CONFIDENTIAL</span>
            <small className="text-muted d-block small">Generated: {new Date().toLocaleDateString()}</small>
          </div>
        </div>

        {/* 1. Summary Metrics Deck */}
        <h5 className="fw-bold border-bottom pb-2 mb-3">1. Executive Summary Indicators</h5>
        <div className="row g-4 mb-5 text-center">
          <div className="col-3">
            <div className="border rounded p-3">
              <span className="text-muted small fw-semibold text-uppercase d-block" style={{ fontSize: '10px' }}>Total filings</span>
              <h4 className="fw-bold mt-1 mb-0">{summary.totalComplaints}</h4>
            </div>
          </div>
          <div className="col-3">
            <div className="border rounded p-3">
              <span className="text-muted small fw-semibold text-uppercase d-block" style={{ fontSize: '10px' }}>Resolution Avg</span>
              <h4 className="fw-bold mt-1 mb-0">{summary.averageResolutionTimeHrs} hrs</h4>
            </div>
          </div>
          <div className="col-3">
            <div className="border rounded p-3">
              <span className="text-muted small fw-semibold text-uppercase d-block" style={{ fontSize: '10px' }}>Client Satisfaction</span>
              <h4 className="fw-bold mt-1 mb-0">{summary.averageFeedbackRating} / 5</h4>
            </div>
          </div>
          <div className="col-3">
            <div className="border rounded p-3">
              <span className="text-muted small fw-semibold text-uppercase d-block" style={{ fontSize: '10px' }}>Feedback Logs</span>
              <h4 className="fw-bold mt-1 mb-0">{summary.totalFeedbacksCount}</h4>
            </div>
          </div>
        </div>

        {/* 2. Category Performance */}
        <h5 className="fw-bold border-bottom pb-2 mb-3">2. Category Performance Summary</h5>
        <table className="table table-bordered align-middle mb-5 small">
          <thead className="table-light">
            <tr>
              <th>Category</th>
              <th className="text-center">Total Filed</th>
              <th className="text-center">Resolved</th>
              <th className="text-center">Avg Resolution Speed</th>
              <th className="text-center">Satisfaction Index</th>
            </tr>
          </thead>
          <tbody>
            {categoryResults.map((cat) => (
              <tr key={cat.category}>
                <td className="fw-semibold">{cat.category}</td>
                <td className="text-center">{cat.totalCount}</td>
                <td className="text-center">{cat.resolvedCount}</td>
                <td className="text-center">{cat.avgResolutionTimeHrs} hrs</td>
                <td className="text-center fw-bold">{cat.avgRating > 0 ? `${cat.avgRating} / 5.0` : 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 3. Monthly complaint Intake */}
        <h5 className="fw-bold border-bottom pb-2 mb-3">3. Monthly Complaint intake trends</h5>
        <table className="table table-bordered align-middle mb-5 small" style={{ maxWidth: '400px' }}>
          <thead className="table-light">
            <tr>
              <th>Timeline Month</th>
              <th className="text-center">Filings Count</th>
            </tr>
          </thead>
          <tbody>
            {monthlyComplaints.map((item, idx) => (
              <tr key={idx}>
                <td>{item.label}</td>
                <td className="text-center fw-bold">{item.count}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 4. Agent Performance Table */}
        <h5 className="fw-bold border-bottom pb-2 mb-3">4. Support Agent Workload & Ratings Matrix</h5>
        <table className="table table-bordered align-middle mb-4 small">
          <thead className="table-light">
            <tr>
              <th>Agent Profile</th>
              <th className="text-center">Assigned Count</th>
              <th className="text-center">Resolved Count</th>
              <th className="text-center">Completion Ratio</th>
              <th>Satisfaction Rating</th>
            </tr>
          </thead>
          <tbody>
            {agentPerformance.map((agent) => {
              const pct = agent.totalAssigned > 0 ? Math.round((agent.resolvedCount / agent.totalAssigned) * 100) : 0;
              return (
                <tr key={agent._id}>
                  <td>
                    <span className="fw-semibold d-block">{agent.name}</span>
                    <small className="text-muted">{agent.email}</small>
                  </td>
                  <td className="text-center">{agent.totalAssigned}</td>
                  <td className="text-center">{agent.resolvedCount}</td>
                  <td className="text-center fw-semibold">{pct}%</td>
                  <td className="fw-bold">{agent.averageRating > 0 ? `${agent.averageRating} / 5.0` : 'N/A'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Report Footer */}
        <div className="text-center pt-4 border-top text-muted small mt-5" style={{ fontSize: '10px' }}>
          <p className="mb-0">ResolveHub Helpdesk Operations Division. All Rights Reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default PrintReport;
