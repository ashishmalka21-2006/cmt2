import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('User');
  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await register({ name, email, password, role });
      if (res && res.isVerified) {
        toast.success('Registration successful! Redirecting to login...');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        toast.success('Registration successful!');
        setRegistered(true);
      }
    } catch (error) {
      const errMsg = error.response?.data?.message || 'Registration failed. Try again.';
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (registered) {
    return (
      <div className="row justify-content-center py-5 animate-fade-in">
        <div className="col-md-6 col-lg-5">
          <div className="card border-0 shadow-lg p-4 rounded-4 bg-white text-center">
            <div className="card-body py-5">
              <div className="bg-success-subtle text-success rounded-circle d-inline-flex align-items-center justify-content-center mb-4" style={{ width: '80px', height: '80px' }}>
                <i className="bi bi-envelope-check fs-1"></i>
              </div>
              <h3 className="fw-bold mb-3">Verify Your Email</h3>
              <p className="text-muted mb-4">
                We have sent a verification link to <strong>{email}</strong>. 
                Please check your inbox (and spam folder) to activate your account.
              </p>
              <div className="alert alert-warning border-0 small text-start mb-4">
                <i className="bi bi-info-circle-fill me-2"></i>
                <strong>Developer Notice:</strong> If email is not configured in `.env`, the verification link will be printed directly in the backend terminal logs.
              </div>
              <Link to="/login" className="btn btn-primary w-100 py-2.5 fw-semibold">
                Go to Sign In
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
              <i className="bi bi-person-plus-fill text-primary display-4"></i>
              <h2 className="fw-bold mt-2">Create Account</h2>
              <p className="text-muted">Register to submit complaints and track resolutions</p>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label fw-semibold">Full Name</label>
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0">
                    <i className="bi bi-person text-muted"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0 bg-light"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Email Address</label>
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
              <div className="mb-3">
                <label className="form-label fw-semibold">Password</label>
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
                <label className="form-label fw-semibold">Register As</label>
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0">
                    <i className="bi bi-briefcase text-muted"></i>
                  </span>
                  <select
                    className="form-select border-start-0 bg-light"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="User">User (Raise Complaint)</option>
                    <option value="Agent">Agent (Resolve Complaint)</option>
                    <option value="Admin">Admin (Control Center)</option>
                  </select>
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
                    Signing Up...
                  </>
                ) : (
                  'Sign Up'
                )}
              </button>
            </form>

            <div className="text-center">
              <span className="text-muted small">Already have an account? </span>
              <Link to="/login" className="text-primary text-decoration-none small fw-semibold">
                Sign in here
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
