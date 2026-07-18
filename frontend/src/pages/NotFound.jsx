import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="row justify-content-center align-items-center py-5 text-center">
      <div className="col-md-6">
        <h1 className="display-1 fw-bold text-primary">404</h1>
        <h2 className="fw-bold mb-3">Page Not Found</h2>
        <p className="text-muted mb-4">
          Oops! The page you are looking for does not exist or has been moved.
        </p>
        <Link to="/" className="btn btn-primary btn-lg px-4">
          Go Back Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
