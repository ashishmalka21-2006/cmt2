import API from './api';

const feedbackService = {
  // Submit new feedback for a complaint
  submitFeedback: async (complaintId, rating, comments) => {
    const response = await API.post('/feedback', { complaintId, rating, comments });
    return response.data;
  },

  // Retrieve feedback details for a specific complaint
  getFeedbackForComplaint: async (complaintId) => {
    const response = await API.get(`/feedback/${complaintId}`);
    return response.data;
  },

  // Retrieve the logged-in user's feedback history
  getMyFeedbackHistory: async () => {
    const response = await API.get('/feedback/my/history');
    return response.data;
  },

  // Retrieve aggregated feedback statistics (Admin only)
  getFeedbackStats: async () => {
    const response = await API.get('/feedback/stats');
    return response.data;
  },
};

export default feedbackService;
