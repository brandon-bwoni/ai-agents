import axios from 'axios';

const API_URL = 'http://localhost:3001/api'; // Adjust to match your server URL

export const chatService = {
  /**
   * Send user message to RAG backend
   */
  sendMessage: async (message: string, conversationHistory: string = '') => {
    try {
      const response = await axios.post(`${API_URL}/chat`, {
        question: message,
        conv_history: conversationHistory,
      });
      
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },
};