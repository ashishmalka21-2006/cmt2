import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import authService from '../services/authService';
import { toast } from 'react-toastify';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await authService.forgotPassword(email);
      toast.success('Reset link dispatched successfully');
      setDone(true);
    } catch (error) {
      const errMsg = error.response?.data?.message || 'Something went wrong. Please try again.';
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="row justify-content-center py-5">
        <div className="col-md-6 col-lg-5">
          <div className="card border-0 shadow-lg p-4 rounded-4 bg-white text-center">
            <div className="card-body py-5">
              <div className="bg-primary-subtle text-primary rounded-circle d-inline-flex align-items-center justify-content-center mb-4" style={{ width: '80px', height: '80px' }}>
                <i className="bi bi-mailbox2 fs-1"></i>
              </div>
              <h3 className="fw-bold mb-3">Reset Request Submitted</h3>
              <p className="text-muted mb-4">
                If an account exists for <strong>{email}</strong>, a password reset link has been dispatched. 
                Please check your inbox and follow the steps in the email.
              </p>
              <div className="alert alert-warning border-0 small text-start mb-4">
                <i className="bi bi-info-circle-fill me-2"></i>
                <strong>Developer Notice:</strong> If email is not configured in `.env`, the reset link will be printed directly in the backend terminal logs.
              </div>
              <Link to="/login" className="btn btn-primary w-100 py-2.5 fw-semibold">
                Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="row justify-content-center py-5">
      <div className="col-md-6 col-lg-5">
        <div className="card border-0 shadow-lg p-4 rounded-4 bg-white">
          <div className="card-body">
            <div className="text-center mb-4">
              <i className="bi bi-patch-question-fill text-primary display-4"></i>
              <h2 className="fw-bold mt-2">Forgot Password</h2>
              <p className="text-muted">Enter your email and we'll send you a recovery link</p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="form-label fw-semibold">Email address</label>
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0">
                    <i className="bi bi-envelope text-muted"></i>
                  </span>
                  <input
                    type="email"
                    className="form-control border-start-0 bg-light"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                className="btn btn-primary w-100 py-2.5 fw-semibold mb-3 d-flex align-items-center justify-content-center"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Sending Reset Link...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>

            <div className="text-center">
              <Link to="/login" className="text-primary text-decoration-none small fw-semibold">
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
