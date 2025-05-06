import axios from 'axios';
import { FASTAPI_URL } from '../config/env.js';

export const callFastAPI = async (text) => {
  try {
    const response = await axios.post(`${FASTAPI_URL}/predict`, { text });
    return response.data;
  } catch (err) {
    throw new Error('FastAPI service failed');
  }
};
