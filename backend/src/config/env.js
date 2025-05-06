// backend/config/env.js
import dotenv from 'dotenv';
dotenv.config();

export const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
export const FASTAPI_URL    = process.env.FASTAPI_URL;
