import API from './api';

const complaintService = {
  // Fetch complaints with filters
  getComplaints: async (filters = {}) => {
    const response = await API.get('/complaints', { params: filters });
    return response.data;
  },

  // Get details of a single complaint
  getComplaintById: async (id) => {
    const response = await API.get(`/complaints/${id}`);
    return response.data;
  },

  // Submit a new complaint
  createComplaint: async (formData) => {
    // Note: formData must be a FormData object to support file uploads
    const response = await API.post('/complaints', formData);
    return response.data;
  },

  // Update complaint (details, status, or assignment)
  updateComplaint: async (id, formData) => {
    // If formData is not an instance of FormData, send as standard json
    const isFormData = formData instanceof FormData;
    const headers = {};
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }
    const response = await API.put(`/complaints/${id}`, formData, { headers });
    return response.data;
  },

  // Delete complaint
  deleteComplaint: async (id) => {
    const response = await API.delete(`/complaints/${id}`);
    return response.data;
  },

  // Add notes to complaint log (Agent/Admin only)
  addNote: async (id, text) => {
    const response = await API.post(`/complaints/${id}/notes`, { text });
    return response.data;
  },
};

export default complaintService;
