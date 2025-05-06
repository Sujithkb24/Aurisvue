// backend/utils/httpClient.js
import axios from 'axios';

export const httpClient = axios.create({
  timeout: 10_000,
});
