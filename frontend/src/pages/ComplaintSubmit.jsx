import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import complaintService from '../services/complaintService';
import { toast } from 'react-toastify';

const ComplaintSubmit = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Technical');
  const [priority, setPriority] = useState('Low');
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    
    // File count limit (max 5)
    if (selectedFiles.length > 5) {
      toast.error('You can upload a maximum of 5 files.');
      return;
    }

    // Size limit check (max 5MB each)
    const exceedSizeLimit = selectedFiles.some((file) => file.size > 5 * 1024 * 1024);
    if (exceedSizeLimit) {
      toast.error('Each attachment must be less than 5MB.');
      return;
    }

    setFiles(selectedFiles);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (title.length < 5) {
      toast.error('Title must be at least 5 characters long.');
      return;
    }

    if (description.length < 10) {
      toast.error('Description must be at least 10 characters long.');
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('category', category);
      formData.append('priority', priority);

      files.forEach((file) => {
        formData.append('attachments', file);
      });

      await complaintService.createComplaint(formData);
      toast.success('Complaint submitted successfully!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit complaint. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="row justify-content-center">
      <div className="col-lg-8 col-md-10">
        <div className="card border-0 shadow-sm rounded-4 bg-white p-4">
          <div className="card-body">
            {/* Navigation back */}
            <div className="mb-4">
              <Link to="/dashboard" className="text-muted text-decoration-none small fw-semibold d-inline-flex align-items-center">
                <i className="bi bi-arrow-left me-1"></i> Back to Dashboard
              </Link>
            </div>

            <div className="mb-4 text-center text-md-start">
              <h2 className="fw-bold text-dark mb-2">Submit New Complaint</h2>
              <p className="text-muted">Describe your issue in detail. Our support staff will investigate and resolve it.</p>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Title */}
              <div className="mb-4">
                <label className="form-label fw-semibold">Complaint Subject / Title</label>
                <input
                  type="text"
                  className="form-control bg-light"
                  placeholder="Summarize the issue briefly..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
                <div className="form-text small text-muted">A clear title helps our support agent understand the core problem (min 5 chars).</div>
              </div>

              <div className="row g-4 mb-4">
                {/* Category */}
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

                {/* Priority */}
                <div className="col-md-6">
                  <label className="form-label fw-semibold">Priority Level</label>
                  <select
                    className="form-select bg-light"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    required
                  >
                    <option value="Low">Low (General inquiry, non-urgent)</option>
                    <option value="Medium">Medium (Disrupting normal usage)</option>
                    <option value="High">High (System down, blocking workflow)</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="mb-4">
                <label className="form-label fw-semibold">Detailed Description</label>
                <textarea
                  className="form-control bg-light"
                  rows="6"
                  placeholder="Provide details such as steps to reproduce, account details, error messages..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                ></textarea>
                <div className="form-text small text-muted">Provide as much context as possible to speed up the resolution (min 10 chars).</div>
              </div>

              {/* File upload */}
              <div className="mb-5">
                <label className="form-label fw-semibold">Attachments (Optional)</label>
                <div className="input-group">
                  <input
                    type="file"
                    className="form-control bg-light"
                    id="attachments"
                    multiple
                    accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                    onChange={handleFileChange}
                  />
                </div>
                <div className="form-text small text-muted mt-2">
                  <i className="bi bi-info-circle me-1"></i> Max 5 files. Supported formats: images (JPG, PNG), PDFs, or Word documents. Limit: 5MB per file.
                </div>
                
                {/* File list preview */}
                {files.length > 0 && (
                  <div className="mt-3 bg-light p-3 rounded border border-dashed">
                    <h6 className="fw-bold mb-2 small text-uppercase text-muted">Selected Files ({files.length}):</h6>
                    <ul className="list-unstyled mb-0 small">
                      {files.map((file, idx) => (
                        <li key={idx} className="d-flex align-items-center text-muted py-1">
                          <i className="bi bi-paperclip me-2 text-primary"></i>
                          <span className="text-truncate me-2" style={{ maxWidth: '300px' }}>{file.name}</span>
                          <span className="text-muted text-nowrap">({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="d-flex justify-content-end gap-3 border-top pt-4">
                <Link to="/dashboard" className="btn btn-outline-secondary px-4 py-2 fw-semibold">
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
                      Submitting...
                    </>
                  ) : (
                    'File Complaint'
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

export default ComplaintSubmit;
