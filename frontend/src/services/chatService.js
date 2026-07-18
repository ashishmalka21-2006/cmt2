import API from './api';

const chatService = {
  // Fetch message history for a given complaint
  getChatMessages: async (complaintId) => {
    const response = await API.get(`/chat/${complaintId}`);
    return response.data;
  },

  // Send a message inside the chat
  sendChatMessage: async (complaintId, message) => {
    const response = await API.post('/chat', { complaintId, message });
    return response.data;
  },
};

export default chatService;
