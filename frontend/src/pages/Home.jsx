import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="row align-items-center justify-content-center py-5">
      <div className="col-lg-6 mb-5 mb-lg-0 text-center text-lg-start">
        <h1 className="display-4 fw-bold text-dark mb-3">
          Resolve Issues <span className="text-primary">Effortlessly</span> & Fast
        </h1>
        <p className="lead text-muted mb-4">
          A state-of-the-art Complaint Management System designed to bridge the gap between users, agents, and administration. Express your concerns, track status, and chat in real-time.
        </p>
        <div className="d-flex flex-column flex-sm-row gap-3 justify-content-center justify-content-lg-start">
          <Link to="/register" className="btn btn-primary btn-lg px-4 shadow">
            Get Started <i className="bi bi-arrow-right-short ms-1"></i>
          </Link>
          <Link to="/login" className="btn btn-outline-secondary btn-lg px-4">
            Track Existing Complaint
          </Link>
        </div>
      </div>
      <div className="col-lg-5 offset-lg-1 text-center">
        <div className="card border-0 shadow-lg p-4 bg-white rounded-4 position-relative">
          <div className="position-absolute top-0 start-0 translate-middle bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: '50px', height: '50px' }}>
            <i className="bi bi-clock-history fs-4"></i>
          </div>
          <div className="card-body">
            <h5 className="card-title fw-bold mt-3 mb-3">System Features</h5>
            <ul className="list-group list-group-flush text-start">
              <li className="list-group-item d-flex align-items-center border-0 px-0">
                <i className="bi bi-patch-check-fill text-success fs-5 me-3"></i>
                <div>
                  <span className="fw-semibold d-block">Complaint Submission</span>
                  <small className="text-muted">Submit complaints with relevant categorization and files.</small>
                </div>
              </li>
              <li className="list-group-item d-flex align-items-center border-0 px-0">
                <i className="bi bi-lightning-charge-fill text-warning fs-5 me-3"></i>
                <div>
                  <span className="fw-semibold d-block">Real-time Chat & Updates</span>
                  <small className="text-muted">Chat directly with the assigned agent resolving your issue.</small>
                </div>
              </li>
              <li className="list-group-item d-flex align-items-center border-0 px-0">
                <i className="bi bi-bar-chart-line-fill text-info fs-5 me-3"></i>
                <div>
                  <span className="fw-semibold d-block">Admin & Agent Dashboards</span>
                  <small className="text-muted">Unified command centers to assign, monitor, and resolve issues.</small>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
