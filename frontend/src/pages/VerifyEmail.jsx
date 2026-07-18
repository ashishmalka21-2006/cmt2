import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import authService from '../services/authService';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const triggerVerification = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Missing verification token in URL.');
        return;
      }

      try {
        const response = await authService.verifyEmail(token);
        setStatus('success');
        setMessage(response.message || 'Email verified successfully!');
      } catch (error) {
        setStatus('error');
        setMessage(
          error.response?.data?.message ||
            'Verification failed. The token may have expired or is invalid.'
        );
      }
    };

    triggerVerification();
  }, [token]);

  return (
    <div className="row justify-content-center py-5">
      <div className="col-md-6 col-lg-5">
        <div className="card border-0 shadow-lg p-4 rounded-4 bg-white text-center">
          <div className="card-body py-4">
            {status === 'verifying' && (
              <div className="py-5">
                <div className="spinner-border text-primary mb-4" role="status" style={{ width: '3rem', height: '3rem' }}>
                  <span className="visually-hidden">Loading...</span>
                </div>
                <h3 className="fw-bold">Verifying Email...</h3>
                <p className="text-muted">Please wait while we confirm your credentials.</p>
              </div>
            )}

            {status === 'success' && (
              <div className="py-4">
                <div className="bg-success-subtle text-success rounded-circle d-inline-flex align-items-center justify-content-center mb-4" style={{ width: '80px', height: '80px' }}>
                  <i className="bi bi-shield-check-fill fs-1"></i>
                </div>
                <h3 className="fw-bold text-success mb-3">Verification Successful</h3>
                <p className="text-muted mb-4">{message}</p>
                <Link to="/login" className="btn btn-primary w-100 py-2.5 fw-semibold">
                  Proceed to Login
                </Link>
              </div>
            )}

            {status === 'error' && (
              <div className="py-4">
                <div className="bg-danger-subtle text-danger rounded-circle d-inline-flex align-items-center justify-content-center mb-4" style={{ width: '80px', height: '80px' }}>
                  <i className="bi bi-shield-exclamation fs-1"></i>
                </div>
                <h3 className="fw-bold text-danger mb-3">Verification Failed</h3>
                <p className="text-muted mb-4">{message}</p>
                <Link to="/register" className="btn btn-outline-primary w-100 py-2.5 fw-semibold mb-2">
                  Create New Account
                </Link>
                <Link to="/" className="btn btn-link text-decoration-none small text-muted">
                  Go back home
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
