import API from './api';

const userService = {
  // Get active agents
  getAgents: async () => {
    const response = await API.get('/users/agents');
    return response.data;
  },
};

export default userService;
