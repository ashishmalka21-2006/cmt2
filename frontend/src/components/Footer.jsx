import React from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-dark text-light py-4 mt-auto border-top border-secondary">
      <div className="container">
        <div className="row align-items-center">
          <div className="col-md-6 text-center text-md-start mb-2 mb-md-0">
            <div className="d-flex align-items-center justify-content-center justify-content-md-start">
              <i className="bi bi-shield-fill-exclamation text-primary fs-4 me-2"></i>
              <span className="fw-semibold">ResolveHub Complaint Management System</span>
            </div>
            <p className="text-muted small mb-0 mt-1">
              &copy; {currentYear} ResolveHub. All rights reserved. Built for production-ready efficiency.
            </p>
          </div>
          <div className="col-md-6 text-center text-md-end">
            <a href="#" className="text-muted text-decoration-none me-3 hover-light small">Privacy Policy</a>
            <a href="#" className="text-muted text-decoration-none me-3 hover-light small">Terms of Service</a>
            <a href="#" className="text-muted text-decoration-none hover-light small">Support</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
