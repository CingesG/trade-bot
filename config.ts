import dotenv from 'dotenv';
dotenv.config();

export const config = {
  BRIDGE_URL: process.env.BRIDGE_URL || 'http://localhost:8001',
  IS_MOCK_MODE: process.env.IS_MOCK_MODE === 'true' || !process.env.BRIDGE_URL,
};
