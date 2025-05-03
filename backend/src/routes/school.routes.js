import express from 'express';
import { createSchool, getAllSchools } from '../controllers/schoolController.js';

const router = express.Router();

// Create a new school
router.post('/', createSchool);

// Get all schools (for dropdown)
router.get('/', getAllSchools);

export default router;
