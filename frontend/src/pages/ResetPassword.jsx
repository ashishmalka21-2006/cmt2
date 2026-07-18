import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import { toast } from 'react-toastify';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token) {
      toast.error('Reset token is missing from URL.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await authService.resetPassword(token, password);
      toast.success(response.message || 'Password reset successfully!');
      navigate('/login');
    } catch (error) {
      const errMsg = error.response?.data?.message || 'Failed to reset password. Token may have expired.';
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="row justify-content-center py-5">
      <div className="col-md-6 col-lg-5">
        <div className="card border-0 shadow-lg p-4 rounded-4 bg-white">
          <div className="card-body">
            <div className="text-center mb-4">
              <i className="bi bi-shield-check text-primary display-4"></i>
              <h2 className="fw-bold mt-2">Reset Password</h2>
              <p className="text-muted">Enter your new secure password details</p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label fw-semibold">New Password</label>
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0">
                    <i className="bi bi-key text-muted"></i>
                  </span>
                  <input
                    type="password"
                    className="form-control border-start-0 bg-light"
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="form-label fw-semibold">Confirm New Password</label>
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0">
                    <i className="bi bi-key-fill text-muted"></i>
                  </span>
                  <input
                    type="password"
                    className="form-control border-start-0 bg-light"
                    placeholder="Repeat password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                    Saving Password...
                  </>
                ) : (
                  'Reset Password'
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

export default ResetPassword;
