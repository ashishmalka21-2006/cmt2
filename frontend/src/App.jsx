import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Layout & Pages
import Layout from './layouts/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Unauthorized from './pages/Unauthorized';
import NotFound from './pages/NotFound';
import AdminAnalytics from './pages/AdminAnalytics';
import PrintReport from './pages/PrintReport';

// Complaint pages
import ComplaintSubmit from './pages/ComplaintSubmit';
import ComplaintDetails from './pages/ComplaintDetails';
import ComplaintEdit from './pages/ComplaintEdit';

// Protected Route Wrapper
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          {/* Public Routes */}
          <Route index element={<Home />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="verify-email" element={<VerifyEmail />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password" element={<ResetPassword />} />
          <Route path="unauthorized" element={<Unauthorized />} />

          {/* Protected Routes (All roles logged in) */}
          <Route element={<ProtectedRoute />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="complaints/submit" element={<ComplaintSubmit />} />
            <Route path="complaints/:id" element={<ComplaintDetails />} />
            <Route path="complaints/:id/edit" element={<ComplaintEdit />} />
          </Route>

          {/* Protected Admin Routes */}
          <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
            <Route path="admin/analytics" element={<AdminAnalytics />} />
            <Route path="admin/reports/print" element={<PrintReport />} />
          </Route>

          {/* 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
    </Router>
  );
}

export default App;
