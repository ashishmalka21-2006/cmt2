import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import complaintService from '../services/complaintService';
import userService from '../services/userService';
import { toast } from 'react-toastify';

const ComplaintEdit = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [complaint, setComplaint] = useState(null);
  const [agents, setAgents] = useState([]);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Technical');
  const [priority, setPriority] = useState('Low');
  const [status, setStatus] = useState('Pending');
  const [assignedTo, setAssignedTo] = useState('');
  const [files, setFiles] = useState([]);

  // Fetch agents (Admin/Agent only)
  const fetchAgents = useCallback(async () => {
    try {
      const data = await userService.getAgents();
      setAgents(data.agents || []);
    } catch (error) {
      console.error('Failed to load agents list:', error.message);
    }
  }, []);

  const fetchComplaintDetails = useCallback(async () => {
    setLoading(true);
    try {
      const data = await complaintService.getComplaintById(id);
      const c = data.complaint;
      
      // Check authorization
      if (user?.role === 'User' && c.user._id !== user._id && c.user !== user._id) {
        toast.error('Not authorized to edit this complaint');
        navigate('/dashboard');
        return;
      }
      
      if (user?.role === 'User' && c.status !== 'Pending') {
        toast.error('Cannot edit complaints that are already processing');
        navigate(`/complaints/${id}`);
        return;
      }

      setComplaint(c);
      setTitle(c.title || '');
      setDescription(c.description || '');
      setCategory(c.category || 'Technical');
      setPriority(c.priority || 'Low');
      setStatus(c.status || 'Pending');
      setAssignedTo(c.assignedTo?._id || c.assignedTo || '');
      
      // Load agents list if current user is Admin or Agent
      if (user?.role !== 'User') {
        await fetchAgents();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch complaint details');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [id, user, navigate, fetchAgents]);

  useEffect(() => {
    fetchComplaintDetails();
  }, [fetchComplaintDetails]);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    
    // File count check
    if (selectedFiles.length + (complaint?.attachments?.length || 0) > 5) {
      toast.error('Total attachments cannot exceed 5 files.');
      return;
    }

    // Size check
    const exceedSizeLimit = selectedFiles.some((file) => file.size > 5 * 1024 * 1024);
    if (exceedSizeLimit) {
      toast.error('Each attachment must be less than 5MB.');
      return;
    }

    setFiles(selectedFiles);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let payload;

      if (user?.role === 'User') {
        // User sends FormData to support file upload append
        payload = new FormData();
        payload.append('title', title);
        payload.append('description', description);
        payload.append('category', category);
        payload.append('priority', priority);

        files.forEach((file) => {
          payload.append('attachments', file);
        });
      } else {
        // Agents/Admins send simple JSON object
        payload = {
          category,
          priority,
          status,
          assignedTo: assignedTo === '' ? 'null' : assignedTo,
        };
      }

      await complaintService.updateComplaint(id, payload);
      toast.success('Complaint updated successfully!');
      navigate(`/complaints/${id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update complaint. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-50 py-5">
        <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  const isUser = user?.role === 'User';

  return (
    <div className="row justify-content-center">
      <div className="col-lg-8 col-md-10">
        <div className="card border-0 shadow-sm rounded-4 bg-white p-4">
          <div className="card-body">
            {/* Back to detail link */}
            <div className="mb-4">
              <Link to={`/complaints/${id}`} className="text-muted text-decoration-none small fw-semibold d-inline-flex align-items-center">
                <i className="bi bi-arrow-left me-1"></i> Back to Details
              </Link>
            </div>

            <div className="mb-4 text-center text-md-start">
              <h2 className="fw-bold text-dark mb-2">Edit Complaint: {complaint?.ticketId}</h2>
              <p className="text-muted">
                {isUser 
                  ? 'Update your complaint details or append screenshots. You can edit as long as it remains Pending.' 
                  : 'Manage status, allocation priority, and assign support agents.'}
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              {isUser ? (
                /* USER FORM */
                <>
                  <div className="mb-4">
                    <label className="form-label fw-semibold">Complaint Subject / Title</label>
                    <input
                      type="text"
                      className="form-control bg-light"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div className="row g-4 mb-4">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Category</label>
                      <select
                        className="form-select bg-light"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        required
                      >
                        <option value="Technical">Technical (App bug, server crash)</option>
                        <option value="Billing">Billing (Overcharge, refund)</option>
                        <option value="Service">Service (Delivery, quality issue)</option>
                        <option value="Other">Other (General concerns)</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Priority Level</label>
                      <select
                        className="form-select bg-light"
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        required
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="form-label fw-semibold">Detailed Description</label>
                    <textarea
                      className="form-control bg-light"
                      rows="6"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                    ></textarea>
                  </div>

                  {/* Add more attachments */}
                  <div className="mb-4">
                    <label className="form-label fw-semibold">Upload More Files (Total max 5)</label>
                    <input
                      type="file"
                      className="form-control bg-light"
                      multiple
                      accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                      onChange={handleFileChange}
                      disabled={complaint?.attachments?.length >= 5}
                    />
                    <div className="form-text small mt-2">
                      Currently holds {complaint?.attachments?.length || 0} file(s). You can upload up to {5 - (complaint?.attachments?.length || 0)} more.
                    </div>
                  </div>
                </>
              ) : (
                /* AGENT / ADMIN FORM */
                <>
                  <div className="row g-4 mb-4">
                    {/* Status */}
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Resolution Status</label>
                      <select
                        className="form-select bg-light"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        required
                      >
                        <option value="Pending">Pending</option>
                        <option value="Assigned">Assigned</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved (Resolved issue)</option>
                        <option value="Closed">Closed (Closed ticket)</option>
                      </select>
                    </div>

                    {/* Priority */}
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Priority Override</label>
                      <select
                        className="form-select bg-light"
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        required
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>
                    </div>
                  </div>

                  <div className="row g-4 mb-4">
                    {/* Category override */}
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Category</label>
                      <select
                        className="form-select bg-light"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        required
                      >
                        <option value="Technical">Technical</option>
                        <option value="Billing">Billing</option>
                        <option value="Service">Service</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    {/* Assign To Agent */}
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Assign Agent</label>
                      <select
                        className="form-select bg-light"
                        value={assignedTo}
                        onChange={(e) => setAssignedTo(e.target.value)}
                      >
                        <option value="">-- Unassigned --</option>
                        {agents.map((agent) => (
                          <option key={agent._id} value={agent._id}>
                            {agent.name} ({agent.email})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Read only info section */}
                  <div className="mb-4 bg-light p-4 rounded">
                    <h6 className="fw-bold mb-2">Filer Details:</h6>
                    <p className="small text-muted mb-0">
                      <strong>Name:</strong> {complaint?.user?.name} | <strong>Email:</strong> {complaint?.user?.email}
                    </p>
                    <hr />
                    <h6 className="fw-bold mb-2">User Title:</h6>
                    <p className="small text-muted mb-3">{complaint?.title}</p>
                    <h6 className="fw-bold mb-2">User Description:</h6>
                    <p className="small text-muted mb-0" style={{ whiteSpace: 'pre-line' }}>{complaint?.description}</p>
                  </div>
                </>
              )}

              {/* Submit triggers */}
              <div className="d-flex justify-content-end gap-3 border-top pt-4 mt-4">
                <Link to={`/complaints/${id}`} className="btn btn-outline-secondary px-4 py-2 fw-semibold">
                  Cancel
                </Link>
                <button
                  type="submit"
                  className="btn btn-primary px-5 py-2 fw-semibold d-flex align-items-center justify-content-center"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Saving Changes...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplaintEdit;
