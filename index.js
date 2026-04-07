import axios from 'axios';

console.log('Node.js Trading Bot Base Initialized');

export const testConnection = async () => {
  try {
    const response = await axios.get('https://api.github.com');
    console.log('API Connection Test Success:', response.status);
    return response.status;
  } catch (error) {
    console.error('API Connection Test Failed:', error.message);
    throw error;
  }
};
