import React from 'react';
import { Link } from 'react-router-dom';

const Unauthorized = () => {
  return (
    <div className="row justify-content-center align-items-center py-5 text-center">
      <div className="col-md-6">
        <div className="bg-danger-subtle text-danger rounded-circle d-inline-flex align-items-center justify-content-center mb-4 animate-bounce" style={{ width: '80px', height: '80px' }}>
          <i className="bi bi-shield-slash-fill fs-1"></i>
        </div>
        <h1 className="display-5 fw-bold text-dark mb-2">Access Denied</h1>
        <h4 className="text-muted fw-semibold mb-4">You do not have permission to view this resource.</h4>
        <p className="text-muted mb-5">
          This area is restricted to authorized credentials. Please check your active role permissions or contact system administrators if you believe this is an error.
        </p>
        <div className="d-flex justify-content-center gap-3">
          <Link to="/dashboard" className="btn btn-primary px-4 shadow">
            Go to Dashboard
          </Link>
          <Link to="/" className="btn btn-outline-secondary px-4">
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
