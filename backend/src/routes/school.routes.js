import express from 'express';
import School from '../models/school.model.js';
import { createSchool, getAllSchools } from '../controllers/school.controller.js';

const router = express.Router();

// Create a new school
router.post('/', createSchool);

// Get all schools (for dropdown)
router.get('/', getAllSchools);

router.post('/schools/verify-code', async (req, res) => {
    const { schoolId, teacherCode } = req.body;
    
    try {
      const school = await School.findById(schoolId);
      
      if (!school) {
        return res.status(404).json({ error: 'School not found' });
      }
      
      const isValid = school.teacherCode === teacherCode;
      
      res.json({ isValid });
    } catch (err) {
      console.error('Error verifying teacher code:', err);
      res.status(500).json({ error: err.message || 'Failed to verify teacher code' });
    }
  });

export default router;
