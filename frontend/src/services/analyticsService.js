import API from './api';

const analyticsService = {
  // Fetch Admin Dashboard analytics data
  getAdminDashboardData: async () => {
    const response = await API.get('/analytics/admin-dashboard');
    return response.data;
  },

  // Fetch detailed reports analytics data
  getReportData: async () => {
    const response = await API.get('/analytics/report-data');
    return response.data;
  },

  // Download complaints logs as CSV
  exportCSV: async () => {
    const response = await API.get('/analytics/export/csv', {
      responseType: 'blob', // Important: receives data as a binary file
    });
    
    // Create download link on the fly
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'complaints_system_report.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
  },
};

export default analyticsService;
